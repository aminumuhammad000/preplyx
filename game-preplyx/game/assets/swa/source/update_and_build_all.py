import bpy, math, os
from mathutils import Vector, Euler, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.dirname(__file__)
OUT = os.path.join(ROOT, 'models')
PRE = os.path.join(ROOT, 'previews')
os.makedirs(OUT, exist_ok=True)
os.makedirs(PRE, exist_ok=True)

# 1. Reset Scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name == 'Collection':
        bpy.data.collections.remove(c)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'

colls = {n: bpy.data.collections.new(n) for n in [
    'SWA_CHARACTER', 'SWA_RIG', 'SWA_FACE', 'SWA_CONTROLS',
    'SWA_ANIMATIONS', 'SWA_LIGHTING', 'SWA_CAMERA'
]}
for c in colls.values():
    scene.collection.children.link(c)

def move(o, group):
    for c in list(o.users_collection):
        c.objects.unlink(o)
    colls[group].objects.link(o)
    return o

# 2. Materials
# Body Material: soft porcelain white satin with subtle warm subsurface scattering
mat_body = bpy.data.materials.new('SWA | Porcelain soft satin')
mat_body.use_nodes = True
tree_body = mat_body.node_tree
tree_body.nodes.clear()

out_body = tree_body.nodes.new('ShaderNodeOutputMaterial')
bsdf_body = tree_body.nodes.new('ShaderNodeBsdfPrincipled')
bsdf_body.inputs['Base Color'].default_value = (0.97, 0.98, 1.0, 1.0)
bsdf_body.inputs['Roughness'].default_value = 0.38
if 'Specular IOR Level' in bsdf_body.inputs:
    bsdf_body.inputs['Specular IOR Level'].default_value = 0.48
if 'Subsurface Weight' in bsdf_body.inputs:
    bsdf_body.inputs['Subsurface Weight'].default_value = 0.08
    bsdf_body.inputs['Subsurface Radius'].default_value = (1.0, 0.7, 0.6)
    bsdf_body.inputs['Subsurface Scale'].default_value = 0.05
tree_body.links.new(bsdf_body.outputs['BSDF'], out_body.inputs['Surface'])

# Blush Material: Soft radial gradient pink (#FF9AB2) using UV distance
mat_blush = bpy.data.materials.new('SWA | Blush')
mat_blush.use_nodes = True
tree_blush = mat_blush.node_tree
tree_blush.nodes.clear()

out_b = tree_blush.nodes.new('ShaderNodeOutputMaterial')
bsdf_b = tree_blush.nodes.new('ShaderNodeBsdfPrincipled')
coord_b = tree_blush.nodes.new('ShaderNodeTexCoord')

# UV coordinates centered at (0.5, 0.5)
sub_uv = tree_blush.nodes.new('ShaderNodeVectorMath')
sub_uv.operation = 'SUBTRACT'
sub_uv.inputs[1].default_value = (0.5, 0.5, 0.0)
tree_blush.links.new(coord_b.outputs['UV'], sub_uv.inputs[0])

# Scale by 2.0 so radius from center to edge is 1.0
scale_uv = tree_blush.nodes.new('ShaderNodeVectorMath')
scale_uv.operation = 'SCALE'
scale_uv.inputs['Scale'].default_value = 2.0
tree_blush.links.new(sub_uv.outputs['Vector'], scale_uv.inputs['Vector'])

dist_b = tree_blush.nodes.new('ShaderNodeVectorMath')
dist_b.operation = 'LENGTH'
tree_blush.links.new(scale_uv.outputs['Vector'], dist_b.inputs[0])

# Radial falloff: 1.0 at center, smoothly fading to 0.0 at edge
ramp_b = tree_blush.nodes.new('ShaderNodeMapRange')
ramp_b.inputs['From Min'].default_value = 0.0
ramp_b.inputs['From Max'].default_value = 1.0
ramp_b.inputs['To Min'].default_value = 0.90
ramp_b.inputs['To Max'].default_value = 0.0
ramp_b.interpolation_type = 'SMOOTHSTEP'
tree_blush.links.new(dist_b.outputs['Value'], ramp_b.inputs['Value'])

val_blush = tree_blush.nodes.new('ShaderNodeValue')
val_blush.name = 'BLUSH'
val_blush.label = 'BLUSH'
val_blush.outputs[0].default_value = 0.70

mult_b = tree_blush.nodes.new('ShaderNodeMath')
mult_b.operation = 'MULTIPLY'
tree_blush.links.new(ramp_b.outputs['Result'], mult_b.inputs[0])
tree_blush.links.new(val_blush.outputs['Value'], mult_b.inputs[1])

bsdf_b.inputs['Base Color'].default_value = (1.0, 0.38, 0.52, 1.0)
bsdf_b.inputs['Roughness'].default_value = 0.45
if 'Specular IOR Level' in bsdf_b.inputs:
    bsdf_b.inputs['Specular IOR Level'].default_value = 0.1
if 'Emission Color' in bsdf_b.inputs:
    bsdf_b.inputs['Emission Color'].default_value = (1.0, 0.42, 0.55, 1.0)
    bsdf_b.inputs['Emission Strength'].default_value = 0.20

tree_blush.links.new(mult_b.outputs['Value'], bsdf_b.inputs['Alpha'])
tree_blush.links.new(bsdf_b.outputs['BSDF'], out_b.inputs['Surface'])

if hasattr(mat_blush, 'blend_method'):
    mat_blush.blend_method = 'BLEND'
if hasattr(mat_blush, 'shadow_method'):
    mat_blush.shadow_method = 'NONE'

# Other materials
def pbr_mat(name, col, rough=0.38, spec=0.5, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*col, 1.0)
    p.inputs['Roughness'].default_value = rough
    if 'Specular IOR Level' in p.inputs:
        p.inputs['Specular IOR Level'].default_value = spec
    if emit > 0 and 'Emission Color' in p.inputs:
        p.inputs['Emission Color'].default_value = (*col, 1.0)
        p.inputs['Emission Strength'].default_value = emit
    return m

mat_dark = pbr_mat('SWA | Deep plum eyes', (0.018, 0.018, 0.032), rough=0.07, spec=0.95)
mat_glint = pbr_mat('SWA | Eye glints', (1.0, 1.0, 1.0), rough=0.04, spec=1.0, emit=0.5)
mat_mouth_cavity = pbr_mat('SWA | Mouth interior', (0.09, 0.015, 0.025), rough=0.30, spec=0.5)
mat_tongue = pbr_mat('SWA | Tongue', (0.98, 0.24, 0.38), rough=0.35, spec=0.5)
mat_tear = pbr_mat('SWA | Tear periwinkle', (0.42, 0.68, 0.98), rough=0.18, spec=0.85)

parts = []

def catmull_rom(p0, p1, p2, p3, t):
    t2 = t * t
    t3 = t2 * t
    return 0.5 * (
        (2 * p1) +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    )

# 3. BODY MESH
body_ctrl = [
    (0.20, 0.02, 0.02,  0.00),
    (0.22, 0.06, 0.06,  0.00),
    (0.30, 0.36, 0.34, -0.01),
    (0.48, 0.54, 0.50, -0.02),
    (0.75, 0.64, 0.58, -0.025),
    (1.05, 0.65, 0.58, -0.025),
    (1.35, 0.63, 0.56, -0.02),
    (1.60, 0.58, 0.52, -0.01),
    (1.78, 0.48, 0.44,  0.00),
    (1.88, 0.30, 0.28,  0.00),
    (1.92, 0.06, 0.06,  0.00),
    (1.94, 0.02, 0.02,  0.00),
]

num_rings = 48
sides = 48
body_verts = []
body_faces = []
n = len(body_ctrl)

sampled_rings = []
for i in range(num_rings):
    t_global = i / (num_rings - 1) * (n - 3)
    idx = int(t_global) + 1
    if idx > n - 3:
        idx = n - 3
        t = 1.0
    else:
        t = t_global - int(t_global)
    p0, p1, p2, p3 = body_ctrl[idx - 1], body_ctrl[idx], body_ctrl[idx + 1], body_ctrl[idx + 2]
    z = catmull_rom(p0[0], p1[0], p2[0], p3[0], t)
    rx = catmull_rom(p0[1], p1[1], p2[1], p3[1], t)
    ry = catmull_rom(p0[2], p1[2], p2[2], p3[2], t)
    cy = catmull_rom(p0[3], p1[3], p2[3], p3[3], t)
    sampled_rings.append((z, max(0.005, rx), max(0.005, ry), cy))

for z, rx, ry, cy in sampled_rings:
    for j in range(sides):
        th = 2 * math.pi * j / sides
        body_verts.append((rx * math.cos(th), cy + ry * math.sin(th), z))

for i in range(num_rings - 1):
    for j in range(sides):
        v0 = i * sides + j
        v1 = i * sides + (j + 1) % sides
        v2 = (i + 1) * sides + (j + 1) % sides
        v3 = (i + 1) * sides + j
        body_faces.append((v0, v1, v2, v3))

bp_idx = len(body_verts)
body_verts.append((0, 0, body_ctrl[1][0]))
for j in range(sides):
    body_faces.append((bp_idx, (j + 1) % sides, j))

tp_idx = len(body_verts)
body_verts.append((0, 0, body_ctrl[-2][0]))
top_ring_start = (num_rings - 1) * sides
for j in range(sides):
    body_faces.append((tp_idx, top_ring_start + j, top_ring_start + (j + 1) % sides))

body_mesh = bpy.data.meshes.new("SWA_BodyLoft")
body_mesh.from_pydata(body_verts, [], body_faces)
body_mesh.materials.append(mat_body)
body_mesh.update()
for p in body_mesh.polygons:
    p.use_smooth = True
torso = bpy.data.objects.new("SWA_Body", body_mesh)
colls['SWA_CHARACTER'].objects.link(torso)

# Vertex groups
vg_pelvis = torso.vertex_groups.new(name='SWA_PELVIS')
vg_spine = torso.vertex_groups.new(name='SWA_SPINE')
vg_chest = torso.vertex_groups.new(name='SWA_CHEST')
vg_head = torso.vertex_groups.new(name='SWA_HEAD')

for i, v in enumerate(body_mesh.vertices):
    z = v.co.z
    if z < 0.60:
        vg_pelvis.add([i], 1.0, 'REPLACE')
    elif z < 1.10:
        w = (z - 0.60) / 0.50
        vg_pelvis.add([i], 1.0 - w, 'REPLACE')
        vg_spine.add([i], w, 'REPLACE')
    elif z < 1.45:
        w = (z - 1.10) / 0.35
        vg_spine.add([i], 1.0 - w, 'REPLACE')
        vg_chest.add([i], w, 'REPLACE')
    else:
        w = min(1.0, (z - 1.45) / 0.25)
        vg_chest.add([i], 1.0 - w, 'REPLACE')
        vg_head.add([i], w, 'REPLACE')

parts.append(torso)

def uv_part(name, loc, scale, mat, bone='SWA_SPINE', group='SWA_CHARACTER', rot=(0,0,0), seg=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = True
    ids = list(range(len(o.data.vertices)))
    vg = o.vertex_groups.new(name=bone)
    vg.add(ids, 1.0, 'REPLACE')
    if group == 'SWA_FACE':
        tag = o.vertex_groups.new(name='FACETAG_' + name)
        tag.add(ids, 1.0, 'REPLACE')
    move(o, group)
    parts.append(o)
    return o

# 4. ORGANIC ARMS & HANDS
def make_arm(side_sign, side_name):
    arm_ctrl = [
        (Vector((side_sign * 0.50, -0.02, 1.34)), 0.155, 0.165),
        (Vector((side_sign * 0.58, -0.02, 1.25)), 0.145, 0.155),
        (Vector((side_sign * 0.65, -0.025, 1.10)), 0.135, 0.145),
        (Vector((side_sign * 0.68, -0.035, 0.95)), 0.125, 0.135),
        (Vector((side_sign * 0.69, -0.045, 0.82)), 0.120, 0.130),
        (Vector((side_sign * 0.68, -0.05, 0.70)), 0.105, 0.115),
        (Vector((side_sign * 0.67, -0.05, 0.64)), 0.02, 0.02),
    ]
    arm_rings = 16
    arm_sides = 16
    arm_verts = []
    arm_faces = []
    
    sampled = []
    for i in range(arm_rings):
        t = i / (arm_rings - 1) * (len(arm_ctrl) - 1)
        k = int(t)
        f = t - k
        if k >= len(arm_ctrl) - 1:
            k = len(arm_ctrl) - 2
            f = 1.0
        s = f * f * (3 - 2 * f)
        p0, r0x, r0y = arm_ctrl[k]
        p1, r1x, r1y = arm_ctrl[k+1]
        pos = p0.lerp(p1, s)
        rx = r0x + (r1x - r0x) * s
        ry = r0y + (r1y - r0y) * s
        sampled.append((pos, rx, ry))

    for pos, rx, ry in sampled:
        for j in range(arm_sides):
            th = 2 * math.pi * j / arm_sides
            v = Vector((pos.x + rx * math.cos(th), pos.y + ry * math.sin(th), pos.z))
            arm_verts.append(v)

    for i in range(arm_rings - 1):
        for j in range(arm_sides):
            v0 = i * arm_sides + j
            v1 = i * arm_sides + (j + 1) % arm_sides
            v2 = (i + 1) * arm_sides + (j + 1) % arm_sides
            v3 = (i + 1) * arm_sides + j
            arm_faces.append((v0, v1, v2, v3))

    tip_idx = len(arm_verts)
    arm_verts.append(sampled[-1][0])
    last_ring = (arm_rings - 1) * arm_sides
    for j in range(arm_sides):
        arm_faces.append((tip_idx, last_ring + j, last_ring + (j + 1) % arm_sides))

    ame = bpy.data.meshes.new(f"SWA_ArmMesh_{side_name}")
    ame.from_pydata(arm_verts, [], arm_faces)
    ame.materials.append(mat_body)
    ame.update()
    for p in ame.polygons:
        p.use_smooth = True
    ao = bpy.data.objects.new(f"SWA_Arm_{side_name}", ame)
    colls['SWA_CHARACTER'].objects.link(ao)
    
    vg_arm = ao.vertex_groups.new(name=f'SWA_ARM_{side_name}')
    vg_hand = ao.vertex_groups.new(name=f'SWA_HAND_{side_name}')
    vg_chest_arm = ao.vertex_groups.new(name='SWA_CHEST')
    
    for i, v in enumerate(ame.vertices):
        z = v.co.z
        if z > 1.25:
            w = (z - 1.25) / 0.10
            vg_chest_arm.add([i], min(1.0, w), 'REPLACE')
            vg_arm.add([i], max(0.0, 1.0 - w), 'REPLACE')
        elif z > 0.90:
            vg_arm.add([i], 1.0, 'REPLACE')
        elif z > 0.75:
            w = (z - 0.75) / 0.15
            vg_arm.add([i], w, 'REPLACE')
            vg_hand.add([i], 1.0 - w, 'REPLACE')
        else:
            vg_hand.add([i], 1.0, 'REPLACE')
            
    parts.append(ao)
    
    # Thumb nub
    uv_part(
        f'SWA_Thumb_{side_name}',
        (side_sign * 0.63, -0.11, 0.74),
        (0.048, 0.058, 0.048),
        mat_body,
        bone=f'SWA_HAND_{side_name}'
    )

make_arm(-1, 'L')
make_arm(1, 'R')

# 5. LEGS & FEET
for s, side in [(-1, 'L'), (1, 'R')]:
    uv_part(
        f'SWA_Leg_{side}',
        (s * 0.28, -0.02, 0.20),
        (0.14, 0.14, 0.12),
        mat_body,
        bone=f'SWA_LEG_{side}'
    )
    uv_part(
        f'SWA_Foot_{side}',
        (s * 0.28, -0.06, 0.075),
        (0.14, 0.22, 0.075),
        mat_body,
        bone=f'SWA_FOOT_{side}',
        rot=(0, 0, math.radians(-12 * s))
    )

# 6. ANTENNA - Cute organic curved sprout
antenna_pts = [
    Vector((0, 0.00, 1.92)),
    Vector((0, 0.01, 2.00)),
    Vector((0, 0.04, 2.08)),
    Vector((0, 0.07, 2.14)),
    Vector((0, 0.05, 2.18)),
    Vector((0, 0.02, 2.19)),
]
cu = bpy.data.curves.new('SWA_AntennaCurve', 'CURVE')
cu.dimensions = '3D'
cu.resolution_u = 16
cu.bevel_depth = 0.042
cu.bevel_resolution = 4
s = cu.splines.new('BEZIER')
s.bezier_points.add(len(antenna_pts) - 1)
for b, p in zip(s.bezier_points, antenna_pts):
    b.co = p
    b.handle_left_type = 'AUTO'
    b.handle_right_type = 'AUTO'
ao = bpy.data.objects.new('SWA_Antenna', cu)
colls['SWA_CHARACTER'].objects.link(ao)
ao.data.materials.append(mat_body)
bpy.context.view_layer.objects.active = ao
ao.select_set(True)
bpy.ops.object.convert(target='MESH')
ao = bpy.context.object
for p in ao.data.polygons:
    p.use_smooth = True
vg_ant = ao.vertex_groups.new(name='SWA_ANTENNA')
vg_ant.add(list(range(len(ao.data.vertices))), 1.0, 'REPLACE')
parts.append(ao)

uv_part(
    'SWA_Antenna_Tip',
    (0, 0.02, 2.19),
    (0.042, 0.042, 0.042),
    mat_body,
    bone='SWA_ANTENNA'
)

# 7. FACE FEATURES
for s, side in [(-1, 'L'), (1, 'R')]:
    eye_x = s * 0.23
    eye_z = 1.46
    eye_y = -0.535
    rot_y = math.radians(s * 8)
    # Large expressive dark glossy eye (#2D2D3A)
    uv_part(
        f'SWA_Eye_{side}',
        (eye_x, eye_y, eye_z),
        (0.082, 0.015, 0.108),
        mat_dark,
        bone='SWA_HEAD',
        group='SWA_FACE',
        rot=(0, rot_y, 0),
        seg=24, rings=16
    )
    # Crisp white specular glint at top-left
    glint_x = eye_x - 0.028
    glint_z = eye_z + 0.035
    glint_y = eye_y - 0.012
    uv_part(
        f'SWA_Glint_{side}',
        (glint_x, glint_y, glint_z),
        (0.026, 0.010, 0.028),
        mat_glint,
        bone='SWA_HEAD',
        group='SWA_FACE',
        seg=16, rings=12
    )
    # Soft glowing blush cheek patch (feathered radial alpha gradient)
    blush_x = s * 0.32
    blush_z = 1.34
    blush_y = -0.512
    rot_blush = math.radians(s * 15)
    uv_part(
        f'SWA_Cheek_{side}',
        (blush_x, blush_y, blush_z),
        (0.125, 0.005, 0.095),
        mat_blush,
        bone='SWA_HEAD',
        group='SWA_FACE',
        rot=(0, rot_blush, 0),
        seg=24, rings=16
    )
    # Eyebrows
    brow_x = s * 0.23
    brow_z = 1.62
    brow_y = -0.47
    uv_part(
        f'SWA_Brow_{side}',
        (brow_x, brow_y, brow_z),
        (0.042, 0.008, 0.014),
        mat_dark,
        bone='SWA_HEAD',
        group='SWA_FACE',
        seg=16, rings=12
    )
    # Tears (will be collapsed deep inside head in Basis)
    uv_part(
        f'SWA_Tear_{side}',
        (s * 0.26, -0.53, 1.34),
        (0.030, 0.015, 0.060),
        mat_tear,
        bone='SWA_HEAD',
        group='SWA_FACE',
        seg=16, rings=12
    )

# Integrated facial mouth: small cute open smile with tongue
uv_part(
    'SWA_Mouth',
    (0, -0.582, 1.35),
    (0.072, 0.012, 0.044),
    mat_mouth_cavity,
    bone='SWA_HEAD',
    group='SWA_FACE',
    seg=24, rings=16
)
uv_part(
    'SWA_MouthTongue',
    (0, -0.588, 1.336),
    (0.048, 0.008, 0.024),
    mat_tongue,
    bone='SWA_HEAD',
    group='SWA_FACE',
    seg=16, rings=12
)

# 8. JOIN INTO SWA_Mesh
for o in bpy.context.selected_objects:
    o.select_set(False)
for o in parts:
    o.select_set(True)
base = parts[0]
bpy.context.view_layer.objects.active = base
bpy.ops.object.join()
mesh = bpy.context.object
mesh.name = 'SWA_Mesh'
mesh.data.name = 'SWA_MeshData'

# Custom property on SWA_Mesh for BLUSH
mesh['BLUSH'] = 0.70
mesh.id_properties_ui('BLUSH').update(min=0.0, max=1.0, default=0.70, description='Blush intensity (0=off, 0.25=subtle, 0.5=normal, 0.75=strong, 1.0=very strong)')

# 9. RIG & ARMATURE
armd = bpy.data.armatures.new('SWA_RigData')
arm = bpy.data.objects.new('SWA_Rig', armd)
colls['SWA_RIG'].objects.link(arm)
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')

spec = {
    'SWA_ROOT': ((0, 0, 0), (0, 0, 0.25), None),
    'SWA_MASTER': ((0, 0, 0.25), (0, 0, 0.50), 'SWA_ROOT'),
    'SWA_PELVIS': ((0, 0, 0.50), (0, 0, 0.85), 'SWA_MASTER'),
    'SWA_SPINE': ((0, 0, 0.85), (0, 0, 1.25), 'SWA_PELVIS'),
    'SWA_CHEST': ((0, 0, 1.25), (0, 0, 1.50), 'SWA_SPINE'),
    'SWA_NECK': ((0, 0, 1.50), (0, 0, 1.62), 'SWA_CHEST'),
    'SWA_HEAD': ((0, 0, 1.62), (0, 0, 1.92), 'SWA_NECK'),
    'SWA_ANTENNA': ((0, 0, 1.92), (0, 0.05, 2.18), 'SWA_HEAD'),
    'SWA_EYE_TARGET': ((0, -1.2, 1.46), (0, -1.0, 1.46), 'SWA_HEAD'),
}

for side, s in [('L', -1), ('R', 1)]:
    spec.update({
        'SWA_ARM_' + side: ((s * 0.52, -0.02, 1.30), (s * 0.68, -0.03, 0.95), 'SWA_CHEST'),
        'SWA_HAND_' + side: ((s * 0.68, -0.03, 0.95), (s * 0.68, -0.05, 0.68), 'SWA_ARM_' + side),
        'SWA_LEG_' + side: ((s * 0.28, -0.02, 0.40), (s * 0.28, -0.02, 0.16), 'SWA_PELVIS'),
        'SWA_FOOT_' + side: ((s * 0.28, -0.02, 0.16), (s * 0.28, -0.20, 0.05), 'SWA_LEG_' + side),
        'SWA_EYE_' + side: ((s * 0.23, -0.35, 1.46), (s * 0.23, -0.53, 1.46), 'SWA_HEAD'),
    })

eb = {}
for n, (h, t, p) in spec.items():
    b = armd.edit_bones.new(n)
    b.head = h
    b.tail = t
    if n in ('SWA_EYE_TARGET', 'SWA_EYE_L', 'SWA_EYE_R'):
        b.align_roll(Vector((0, 0, 1)))
    if p:
        b.parent = eb[p]
    eb[n] = b

bpy.ops.object.mode_set(mode='OBJECT')
arm.show_in_front = True
armd.display_type = 'OCTAHEDRAL'

mod = mesh.modifiers.new('SWA Deformation', 'ARMATURE')
mod.object = arm
mesh.parent = arm

for name in ['SWA_MASTER', 'SWA_EYE_TARGET']:
    pb = arm.pose.bones.get(name)
    pb.bone.use_deform = False
    pb['Control'] = 'Move this control; eye target is exposed for application tracking.'

# 10. SHAPE KEYS
mesh.shape_key_add(name='Basis')

tags = {}
for vg0 in mesh.vertex_groups:
    if vg0.name.startswith('FACETAG_'):
        ids = set()
        for v in mesh.data.vertices:
            try:
                if vg0.weight(v.index) > 0.5:
                    ids.add(v.index)
            except RuntimeError:
                pass
        tags[vg0.name[8:]] = ids

def center(ids):
    pts = [mesh.data.vertices[i].co for i in ids]
    return Vector((sum(p.x for p in pts)/len(pts), sum(p.y for p in pts)/len(pts), sum(p.z for p in pts)/len(pts))) if pts else Vector((0,0,0))

centers = {n: center(ids) for n, ids in tags.items()}

# Tears: HIDE completely in Basis by moving inside head, restore in crying key
basis = mesh.data.shape_keys.key_blocks['Basis']
tear_original = {}
for side in 'LR':
    tag_name = 'SWA_Tear_' + side
    if tag_name in tags:
        ids = tags[tag_name]
        c = centers[tag_name]
        for i in ids:
            tear_original[i] = basis.data[i].co.copy()
            # Move deep inside head so it's completely hidden
            basis.data[i].co = Vector((c.x, 0.0, c.z))

def facial_key(name, ops):
    key = mesh.shape_key_add(name=name, from_mix=False)
    for feature, sx, sy, sz, dx, dy, dz, angle in ops:
        ids = tags.get(feature, set())
        c = centers.get(feature, Vector((0,0,0)))
        ca, sa = math.cos(angle), math.sin(angle)
        for i in ids:
            p = key.data[i].co.copy()
            x = (p.x - c.x) * sx
            z = (p.z - c.z) * sz
            key.data[i].co = (c.x + x * ca - z * sa + dx, p.y + dy, c.z + x * sa + z * ca + dz)
    return key

E = lambda side: 'SWA_Eye_' + side
G = lambda side: 'SWA_Glint_' + side
B = lambda side: 'SWA_Brow_' + side
C = lambda side: 'SWA_Cheek_' + side
M = 'SWA_Mouth'
T = 'SWA_MouthTongue'

# Eye controls
facial_key('blink_L', [(E('L'), 1, 1, 0.05, 0, 0, 0, 0), (G('L'), 1, 1, 0.05, 0, 0, 0, 0)])
facial_key('blink_R', [(E('R'), 1, 1, 0.05, 0, 0, 0, 0), (G('R'), 1, 1, 0.05, 0, 0, 0, 0)])
facial_key('blink_both', [(E(s), 1, 1, 0.05, 0, 0, 0, 0) for s in 'LR'] + [(G(s), 1, 1, 0.05, 0, 0, 0, 0) for s in 'LR'])
facial_key('squint', [(E(s), 1, 1, 0.35, 0, 0, -0.005, 0) for s in 'LR'] + [(G(s), 1, 1, 0.35, 0, 0, -0.005, 0) for s in 'LR'])
facial_key('wide', [(E(s), 1.15, 1, 1.25, 0, 0, 0.005, 0) for s in 'LR'] + [(G(s), 1.15, 1, 1.25, 0, 0, 0.005, 0) for s in 'LR'])

# Mouth controls
facial_key('smile', [(M, 1.35, 1, 1.15, 0, 0, 0.015, 0), (T, 1.25, 1, 1.10, 0, 0, 0.015, 0)])
facial_key('smile_big', [(M, 1.70, 1, 1.65, 0, 0, 0.020, 0), (T, 1.55, 1, 1.45, 0, -0.002, 0.020, 0)])
facial_key('open', [(M, 1.05, 1, 1.85, 0, 0, -0.005, 0), (T, 1.0, 1, 0.50, 0, 0, -0.020, 0)])
facial_key('surprised_mouth', [(M, 0.85, 1, 1.75, 0, 0, -0.010, 0), (T, 0.80, 1, 0.40, 0, 0, -0.020, 0)])
facial_key('sad_mouth', [(M, 0.85, 1, 0.65, 0, 0, -0.020, 0), (T, 0.80, 1, 0.40, 0, 0, -0.020, 0)])
facial_key('angry_mouth', [(M, 0.90, 1, 0.60, 0, 0, -0.010, 0), (T, 0.80, 1, 0.30, 0, 0, -0.015, 0)])
facial_key('confused_mouth', [(M, 1.05, 1, 0.80, 0.012, 0, 0.005, 0.12), (T, 0.90, 1, 0.70, 0.010, 0, 0.005, 0.12)])
facial_key('laugh_mouth', [(M, 1.65, 1, 1.70, 0, 0, 0.018, 0), (T, 1.50, 1, 1.35, 0, -0.002, 0.018, 0)])

# Phonemes
for nm, sx, sz in [('phoneme_A', 1.1, 1.7), ('phoneme_E', 1.5, 0.85), ('phoneme_O', 0.85, 1.65), ('phoneme_M', 0.8, 0.45)]:
    facial_key(nm, [(M, sx, 1, sz, 0, 0, 0, 0)])

# Blush morphs
facial_key('blush', [(C(s), 1.25, 1, 1.25, 0, 0, 0, 0) for s in 'LR'])
facial_key('blush_strong', [(C(s), 1.50, 1, 1.50, 0, 0, 0, 0) for s in 'LR'])
facial_key('blush_off', [(C(s), 0.001, 0.001, 0.001, 0, 0, 0, 0) for s in 'LR'])

# Full emotional states matching SWA character sheet
facial_key('happy', [
    (E(s), 1, 1, 0.35, 0, 0, -0.008, 0) for s in 'LR'] + [
    (G(s), 1, 1, 0.35, 0, 0, -0.008, 0) for s in 'LR'] + [
    (M, 1.40, 1, 1.25, 0, 0, 0.018, 0), (T, 1.30, 1, 1.20, 0, 0, 0.018, 0)] + [
    (C(s), 1.20, 1, 1.20, 0, 0, 0, 0) for s in 'LR'
])

facial_key('sad', [
    (E('L'), 1, 1, 0.75, 0, 0, -0.01, -0.14),
    (E('R'), 1, 1, 0.75, 0, 0, -0.01, 0.14),
    (B('L'), 1, 1, 1.0, 0, 0, 0.025, 0.35),
    (B('R'), 1, 1, 1.0, 0, 0, 0.025, -0.35),
    (M, 0.80, 1, 0.65, 0, 0, -0.022, 0)
])

facial_key('surprised', [
    (E(s), 1.20, 1, 1.40, 0, 0, 0.010, 0) for s in 'LR'] + [
    (G(s), 1.20, 1, 1.40, 0, 0, 0.010, 0) for s in 'LR'] + [
    (B(s), 1.0, 1, 1.0, 0, 0, 0.035, 0) for s in 'LR'] + [
    (M, 0.85, 1, 1.80, 0, 0, -0.010, 0), (T, 0.80, 1, 0.40, 0, 0, -0.020, 0)
])

facial_key('angry', [
    (B('L'), 1, 1, 1.0, 0, 0, -0.025, -0.28),
    (B('R'), 1, 1, 1.0, 0, 0, -0.025, 0.28),
    (E('L'), 1, 1, 0.80, 0, 0, 0.002, -0.15),
    (E('R'), 1, 1, 0.80, 0, 0, 0.002, 0.15),
    (M, 0.88, 1, 0.65, 0, 0, -0.012, 0)] + [
    (C(s), 1.15, 1, 1.15, 0, 0, 0, 0) for s in 'LR'
])

facial_key('thinking', [
    (B('R'), 1, 1, 1.0, 0, 0, 0.035, 0.25),
    (B('L'), 1, 1, 1.0, 0, 0, -0.010, -0.10)
] + [
    (E(s), 1, 1, 0.95, 0.015, 0, 0.012, 0) for s in 'LR'
] + [
    (G(s), 1, 1, 0.95, 0.015, 0, 0.012, 0) for s in 'LR'
] + [
    (M, 0.85, 1, 0.80, 0.010, 0, 0.005, 0.10)
])

facial_key('laugh', [
    (E(s), 1, 1, 0.10, 0, 0, -0.008, 0) for s in 'LR'] + [
    (G(s), 1, 1, 0.10, 0, 0, -0.008, 0) for s in 'LR'] + [
    (M, 1.65, 1, 1.70, 0, 0, 0.018, 0), (T, 1.50, 1, 1.35, 0, -0.002, 0.018, 0)] + [
    (C(s), 1.35, 1, 1.35, 0, 0, 0, 0) for s in 'LR'
])

facial_key('confused', [
    (B('L'), 1, 1, 1.0, 0, 0, 0.040, 0.25),
    (B('R'), 1, 1, 1.0, 0, 0, -0.015, -0.12),
    (E('L'), 1, 1, 0.88, 0, 0, 0.005, -0.10),
    (E('R'), 1, 1, 0.95, 0, 0, -0.005, 0.05),
    (M, 0.95, 1, 0.80, 0.012, 0, 0.005, 0.14)
])

facial_key('sleepy', [
    (E(s), 1, 1, 0.12, 0, 0, -0.010, 0) for s in 'LR'] + [
    (G(s), 1, 1, 0.12, 0, 0, -0.010, 0) for s in 'LR'] + [
    (M, 0.80, 1, 0.65, 0, 0, -0.008, 0)
])

cry_key = facial_key('crying', [
    (E(s), 1, 1, 0.60, 0, 0, -0.012, 0) for s in 'LR'] + [
    (B('L'), 1, 1, 1.0, 0, 0, 0.035, 0.25),
    (B('R'), 1, 1, 1.0, 0, 0, 0.035, -0.25),
    (M, 0.75, 1, 0.65, 0, 0, -0.020, 0)
])
for i, co in tear_original.items():
    cry_key.data[i].co = co

facial_key('excited', [
    (E(s), 1.15, 1, 1.30, 0, 0, 0.008, 0) for s in 'LR'] + [
    (G(s), 1.15, 1, 1.30, 0, 0, 0.008, 0) for s in 'LR'] + [
    (M, 1.45, 1, 1.45, 0, 0, 0.016, 0), (T, 1.35, 1, 1.25, 0, 0, 0.016, 0)] + [
    (C(s), 1.25, 1, 1.25, 0, 0, 0, 0) for s in 'LR'
])

facial_key('proud', [
    (B(s), 1, 1, 1.0, 0, 0, 0.025, 0) for s in 'LR'] + [
    (M, 1.20, 1, 1.15, 0, 0, 0.012, 0)] + [
    (C(s), 1.15, 1, 1.15, 0, 0, 0, 0) for s in 'LR'
])

facial_key('worried', [
    (B('L'), 1, 1, 1.0, 0, 0, 0.035, 0.22),
    (B('R'), 1, 1, 1.0, 0, 0, 0.035, -0.22),
    (M, 0.80, 1, 0.75, 0, 0, -0.015, 0)
])

# Gaze directional morphs
facial_key('gaze_left', [(E(s), 1, 1, 1, -0.035, 0, 0, 0) for s in 'LR'] + [(G(s), 1, 1, 1, -0.035, 0, 0, 0) for s in 'LR'])
facial_key('gaze_right', [(E(s), 1, 1, 1, 0.035, 0, 0, 0) for s in 'LR'] + [(G(s), 1, 1, 1, 0.035, 0, 0, 0) for s in 'LR'])
facial_key('gaze_up', [(E(s), 1, 1, 1, 0, 0, 0.030, 0) for s in 'LR'] + [(G(s), 1, 1, 1, 0, 0, 0.030, 0) for s in 'LR'])
facial_key('gaze_down', [(E(s), 1, 1, 1, 0, 0, -0.030, 0) for s in 'LR'] + [(G(s), 1, 1, 1, 0, 0, -0.030, 0) for s in 'LR'])
facial_key('eye_L', [(E('L'), 1, 1, 1, 0.030, 0, 0, 0), (G('L'), 1, 1, 1, 0.030, 0, 0, 0)])
facial_key('eye_R', [(E('R'), 1, 1, 1, 0.030, 0, 0, 0), (G('R'), 1, 1, 1, 0.030, 0, 0, 0)])

# Gaze drivers via SWA_EYE_TARGET
for key_name, axis, sign in [('gaze_left', 0, -1), ('gaze_right', 0, 1), ('gaze_down', 2, -1), ('gaze_up', 2, 1)]:
    fcu = mesh.data.shape_keys.key_blocks[key_name].driver_add('value')
    drv = fcu.driver
    drv.type = 'SCRIPTED'
    var = drv.variables.new()
    var.name = 'target_offset'
    var.type = 'TRANSFORMS'
    tar = var.targets[0]
    tar.id = arm
    tar.bone_target = 'SWA_EYE_TARGET'
    tar.transform_type = ['LOC_X', 'LOC_Y', 'LOC_Z'][axis]
    tar.transform_space = 'LOCAL_SPACE'
    drv.expression = 'min(max(target_offset * %s * 8.0, 0.0), 1.0)' % sign

# 11. ANIMATION ACTIONS
def action(name, tracks, frames=32, loop=False):
    act = bpy.data.actions.new(name)
    arm.animation_data_create()
    arm.animation_data.action = None
    for pb0 in arm.pose.bones:
        pb0.rotation_mode = 'XYZ'
        pb0.rotation_euler = (0, 0, 0)
        pb0.location = (0, 0, 0)
    arm.animation_data.action = act
    for bone, keys in tracks.items():
        pb = arm.pose.bones.get(bone)
        for f, rot, loc in keys:
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler = rot
            pb.location = loc
            pb.keyframe_insert('rotation_euler', frame=f, group=bone)
            pb.keyframe_insert('location', frame=f, group=bone)
    act.use_fake_user = True
    act['loop'] = loop
    return act

Z = (0, 0, 0)
idle = {
    'SWA_SPINE': [(1, Z, (0,0,0)), (8, (0.012, 0, 0), (0, 0, 0.018)), (16, Z, (0,0,0)), (24, (-0.012, 0, 0), (0, 0, -0.010)), (32, Z, (0,0,0))],
    'SWA_HEAD': [(1, Z, Z), (16, (0, 0.015, 0.020), Z), (32, Z, Z)],
    'SWA_ANTENNA': [(1, Z, Z), (9, (0.040, 0, 0), Z), (17, Z, Z), (25, (-0.030, 0, 0), Z), (32, Z, Z)]
}
action('Idle_Breathing', idle, 32, True)
action('Idle_Look_Around', {'SWA_HEAD': [(1, Z, Z), (8, (0, 0.18, 0), Z), (16, (0, -0.16, 0), Z), (24, (0.04, 0.10, 0), Z), (32, Z, Z)]}, 32, True)

def pose_action(name, armrot=(0,0,0), other=None):
    tr = {'SWA_ARM_R': [(1, Z, Z), (8, armrot, Z), (18, armrot, Z), (32, Z, Z)]}
    if other:
        tr.update(other)
    action(name, tr)

pose_action('Wave', (0, 0, -1.25), {'SWA_HAND_R': [(1, Z, Z), (10, (0, 0, 0.4), Z), (18, (0, 0, -0.4), Z), (26, (0, 0, 0.4), Z), (32, Z, Z)]})
pose_action('Point', (0, 0, -0.8))
pose_action('Thumbs_Up', (0, 0, -0.7))
pose_action('Thumbs_Down', (0, 0, 0.7))
action('Walk', {
    'SWA_LEG_L': [(1, (0.35, 0, 0), Z), (9, (-0.35, 0, 0), Z), (17, (0.35, 0, 0), Z)],
    'SWA_LEG_R': [(1, (-0.35, 0, 0), Z), (9, (0.35, 0, 0), Z), (17, (-0.35, 0, 0), Z)],
    'SWA_SPINE': [(1, Z, Z), (5, (0.030, 0, 0), (0, 0, 0.03)), (9, Z, Z), (17, Z, Z)]
}, 17, True)
action('Run', {
    'SWA_LEG_L': [(1, (0.65, 0, 0), Z), (7, (-0.65, 0, 0), Z), (13, (0.65, 0, 0), Z)],
    'SWA_LEG_R': [(1, (-0.65, 0, 0), Z), (7, (0.65, 0, 0), Z), (13, (-0.65, 0, 0), Z)],
    'SWA_SPINE': [(1, (0.10, 0, 0), (0, 0, 0)), (7, (-0.08, 0, 0), (0, 0, 0.08)), (13, (0.10, 0, 0), (0, 0, 0))]
}, 13, True)
action('Jump', {
    'SWA_MASTER': [(1, Z, Z), (6, Z, (0, 0, -0.06)), (13, Z, (0, 0, 0.45)), (21, Z, (0, 0, 0.45)), (28, Z, Z)],
    'SWA_ARM_L': [(1, Z, Z), (10, (0, 0, 1.1), Z), (22, (0, 0, 1.1), Z), (28, Z, Z)],
    'SWA_ARM_R': [(1, Z, Z), (10, (0, 0, -1.1), Z), (22, (0, 0, -1.1), Z), (28, Z, Z)]
})
action('Land', {'SWA_MASTER': [(1, Z, (0, 0, 0.25)), (6, Z, (0, 0, -0.08)), (16, Z, Z)], 'SWA_SPINE': [(1, Z, Z), (5, (0.14, 0, 0), Z), (12, Z, Z)]})

for nm, rot in [
    ('Celebrate', (0, 0, 1.2)), ('Clap', (0, 0, -0.55)), ('Think', (0, 0, -0.4)),
    ('Shy', (0, 0, 0.28)), ('Greet', (0, 0, -0.8)), ('Goodbye', (0, 0, -1.0)),
    ('Heart_Gesture', (0, 0, -0.7)), ('Sit', (0.4, 0, 0)), ('Stand', (0, 0, 0)),
    ('Dance', (0, 0, 1.0)), ('Turn', (0, 0.7, 0)), ('Surprised_Reaction', (0, 0, -0.8)),
    ('Disappointed_Reaction', (0, 0, 0.3)), ('Happy_Reaction', (0, 0, 1.0))
]:
    pose_action(nm, rot)

for nm in ['Happy', 'Sad', 'Surprised', 'Angry', 'Confused', 'Sleepy', 'Laugh', 'Excited']:
    action('Emotion_' + nm, {'SWA_HEAD': [(1, Z, Z), (8, (0.04, 0, 0.08), Z), (24, Z, Z)]})

# 12. STUDIO STAGE & LIGHTING
def area(n, loc, power, size, color=(1, 1, 1)):
    d = bpy.data.lights.new(n, 'AREA')
    d.energy = power
    d.shape = 'DISK'
    d.size = size
    d.color = color
    o = bpy.data.objects.new(n, d)
    colls['SWA_LIGHTING'].objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector((0, 0, 1.15)) - o.location).to_track_quat('-Z', 'Y').to_euler()
    return o

area('SWA_Key_Softbox', (-3.0, -4.5, 4.0), 450, 3.5, (1.0, 0.95, 0.90))
area('SWA_Fill', (3.5, -3.5, 2.5), 200, 3.0, (0.88, 0.92, 1.0))
area('SWA_Rim', (0.5, 3.5, 3.5), 380, 2.5, (0.92, 0.94, 1.0))
area('SWA_Top', (0, -0.5, 4.5), 140, 3.0, (1.0, 1.0, 1.0))

scene.world.use_nodes = True
bg = scene.world.node_tree.nodes.get('Background')
bg.inputs['Color'].default_value = (0.88, 0.90, 0.94, 1.0)
bg.inputs['Strength'].default_value = 0.85

groundmat = pbr_mat('SWA | Studio floor', (0.88, 0.90, 0.94), rough=0.7)
bpy.ops.mesh.primitive_plane_add(size=100, location=(0, 0, 0))
ground = move(bpy.context.object, 'SWA_LIGHTING')
ground.name = 'SWA_Studio_Ground'
ground.data.materials.append(groundmat)

cam_data = bpy.data.cameras.new('SWA_Hero_Camera')
cam = bpy.data.objects.new('SWA_Hero_Camera', cam_data)
colls['SWA_CAMERA'].objects.link(cam)
scene.camera = cam
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 2.65

# Reset rig pose to clean neutral
arm.animation_data.action = None
for pb in arm.pose.bones:
    pb.location = (0, 0, 0)
    pb.rotation_euler = (0, 0, 0)
    pb.scale = (1, 1, 1)

scene.frame_start = 1
scene.frame_end = 32
scene.frame_set(1)
scene['Character'] = 'SWA V2 - Friendly digital companion mascot'
scene['Expression_controls'] = 'SWA_Mesh shape keys'
mesh['Rig_API'] = 'SWA_EYE_TARGET drives gaze morphs. BLUSH shader node / shape keys control cheek pink intensity.'

# 13. RENDER 4 FULL-BODY TURNAROUND VIEWS (Ortho scale = 2.65)
cam_data.ortho_scale = 2.65
scene.render.resolution_x = 900
scene.render.resolution_y = 900

views = [
    ('front', (0, -7.5, 1.15)),
    ('side', (7.5, 0, 1.15)),
    ('back', (0, 7.5, 1.15)),
    ('three_quarter', (3.8, -6.8, 1.35)),
]
for label, pos in views:
    cam.location = pos
    cam.rotation_euler = (Vector((0, 0, 1.15)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(PRE, f'swa_master_{label}.png')
    bpy.ops.render.render(write_still=True)
    print(f'RENDERED_MASTER_{label}')

# 14. EXPORT GLB
for o in bpy.context.selected_objects:
    o.select_set(False)
arm.select_set(True)
mesh.select_set(True)
bpy.context.view_layer.objects.active = arm

glb_path = os.path.join(OUT, 'swa_master.glb')
bpy.ops.export_scene.gltf(
    filepath=glb_path,
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_skins=True,
    export_morph=True,
    export_materials='EXPORT',
    export_cameras=False,
    export_lights=False
)
print("EXPORTED_GLB", glb_path)

# 15. RENDER 16 EXPRESSION PREVIEWS
# Close-up face portrait: ortho scale 1.15 focused on head & expression
cam.location = (0, -5.0, 1.46)
cam.rotation_euler = (Vector((0, 0, 1.46)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam_data.ortho_scale = 1.15
scene.render.resolution_x = 480
scene.render.resolution_y = 480

expressions = {
    'neutral': {},
    'happy': {'happy': 1.0},
    'sad': {'sad': 1.0},
    'surprised': {'surprised': 1.0},
    'angry': {'angry': 1.0},
    'thinking': {'thinking': 1.0},
    'laughing': {'laugh': 1.0},
    'winking': {'blink_L': 1.0, 'smile': 0.7, 'blush': 0.5},
    'confused': {'confused': 1.0},
    'sleepy': {'sleepy': 1.0},
    'crying': {'crying': 1.0},
    'excited': {'excited': 1.0},
    'proud': {'proud': 1.0},
    'worried': {'worried': 1.0},
    'shy': {'squint': 0.7, 'smile': 0.5, 'blush_strong': 0.8},
    'very_happy': {'happy': 0.4, 'smile_big': 0.9, 'blush_strong': 0.5}
}

keys = mesh.data.shape_keys.key_blocks

for label, values in expressions.items():
    for k in keys[1:]:
        k.value = 0.0
    for name, val in values.items():
        if name in keys:
            keys[name].value = val
    img_path = os.path.join(PRE, f'swa_expression_{label}.png')
    scene.render.filepath = img_path
    bpy.ops.render.render(write_still=True)
    print(f'EXPRESSION_RENDERED_{label}')

# Reset shape keys to neutral
for k in keys[1:]:
    k.value = 0.0

# 16. RESTORE HERO CAMERA AND SAVE MASTER BLEND
cam.location = (3.8, -6.8, 1.35)
cam.rotation_euler = (Vector((0, 0, 1.15)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam_data.ortho_scale = 2.65
scene.render.resolution_x = 900
scene.render.resolution_y = 900

master_blend = os.path.join(SRC, 'swa_master.blend')
bpy.ops.wm.save_as_mainfile(filepath=master_blend)
print("SAVED_MASTER_BLEND", master_blend)
print("ALL_BLENDER_TASKS_COMPLETE")
