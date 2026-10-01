import bpy, math, os, shutil
from mathutils import Vector, Euler, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.dirname(__file__)
OUT = os.path.join(ROOT, 'models')
PRE = os.path.join(ROOT, 'previews')
os.makedirs(OUT, exist_ok=True)
os.makedirs(PRE, exist_ok=True)

# 1. RESET SCENE
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

# 2. MATERIALS (Satin Porcelain Mascot Skin & Facial Elements)
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

mat_blush = bpy.data.materials.new('SWA | Blush')
mat_blush.use_nodes = True
tree_blush = mat_blush.node_tree
tree_blush.nodes.clear()
out_b = tree_blush.nodes.new('ShaderNodeOutputMaterial')
bsdf_b = tree_blush.nodes.new('ShaderNodeBsdfPrincipled')
bsdf_b.inputs['Base Color'].default_value = (1.0, 0.45, 0.58, 1.0) # #FF8CA3
bsdf_b.inputs['Roughness'].default_value = 0.50
if 'Specular IOR Level' in bsdf_b.inputs:
    bsdf_b.inputs['Specular IOR Level'].default_value = 0.1
if 'Alpha' in bsdf_b.inputs:
    bsdf_b.inputs['Alpha'].default_value = 0.65
if 'Emission Color' in bsdf_b.inputs:
    bsdf_b.inputs['Emission Color'].default_value = (1.0, 0.48, 0.60, 1.0)
    bsdf_b.inputs['Emission Strength'].default_value = 0.15
tree_blush.links.new(bsdf_b.outputs['BSDF'], out_b.inputs['Surface'])
if hasattr(mat_blush, 'blend_method'):
    mat_blush.blend_method = 'BLEND'
if hasattr(mat_blush, 'shadow_method'):
    mat_blush.shadow_method = 'NONE'

mat_mouth_cavity = pbr_mat('SWA | Mouth interior', (0.08, 0.015, 0.025), rough=0.30, spec=0.5)
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

# 3. COMPACT PLUSH BODY MESH (Smooth spherical dome crown + plush potbelly matching swa character.png)
sides = 48
body_verts = []
body_faces = []
sampled_rings = []

# A. Bottom Base (z = 0.22 to 0.48) - Smooth spherical tangent at bottom pole
n_bot = 10
for i in range(1, n_bot):
    phi = (math.pi / 2.0) * (i / n_bot)
    z = 0.22 + 0.26 * (1.0 - math.cos(phi))
    rx = 0.48 * math.sin(phi)
    ry = 0.44 * math.sin(phi)
    cy = -0.015 * math.sin(phi)
    sampled_rings.append((z, rx, ry, cy))

# B. Plush Potbelly Torso (z = 0.48 to 1.05) - Smooth cubic blend
n_mid = 18
for i in range(n_mid):
    u = i / (n_mid - 1)
    z = 0.48 + (1.05 - 0.48) * u
    belly = math.sin(math.pi * math.pow(u, 0.75))
    rx = 0.48 + (0.47 - 0.48) * u + 0.045 * belly
    ry = 0.44 + (0.43 - 0.44) * u + 0.038 * belly
    cy = -0.015 + (-0.012 - (-0.015)) * u - 0.005 * belly
    sampled_rings.append((z, rx, ry, cy))

# C. Smooth Spherical Dome Crown (z = 1.05 to 1.51) - Smooth spherical tangent at top pole
n_top = 16
for i in range(n_top - 1):
    phi = (math.pi / 2.0) * (i / (n_top - 1))
    z = 1.05 + 0.46 * math.sin(phi)
    rx = 0.47 * math.cos(phi)
    ry = 0.43 * math.cos(phi)
    cy = -0.012 * math.cos(phi)
    sampled_rings.append((z, max(0.005, rx), max(0.005, ry), cy))

# Sort sampled rings by Z ascending
sampled_rings.sort(key=lambda r: r[0])

for z, rx, ry, cy in sampled_rings:
    for j in range(sides):
        th = 2.0 * math.pi * j / sides
        body_verts.append((rx * math.cos(th), cy + ry * math.sin(th), z))

total_rings = len(sampled_rings)
for i in range(total_rings - 1):
    for j in range(sides):
        v0 = i * sides + j
        v1 = i * sides + (j + 1) % sides
        v2 = (i + 1) * sides + (j + 1) % sides
        v3 = (i + 1) * sides + j
        body_faces.append((v0, v1, v2, v3))

# Bottom Pole Cap (z = 0.220)
bp_idx = len(body_verts)
body_verts.append((0, 0, 0.220))
for j in range(sides):
    body_faces.append((bp_idx, (j + 1) % sides, j))

# Top Pole Cap (z = 1.510)
tp_idx = len(body_verts)
body_verts.append((0, 0, 1.510))
top_ring_start = (total_rings - 1) * sides
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

# Vertex groups for torso hierarchy
vg_pelvis = torso.vertex_groups.new(name='SWA_PELVIS')
vg_spine = torso.vertex_groups.new(name='SWA_SPINE')
vg_chest = torso.vertex_groups.new(name='SWA_CHEST')
vg_neck = torso.vertex_groups.new(name='SWA_NECK')
vg_head = torso.vertex_groups.new(name='SWA_HEAD')

for i, v in enumerate(body_mesh.vertices):
    z = v.co.z
    if z < 0.42:
        vg_pelvis.add([i], 1.0, 'REPLACE')
    elif z < 0.68:
        w = (z - 0.42) / 0.26
        vg_pelvis.add([i], 1.0 - w, 'REPLACE')
        vg_spine.add([i], w, 'REPLACE')
    elif z < 0.94:
        w = (z - 0.68) / 0.26
        vg_spine.add([i], 1.0 - w, 'REPLACE')
        vg_chest.add([i], w, 'REPLACE')
    elif z < 1.14:
        w = (z - 0.94) / 0.20
        vg_chest.add([i], 1.0 - w, 'REPLACE')
        vg_neck.add([i], w, 'REPLACE')
    elif z < 1.26:
        w = (z - 1.14) / 0.12
        vg_neck.add([i], 1.0 - w, 'REPLACE')
        vg_head.add([i], w, 'REPLACE')
    else:
        vg_head.add([i], 1.0, 'REPLACE')
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

# 4. ORGANIC ARMS & UNIFIED ARTICULATED MASCOT HANDS
def create_lofted_mesh(name, rings_data, sides=16, cap_start=True, cap_end=True, mat=mat_body):
    verts = []
    faces = []
    ref = Vector((0, 1, 0)) # Stable forward reference axis
    for center, rx, ry, n_dir in rings_data:
        n = n_dir.normalized() if n_dir.length_squared > 0.001 else Vector((0, 0, -1))
        proj = ref - n * ref.dot(n)
        if proj.length_squared < 0.001:
            ref_alt = Vector((1, 0, 0))
            proj = ref_alt - n * ref_alt.dot(n)
        tangent = proj.normalized()
        bitangent = n.cross(tangent).normalized()
        for j in range(sides):
            th = 2.0 * math.pi * j / sides
            offset = bitangent * (rx * math.cos(th)) + tangent * (ry * math.sin(th))
            verts.append(center + offset)
    n_rings = len(rings_data)
    for i in range(n_rings - 1):
        for j in range(sides):
            v0 = i * sides + j
            v1 = i * sides + (j + 1) % sides
            v2 = (i + 1) * sides + (j + 1) % sides
            v3 = (i + 1) * sides + j
            faces.append((v0, v1, v2, v3))
    if cap_start:
        start_tip = len(verts)
        verts.append(rings_data[0][0])
        for j in range(sides):
            faces.append((start_tip, (j + 1) % sides, j))
    if cap_end:
        end_tip = len(verts)
        verts.append(rings_data[-1][0])
        last_base = (n_rings - 1) * sides
        for j in range(sides):
            faces.append((end_tip, last_base + j, last_base + (j + 1) % sides))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.materials.append(mat)
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new(name, me)
    colls['SWA_CHARACTER'].objects.link(obj)
    parts.append(obj)
    return obj

def make_arm_and_hand(side_sign, side_name):
    s = side_sign
    
    # 4A. Seamless Unified Arm & Mitten Hand (Continuous quad tube from shoulder to rounded mitten tip)
    arm_hand_rings = [
        # Shoulder origin buried deep inside chest for smooth organic emergence (cap_start=False)
        (Vector((s * 0.30, -0.010, 0.96)), 0.150, 0.155, Vector((s * 0.40, 0, -1))),
        # Shoulder surface blend
        (Vector((s * 0.39, -0.012, 0.90)), 0.142, 0.146, Vector((s * 0.32, 0, -1))),
        # Upper arm
        (Vector((s * 0.46, -0.015, 0.82)), 0.134, 0.136, Vector((s * 0.22, 0, -1))),
        # Mid arm to elbow
        (Vector((s * 0.50, -0.018, 0.72)), 0.126, 0.128, Vector((s * 0.12, 0, -1))),
        # Forearm
        (Vector((s * 0.52, -0.022, 0.62)), 0.120, 0.122, Vector((0, 0, -1))),
        # Wrist (smooth continuous transition, NO cuff!)
        (Vector((s * 0.53, -0.025, 0.52)), 0.116, 0.116, Vector((0, 0, -1))),
        # Mascot Mitten Palm (soft cute expansion)
        (Vector((s * 0.535, -0.028, 0.44)), 0.125, 0.118, Vector((0, 0, -1))),
        # Knuckle arch
        (Vector((s * 0.538, -0.030, 0.35)), 0.116, 0.105, Vector((0, 0, -1))),
        # Mitten curve
        (Vector((s * 0.538, -0.032, 0.28)), 0.086, 0.072, Vector((0, 0, -1))),
        # Mitten dome tip
        (Vector((s * 0.538, -0.032, 0.22)), 0.025, 0.020, Vector((0, 0, -1))),
    ]
    arm_obj = create_lofted_mesh(f"SWA_ArmHand_{side_name}", arm_hand_rings, sides=16, cap_start=False, cap_end=True)
    
    vg_chest = arm_obj.vertex_groups.new(name='SWA_CHEST')
    vg_up_arm = arm_obj.vertex_groups.new(name=f'SWA_UPPER_ARM_{side_name}')
    vg_fore_arm = arm_obj.vertex_groups.new(name=f'SWA_FOREARM_{side_name}')
    vg_hand = arm_obj.vertex_groups.new(name=f'SWA_HAND_{side_name}')
    vg_idx_01 = arm_obj.vertex_groups.new(name=f'SWA_INDEX_01_{side_name}')
    vg_idx_02 = arm_obj.vertex_groups.new(name=f'SWA_INDEX_02_{side_name}')
    vg_fng_01 = arm_obj.vertex_groups.new(name=f'SWA_FINGERS_01_{side_name}')
    vg_fng_02 = arm_obj.vertex_groups.new(name=f'SWA_FINGERS_02_{side_name}')
    
    for i, v in enumerate(arm_obj.data.vertices):
        z = v.co.z
        x = v.co.x
        if z > 0.88:
            w = min(1.0, (z - 0.88) / 0.08)
            vg_chest.add([i], w, 'REPLACE')
            vg_up_arm.add([i], 1.0 - w, 'REPLACE')
        elif z > 0.74:
            vg_up_arm.add([i], 1.0, 'REPLACE')
        elif z > 0.65:
            w = (z - 0.65) / 0.09
            vg_up_arm.add([i], w, 'REPLACE')
            vg_fore_arm.add([i], 1.0 - w, 'REPLACE')
        elif z > 0.50:
            vg_fore_arm.add([i], 1.0, 'REPLACE')
        elif z > 0.44:
            w = (z - 0.44) / 0.06
            vg_fore_arm.add([i], w, 'REPLACE')
            vg_hand.add([i], 1.0 - w, 'REPLACE')
        elif z > 0.34:
            vg_hand.add([i], 1.0, 'REPLACE')
        else:
            is_index_side = (x * s < (s * 0.538 * s))
            if z > 0.27:
                if is_index_side:
                    vg_idx_01.add([i], 1.0, 'REPLACE')
                else:
                    vg_fng_01.add([i], 1.0, 'REPLACE')
            else:
                if is_index_side:
                    vg_idx_02.add([i], 1.0, 'REPLACE')
                else:
                    vg_fng_02.add([i], 1.0, 'REPLACE')

    # 4B. Articulated Opposable Mascot Thumb (Emerges from front-inner thenar pad pointing forward-inward)
    thumb_01_rings = [
        (Vector((s * 0.470, -0.060, 0.45)), 0.048, 0.046, Vector((s * -0.4, -0.6, -0.2))),
        (Vector((s * 0.445, -0.095, 0.42)), 0.044, 0.042, Vector((s * -0.4, -0.6, -0.2))),
        (Vector((s * 0.420, -0.125, 0.39)), 0.040, 0.038, Vector((s * -0.4, -0.6, -0.2))),
    ]
    t01 = create_lofted_mesh(f"SWA_Thumb_01_{side_name}", thumb_01_rings, sides=12, cap_start=False, cap_end=False)
    vg_t01 = t01.vertex_groups.new(name=f'SWA_THUMB_01_{side_name}')
    vg_t01.add(list(range(len(t01.data.vertices))), 1.0, 'REPLACE')

    # Thumb 02 (distal + rounded dome tip)
    thumb_02_rings = [
        (Vector((s * 0.420, -0.125, 0.39)), 0.040, 0.038, Vector((s * -0.4, -0.6, -0.2))),
        (Vector((s * 0.400, -0.150, 0.36)), 0.034, 0.032, Vector((s * -0.4, -0.6, -0.2))),
        (Vector((s * 0.385, -0.168, 0.33)), 0.020, 0.018, Vector((s * -0.4, -0.6, -0.2))),
    ]
    t02 = create_lofted_mesh(f"SWA_Thumb_02_{side_name}", thumb_02_rings, sides=12, cap_start=False, cap_end=True)
    vg_t02 = t02.vertex_groups.new(name=f'SWA_THUMB_02_{side_name}')
    vg_t02.add(list(range(len(t02.data.vertices))), 1.0, 'REPLACE')

make_arm_and_hand(-1, 'L')
make_arm_and_hand(1, 'R')

# 5. ORGANIC LEGS & STURDY MASCOT PEBBLE FEET
def make_leg_and_foot(side_sign, side_name):
    s = side_sign
    center_x = s * 0.20
    
    # 5A. Contoured Chubby Mascot Leg (Pelvis flare -> Thigh -> Knee -> Calf -> Ankle)
    leg_rings = [
        (Vector((center_x, -0.015, 0.32)), 0.145, 0.150, Vector((0, 0, -1))), # Hip flare (buried inside pelvis)
        (Vector((center_x, -0.018, 0.26)), 0.136, 0.140, Vector((0, 0, -1))), # Upper thigh
        (Vector((center_x, -0.020, 0.20)), 0.128, 0.132, Vector((0, -0.03, -1))), # Knee joint
        (Vector((center_x, -0.022, 0.14)), 0.120, 0.124, Vector((0, -0.02, -1))), # Calf
        (Vector((center_x, -0.020, 0.08)), 0.112, 0.114, Vector((0, 0, -1))), # Ankle
    ]
    leg_obj = create_lofted_mesh(f"SWA_Leg_{side_name}", leg_rings, sides=16, cap_start=False, cap_end=False)
    
    vg_pelvis = leg_obj.vertex_groups.new(name='SWA_PELVIS')
    vg_up_leg = leg_obj.vertex_groups.new(name=f'SWA_UPPER_LEG_{side_name}')
    vg_low_leg = leg_obj.vertex_groups.new(name=f'SWA_LOWER_LEG_{side_name}')
    vg_foot = leg_obj.vertex_groups.new(name=f'SWA_FOOT_{side_name}')
    
    for i, v in enumerate(leg_obj.data.vertices):
        z = v.co.z
        if z > 0.26:
            w = min(1.0, (z - 0.26) / 0.06)
            vg_pelvis.add([i], w, 'REPLACE')
            vg_up_leg.add([i], 1.0 - w, 'REPLACE')
        elif z > 0.18:
            vg_up_leg.add([i], 1.0, 'REPLACE')
        elif z > 0.12:
            w = (z - 0.12) / 0.06
            vg_up_leg.add([i], w, 'REPLACE')
            vg_low_leg.add([i], 1.0 - w, 'REPLACE')
        elif z > 0.08:
            vg_low_leg.add([i], 1.0, 'REPLACE')
        else:
            w = (z - 0.06) / 0.02
            vg_low_leg.add([i], max(0.0, w), 'REPLACE')
            vg_foot.add([i], min(1.0, 1.0 - w), 'REPLACE')

    # 5B. Sturdy Sculpted Mascot Pebble Foot (Broad, stable, rounded front toe, flat bottom)
    foot_slices = [
        # (y_pos, z_center, rx, rz_top)
        (0.09, 0.050, 0.120, 0.026),  # Heel
        (0.04, 0.068, 0.135, 0.044),
        (-0.02, 0.082, 0.142, 0.058), # Ankle rise
        (-0.07, 0.074, 0.145, 0.052), # Midfoot
        (-0.14, 0.062, 0.142, 0.038), # Ball of foot
        (-0.20, 0.048, 0.125, 0.026), # Front toe
        (-0.24, 0.035, 0.075, 0.012), # Toe tip
    ]
    f_verts = []
    f_faces = []
    base_z = 0.015
    sides = 16
    
    for y, z_ctr, rx, rz_top in foot_slices:
        for j in range(sides):
            th = 2.0 * math.pi * j / sides
            x = center_x + rx * math.cos(th)
            sin_val = math.sin(th)
            if sin_val < -0.1:
                z = base_z
            else:
                z = base_z + (z_ctr - base_z + rz_top) * max(0.0, sin_val)
            f_verts.append(Vector((x, y, z)))
            
    n_slices = len(foot_slices)
    for i in range(n_slices - 1):
        for j in range(sides):
            v0 = i * sides + j
            v1 = i * sides + (j + 1) % sides
            v2 = (i + 1) * sides + (j + 1) % sides
            v3 = (i + 1) * sides + j
            f_faces.append((v0, v1, v2, v3))
            
    heel_tip = len(f_verts)
    f_verts.append(Vector((center_x, foot_slices[0][0], base_z + 0.02)))
    for j in range(sides):
        f_faces.append((heel_tip, (j + 1) % sides, j))
        
    toe_tip = len(f_verts)
    f_verts.append(Vector((center_x, foot_slices[-1][0], base_z + 0.01)))
    last_base = (n_slices - 1) * sides
    for j in range(sides):
        f_faces.append((toe_tip, last_base + j, last_base + (j + 1) % sides))
        
    f_me = bpy.data.meshes.new(f"SWA_FootMesh_{side_name}")
    f_me.from_pydata(f_verts, [], f_faces)
    f_me.materials.append(mat_body)
    f_me.update()
    for p in f_me.polygons:
        p.use_smooth = True
    f_obj = bpy.data.objects.new(f"SWA_Foot_{side_name}", f_me)
    f_obj.rotation_euler = (0, 0, math.radians(-10 * s))
    colls['SWA_CHARACTER'].objects.link(f_obj)
    
    vg_f_foot = f_obj.vertex_groups.new(name=f'SWA_FOOT_{side_name}')
    vg_f_foot.add(list(range(len(f_obj.data.vertices))), 1.0, 'REPLACE')
    parts.append(f_obj)

make_leg_and_foot(-1, 'L')
make_leg_and_foot(1, 'R')

# 6. FACE FEATURES (Calibrated to Swa Concept Art with NO Antenna)
for s, side in [(-1, 'L'), (1, 'R')]:
    eye_x = s * 0.160
    eye_z = 1.22
    eye_y = -0.385
    # Rounded dark expressive eye (#2D2D3A)
    uv_part(
        f'SWA_Eye_{side}',
        (eye_x, eye_y, eye_z),
        (0.062, 0.022, 0.078),
        mat_dark,
        bone='SWA_HEAD',
        group='SWA_FACE',
        seg=24, rings=16
    )
    # Bright circular specular catchlight at top-left
    glint_x = eye_x - 0.020
    glint_z = eye_z + 0.025
    glint_y = eye_y - 0.012
    uv_part(
        f'SWA_Glint_{side}',
        (glint_x, glint_y, glint_z),
        (0.020, 0.012, 0.022),
        mat_glint,
        bone='SWA_HEAD',
        group='SWA_FACE',
        seg=16, rings=12
    )
    # Soft pink blush cheek right under the eye (flush against skin)
    blush_x = s * 0.240
    blush_z = 1.14
    blush_y = -0.374
    uv_part(
        f'SWA_Cheek_{side}',
        (blush_x, blush_y, blush_z),
        (0.076, 0.004, 0.050),
        mat_blush,
        bone='SWA_HEAD',
        group='SWA_FACE',
        seg=24, rings=16
    )
    # Eyebrows
    brow_x = s * 0.160
    brow_z = 1.31
    brow_y = -0.336
    uv_part(
        f'SWA_Brow_{side}',
        (brow_x, brow_y, brow_z),
        (0.038, 0.008, 0.012),
        mat_dark,
        bone='SWA_HEAD',
        group='SWA_FACE',
        seg=16, rings=8,
        rot=(0, 0, math.radians(-5 * s))
    )
    # Tears (created inside head at Y=0.0; displaced only in crying key)
    uv_part(
        f'SWA_Tear_{side}',
        (s * 0.18, 0.0, 1.15),
        (0.020, 0.014, 0.034),
        mat_tear,
        bone='SWA_HEAD',
        group='SWA_FACE',
        seg=16, rings=12
    )

# Subtle facial mouth: recessed interior cavity + rosy tongue
uv_part(
    'SWA_Mouth',
    (0, -0.436, 1.15),
    (0.046, 0.016, 0.020),
    mat_mouth_cavity,
    bone='SWA_HEAD',
    group='SWA_FACE',
    seg=20, rings=12
)
uv_part(
    'SWA_MouthTongue',
    (0, -0.440, 1.147),
    (0.032, 0.010, 0.014),
    mat_tongue,
    bone='SWA_HEAD',
    group='SWA_FACE',
    seg=16, rings=10
)

# 7. MERGE CHARACTER INTO SINGLE SKINNED MESH
bpy.ops.object.select_all(action='DESELECT')
for p in parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = torso
bpy.ops.object.join()
mesh = bpy.context.object
mesh.name = 'SWA_Mesh'
mesh.data.name = 'SWA_MeshData'

# Smooth normals and merge duplicate vertices
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')

# 8. PRODUCTION ARMATURE & RIG HIERARCHY
armd = bpy.data.armatures.new('SWA_RigData')
arm = bpy.data.objects.new('SWA_Rig', armd)
colls['SWA_RIG'].objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')

spec = {
    'SWA_MASTER': ((0, 0, 0), (0, 0, 0.18), None),
    'SWA_ROOT': ((0, 0, 0.08), (0, 0, 0.30), 'SWA_MASTER'),
    'SWA_PELVIS': ((0, 0, 0.30), (0, 0, 0.55), 'SWA_ROOT'),
    'SWA_SPINE': ((0, 0, 0.55), (0, 0, 0.80), 'SWA_PELVIS'),
    'SWA_CHEST': ((0, 0, 0.80), (0, 0, 1.05), 'SWA_SPINE'),
    'SWA_NECK': ((0, 0, 1.05), (0, 0, 1.18), 'SWA_CHEST'),
    'SWA_HEAD': ((0, 0, 1.18), (0, 0, 1.52), 'SWA_NECK'),
    'SWA_EYE_TARGET': ((0, -1.0, 1.20), (0, -0.8, 1.20), 'SWA_HEAD'),
}

for side, s in [('L', -1), ('R', 1)]:
    spec.update({
        # Arm & Hand chain
        f'SWA_UPPER_ARM_{side}': ((s * 0.38, -0.010, 1.12), (s * 0.59, -0.022, 0.80), 'SWA_CHEST'),
        f'SWA_FOREARM_{side}': ((s * 0.59, -0.022, 0.80), (s * 0.62, -0.030, 0.57), f'SWA_UPPER_ARM_{side}'),
        f'SWA_HAND_{side}': ((s * 0.62, -0.030, 0.57), (s * 0.628, -0.035, 0.34), f'SWA_FOREARM_{side}'),
        
        # Digits
        f'SWA_THUMB_01_{side}': ((s * 0.585, -0.065, 0.52), (s * 0.550, -0.120, 0.44), f'SWA_HAND_{side}'),
        f'SWA_THUMB_02_{side}': ((s * 0.550, -0.120, 0.44), (s * 0.525, -0.165, 0.38), f'SWA_THUMB_01_{side}'),
        
        f'SWA_INDEX_01_{side}': ((s * 0.615, -0.034, 0.42), (s * 0.615, -0.035, 0.34), f'SWA_HAND_{side}'),
        f'SWA_INDEX_02_{side}': ((s * 0.615, -0.035, 0.34), (s * 0.615, -0.035, 0.28), f'SWA_INDEX_01_{side}'),
        
        f'SWA_FINGERS_01_{side}': ((s * 0.645, -0.034, 0.42), (s * 0.645, -0.035, 0.34), f'SWA_HAND_{side}'),
        f'SWA_FINGERS_02_{side}': ((s * 0.645, -0.035, 0.34), (s * 0.645, -0.035, 0.28), f'SWA_FINGERS_01_{side}'),
        
        # Leg chain
        f'SWA_UPPER_LEG_{side}': ((s * 0.26, -0.02, 0.38), (s * 0.26, -0.028, 0.20), 'SWA_PELVIS'),
        f'SWA_LOWER_LEG_{side}': ((s * 0.26, -0.028, 0.20), (s * 0.26, -0.024, 0.10), f'SWA_UPPER_LEG_{side}'),
        f'SWA_FOOT_{side}': ((s * 0.26, -0.024, 0.10), (s * 0.26, -0.22, 0.015), f'SWA_LOWER_LEG_{side}'),
        
        f'SWA_EYE_{side}': ((s * 0.195, -0.35, 1.24), (s * 0.195, -0.49, 1.24), 'SWA_HEAD'),
        
        # IK Controls
        f'SWA_ARM_IK_{side}': ((s * 0.628, -0.035, 0.34), (s * 0.628, -0.035, 0.20), 'SWA_MASTER'),
        f'SWA_ARM_POLE_{side}': ((s * 0.59, 0.35, 0.80), (s * 0.59, 0.45, 0.80), 'SWA_MASTER'),
        
        f'SWA_LEG_IK_{side}': ((s * 0.26, -0.024, 0.015), (s * 0.26, -0.22, 0.015), 'SWA_MASTER'),
        f'SWA_LEG_POLE_{side}': ((s * 0.26, -0.55, 0.20), (s * 0.26, -0.65, 0.20), 'SWA_MASTER'),
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

# Mark non-deform controls
non_deform_bones = ['SWA_MASTER', 'SWA_EYE_TARGET']
for side in ['L', 'R']:
    non_deform_bones.extend([
        f'SWA_ARM_IK_{side}', f'SWA_ARM_POLE_{side}',
        f'SWA_LEG_IK_{side}', f'SWA_LEG_POLE_{side}'
    ])

for name in non_deform_bones:
    pb = arm.pose.bones.get(name)
    if pb:
        pb.bone.use_deform = False

# Setup IK Constraints on Limbs
for side in ['L', 'R']:
    pb_fore = arm.pose.bones.get(f'SWA_FOREARM_{side}')
    ik_arm = pb_fore.constraints.new('IK')
    ik_arm.name = 'Arm_IK'
    ik_arm.target = arm
    ik_arm.subtarget = f'SWA_ARM_IK_{side}'
    ik_arm.pole_target = arm
    ik_arm.pole_subtarget = f'SWA_ARM_POLE_{side}'
    ik_arm.pole_angle = 0.0
    ik_arm.chain_count = 2
    ik_arm.influence = 0.0
    
    pb_hand = arm.pose.bones.get(f'SWA_HAND_{side}')
    pb_hand['IK_FK'] = 0.0
    
    pb_lower = arm.pose.bones.get(f'SWA_LOWER_LEG_{side}')
    ik_leg = pb_lower.constraints.new('IK')
    ik_leg.name = 'Leg_IK'
    ik_leg.target = arm
    ik_leg.subtarget = f'SWA_LEG_IK_{side}'
    ik_leg.pole_target = arm
    ik_leg.pole_subtarget = f'SWA_LEG_POLE_{side}'
    ik_leg.pole_angle = 0.0
    ik_leg.chain_count = 2
    ik_leg.influence = 0.0
    
    pb_foot = arm.pose.bones.get(f'SWA_FOOT_{side}')
    cp_rot = pb_foot.constraints.new('COPY_ROTATION')
    cp_rot.name = 'Foot_IK_Rot'
    cp_rot.target = arm
    cp_rot.subtarget = f'SWA_LEG_IK_{side}'
    cp_rot.influence = 0.0

# 9. SHAPE KEYS (Facial morphs, Hand poses, Corrective deformations)
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
basis = mesh.data.shape_keys.key_blocks['Basis']

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

# Granular Eye controls
facial_key('blink_L', [(E('L'), 1, 1, 0.05, 0, 0, 0, 0), (G('L'), 1, 1, 0.05, 0, 0, 0, 0)])
facial_key('blink_R', [(E('R'), 1, 1, 0.05, 0, 0, 0, 0), (G('R'), 1, 1, 0.05, 0, 0, 0, 0)])
facial_key('blink_both', [(E(s), 1, 1, 0.05, 0, 0, 0, 0) for s in 'LR'] + [(G(s), 1, 1, 0.05, 0, 0, 0, 0) for s in 'LR'])
facial_key('squint_L', [(E('L'), 1, 1, 0.35, 0, 0, -0.005, 0), (G('L'), 1, 1, 0.35, 0, 0, -0.005, 0)])
facial_key('squint_R', [(E('R'), 1, 1, 0.35, 0, 0, -0.005, 0), (G('R'), 1, 1, 0.35, 0, 0, -0.005, 0)])
facial_key('squint', [(E(s), 1, 1, 0.35, 0, 0, -0.005, 0) for s in 'LR'] + [(G(s), 1, 1, 0.35, 0, 0, -0.005, 0) for s in 'LR'])
facial_key('wide_L', [(E('L'), 1.15, 1, 1.25, 0, 0, 0.005, 0), (G('L'), 1.15, 1, 1.25, 0, 0, 0.005, 0)])
facial_key('wide_R', [(E('R'), 1.15, 1, 1.25, 0, 0, 0.005, 0), (G('R'), 1.15, 1, 1.25, 0, 0, 0.005, 0)])
facial_key('wide', [(E(s), 1.15, 1, 1.25, 0, 0, 0.005, 0) for s in 'LR'] + [(G(s), 1.15, 1, 1.25, 0, 0, 0.005, 0) for s in 'LR'])

# Granular Eyebrow controls
facial_key('brow_raise_L', [(B('L'), 1, 1, 1, 0, 0, 0.035, 0.08)])
facial_key('brow_raise_R', [(B('R'), 1, 1, 1, 0, 0, 0.035, -0.08)])
facial_key('brow_lower_L', [(B('L'), 1, 1, 1, 0, 0, -0.025, -0.08)])
facial_key('brow_lower_R', [(B('R'), 1, 1, 1, 0, 0, -0.025, 0.08)])
facial_key('brow_tilt_in_L', [(B('L'), 1, 1, 1, 0, 0, 0.020, -0.22)])
facial_key('brow_tilt_in_R', [(B('R'), 1, 1, 1, 0, 0, 0.020, 0.22)])
facial_key('brow_tilt_out_L', [(B('L'), 1, 1, 1, 0, 0, -0.015, 0.25)])
facial_key('brow_tilt_out_R', [(B('R'), 1, 1, 1, 0, 0, -0.015, -0.25)])

# Granular Mouth shape keys
facial_key('mouth_smile_small', [(M, 1.15, 1.0, 1.05, 0, 0, 0.008, 0), (T, 1.10, 1.0, 1.02, 0, 0, 0.006, 0)])
facial_key('mouth_smile_open', [(M, 1.35, 1.1, 1.45, 0, 0, 0.014, 0), (T, 1.30, 1.1, 1.35, 0, 0, 0.012, 0)])
facial_key('mouth_smile_big', [
    (M, 1.55, 1.1, 1.65, 0, 0, 0.018, 0),
    (T, 1.50, 1.1, 1.50, 0, 0, 0.014, 0),
    (C('L'), 1.18, 1.0, 1.18, -0.012, 0, 0.015, 0),
    (C('R'), 1.18, 1.0, 1.18,  0.012, 0, 0.015, 0),
])
facial_key('mouth_frown', [
    (M, 1.15, 0.9, 0.80, 0, 0, -0.022, 0),
    (T, 0.90, 0.9, 0.60, 0, 0, -0.018, 0),
])
facial_key('mouth_worried', [
    (M, 1.10, 0.9, 0.70, 0.010, 0, -0.015, -0.08),
    (T, 0.85, 0.8, 0.50, 0.008, 0, -0.012, -0.06),
])
facial_key('mouth_surprised_O', [
    (M, 0.85, 1.1, 2.20, 0, 0, -0.018, 0),
    (T, 0.70, 1.0, 1.60, 0, 0, -0.012, 0),
])
facial_key('mouth_pursed_think', [
    (M, 0.85, 0.9, 0.80, 0.028, 0, -0.005, 0.14),
    (T, 0.75, 0.8, 0.70, 0.022, 0, -0.004, 0.12),
])
facial_key('mouth_laugh', [
    (M, 1.60, 1.2, 2.30, 0, 0, 0.010, 0),
    (T, 1.55, 1.2, 2.00, 0, 0, 0.005, 0),
])
facial_key('mouth_shy', [
    (M, 1.08, 1.0, 0.95, -0.008, 0, 0.006, -0.06),
    (T, 1.02, 1.0, 0.90, -0.006, 0, 0.004, -0.05),
])
facial_key('mouth_smirk', [
    (M, 1.20, 1.0, 1.10, 0.015, 0, 0.010, 0.18),
    (T, 1.15, 1.0, 1.05, 0.012, 0, 0.008, 0.15),
])

# Backwards compatible mouth aliases
facial_key('smile', [
    (M, 1.25, 1.0, 1.15, 0, 0, 0.012, 0),
    (T, 1.20, 1.0, 1.10, 0, 0, 0.010, 0),
    (C('L'), 1.08, 1.0, 1.08, -0.008, 0, 0.010, 0),
    (C('R'), 1.08, 1.0, 1.08,  0.008, 0, 0.010, 0),
])
facial_key('smile_big', [
    (M, 1.55, 1.1, 1.65, 0, 0, 0.018, 0),
    (T, 1.50, 1.1, 1.50, 0, 0, 0.014, 0),
    (C('L'), 1.18, 1.0, 1.18, -0.012, 0, 0.015, 0),
    (C('R'), 1.18, 1.0, 1.18,  0.012, 0, 0.015, 0),
])
facial_key('open', [
    (M, 1.35, 1.1, 2.10, 0, 0, -0.015, 0),
    (T, 1.30, 1.1, 1.80, 0, 0, -0.012, 0),
])
facial_key('surprised_mouth', [
    (M, 0.85, 1.1, 2.20, 0, 0, -0.018, 0),
    (T, 0.70, 1.0, 1.60, 0, 0, -0.012, 0),
])
facial_key('sad_mouth', [
    (M, 1.15, 0.9, 0.80, 0, 0, -0.022, 0),
    (T, 0.90, 0.9, 0.60, 0, 0, -0.018, 0),
])
facial_key('angry_mouth', [
    (M, 1.25, 0.9, 0.75, 0, 0, -0.015, 0),
    (T, 0.85, 0.9, 0.60, 0, 0, -0.012, 0),
])
facial_key('confused_mouth', [
    (M, 1.10, 1.0, 0.90, 0.025, 0, -0.008, 0.14),
    (T, 1.00, 1.0, 0.85, 0.020, 0, -0.006, 0.12),
])
facial_key('laugh_mouth', [
    (M, 1.60, 1.2, 2.30, 0, 0, 0.010, 0),
    (T, 1.55, 1.2, 2.00, 0, 0, 0.005, 0),
])

# Phoneme shapes
facial_key('phoneme_A', [(M, 1.45, 1.0, 2.20, 0, 0, -0.015, 0), (T, 1.35, 1.0, 1.80, 0, 0, -0.010, 0)])
facial_key('phoneme_E', [(M, 1.50, 1.0, 1.10, 0, 0, 0.005, 0), (T, 1.40, 1.0, 1.05, 0, 0, 0.003, 0)])
facial_key('phoneme_O', [(M, 0.80, 1.0, 1.90, 0, 0, -0.010, 0), (T, 0.70, 1.0, 1.40, 0, 0, -0.008, 0)])
facial_key('phoneme_M', [(M, 1.05, 0.8, 0.25, 0, 0, 0, 0), (T, 0.50, 0.5, 0.10, 0, 0, 0, 0)])

# Blush keys
facial_key('blush', [(C('L'), 1.35, 1.2, 1.35, -0.005, 0, 0, 0), (C('R'), 1.35, 1.2, 1.35, 0.005, 0, 0, 0)])
facial_key('blush_strong', [(C('L'), 1.65, 1.4, 1.65, -0.010, 0, 0, 0), (C('R'), 1.65, 1.4, 1.65, 0.010, 0, 0, 0)])
facial_key('blush_off', [(C('L'), 0.01, 0.01, 0.01, 0, 0, 0, 0), (C('R'), 0.01, 0.01, 0.01, 0, 0, 0, 0)])

# Gaze keys
facial_key('gaze_left', [(E(s), 1, 1, 1, -0.035, 0, 0, 0) for s in 'LR'] + [(G(s), 1, 1, 1, -0.035, 0, 0, 0) for s in 'LR'])
facial_key('gaze_right', [(E(s), 1, 1, 1, 0.035, 0, 0, 0) for s in 'LR'] + [(G(s), 1, 1, 1, 0.035, 0, 0, 0) for s in 'LR'])
facial_key('gaze_up', [(E(s), 1, 1, 1, 0, 0, 0.025, 0) for s in 'LR'] + [(G(s), 1, 1, 1, 0, 0, 0.025, 0) for s in 'LR'])
facial_key('gaze_down', [(E(s), 1, 1, 1, 0, 0, -0.025, 0) for s in 'LR'] + [(G(s), 1, 1, 1, 0, 0, -0.025, 0) for s in 'LR'])

# Full Emotion shape keys
facial_key('happy', [
    (E('L'), 1.05, 1, 0.85, 0, 0, 0.010, 0), (G('L'), 1.05, 1, 0.85, 0, 0, 0.010, 0),
    (E('R'), 1.05, 1, 0.85, 0, 0, 0.010, 0), (G('R'), 1.05, 1, 0.85, 0, 0, 0.010, 0),
    (B('L'), 1, 1, 1, 0, 0, 0.018, 0.08), (B('R'), 1, 1, 1, 0, 0, 0.018, -0.08),
    (C('L'), 1.25, 1.1, 1.25, -0.008, 0, 0.012, 0), (C('R'), 1.25, 1.1, 1.25, 0.008, 0, 0.012, 0),
    (M, 1.45, 1.1, 1.55, 0, 0, 0.014, 0), (T, 1.40, 1.1, 1.40, 0, 0, 0.012, 0),
])

facial_key('sad', [
    (E('L'), 0.92, 1, 0.85, 0, 0, -0.010, 0), (G('L'), 0.92, 1, 0.85, 0, 0, -0.010, 0),
    (E('R'), 0.92, 1, 0.85, 0, 0, -0.010, 0), (G('R'), 0.92, 1, 0.85, 0, 0, -0.010, 0),
    (B('L'), 1, 1, 1, 0, 0, 0.010, -0.22), (B('R'), 1, 1, 1, 0, 0, 0.010, 0.22),
    (C('L'), 0.85, 0.9, 0.85, 0, 0, -0.010, 0), (C('R'), 0.85, 0.9, 0.85, 0, 0, -0.010, 0),
    (M, 1.10, 0.9, 0.75, 0, 0, -0.022, 0), (T, 0.85, 0.8, 0.50, 0, 0, -0.018, 0),
])

facial_key('surprised', [
    (E(s), 1.25, 1, 1.35, 0, 0, 0.010, 0) for s in 'LR'] +
    [(G(s), 1.25, 1, 1.35, 0, 0, 0.010, 0) for s in 'LR'] +
    [(B('L'), 1, 1, 1, 0, 0, 0.045, 0), (B('R'), 1, 1, 1, 0, 0, 0.045, 0),
    (C('L'), 1.15, 1.0, 1.15, 0, 0, 0.005, 0), (C('R'), 1.15, 1.0, 1.15, 0, 0, 0.005, 0),
    (M, 0.85, 1.2, 2.30, 0, 0, -0.020, 0), (T, 0.75, 1.1, 1.80, 0, 0, -0.015, 0),
])

facial_key('angry', [
    (E(s), 1.05, 1, 0.80, 0, 0, 0, 0) for s in 'LR'] +
    [(G(s), 1.05, 1, 0.80, 0, 0, 0, 0) for s in 'LR'] +
    [(B('L'), 1.15, 1, 1.1, 0.01, 0, -0.020, 0.35), (B('R'), 1.15, 1, 1.1, -0.01, 0, -0.020, -0.35),
    (C('L'), 1.15, 1.0, 1.10, 0, 0, 0, 0), (C('R'), 1.15, 1.0, 1.10, 0, 0, 0, 0),
    (M, 1.25, 0.9, 0.70, 0, 0, -0.014, 0), (T, 0.90, 0.9, 0.50, 0, 0, -0.012, 0),
])

facial_key('thinking', [
    (E('L'), 1.05, 1, 1.10, 0, 0, 0.015, 0), (G('L'), 1.05, 1, 1.10, 0, 0, 0.015, 0),
    (E('R'), 0.85, 1, 0.65, 0, 0, 0.005, 0), (G('R'), 0.85, 1, 0.65, 0, 0, 0.005, 0),
    (B('L'), 1, 1, 1, 0, 0, 0.025, 0.12), (B('R'), 1, 1, 1, 0, 0, -0.015, -0.15),
    (M, 0.90, 1, 0.80, 0.025, 0, -0.005, 0.12), (T, 0.85, 1, 0.75, 0.020, 0, -0.004, 0.10),
])

facial_key('laugh', [
    (E(s), 1.15, 1, 0.15, 0, 0, 0.010, 0) for s in 'LR'] +
    [(G(s), 1.15, 1, 0.15, 0, 0, 0.010, 0) for s in 'LR'] +
    [(B('L'), 1, 1, 1, 0, 0, 0.030, 0.15), (B('R'), 1, 1, 1, 0, 0, 0.030, -0.15),
    (C('L'), 1.45, 1.2, 1.45, -0.012, 0, 0.018, 0), (C('R'), 1.45, 1.2, 1.45, 0.012, 0, 0.018, 0),
    (M, 1.65, 1.2, 2.45, 0, 0, 0.012, 0), (T, 1.60, 1.2, 2.10, 0, 0, 0.008, 0),
])

facial_key('confused', [
    (E('L'), 1.15, 1, 1.20, 0, 0, 0.008, 0), (G('L'), 1.15, 1, 1.20, 0, 0, 0.008, 0),
    (E('R'), 0.80, 1, 0.50, 0, 0, -0.005, 0), (G('R'), 0.80, 1, 0.50, 0, 0, -0.005, 0),
    (B('L'), 1, 1, 1, 0, 0, 0.035, 0.18), (B('R'), 1, 1, 1, 0, 0, -0.020, -0.25),
    (M, 1.10, 1.0, 0.85, -0.025, 0, -0.008, -0.16), (T, 1.00, 1.0, 0.80, -0.020, 0, -0.006, -0.14),
])

facial_key('sleepy', [
    (E(s), 1.05, 1, 0.22, 0, 0, -0.015, 0) for s in 'LR'] +
    [(G(s), 1.05, 1, 0.22, 0, 0, -0.015, 0) for s in 'LR'] +
    [(B('L'), 1, 1, 1, 0, 0, -0.020, -0.10), (B('R'), 1, 1, 1, 0, 0, -0.020, 0.10),
    (M, 0.80, 1.0, 0.90, 0, 0, -0.012, 0), (T, 0.70, 1.0, 0.80, 0, 0, -0.010, 0),
])

facial_key('crying', [
    (E(s), 1.05, 1, 0.30, 0, 0, -0.008, 0) for s in 'LR'] +
    [(G(s), 1.05, 1, 0.30, 0, 0, -0.008, 0) for s in 'LR'] +
    [(B('L'), 1, 1, 1, 0, 0, 0.015, -0.25), (B('R'), 1, 1, 1, 0, 0, 0.015, 0.25),
    (M, 1.25, 0.9, 0.80, 0, 0, -0.024, 0), (T, 0.90, 0.8, 0.55, 0, 0, -0.020, 0),
    ('SWA_Tear_L', 1, 1, 1, 0, -0.50, 0, 0), ('SWA_Tear_R', 1, 1, 1, 0, -0.50, 0, 0),
])

facial_key('excited', [
    (E(s), 1.20, 1, 1.25, 0, 0, 0.015, 0) for s in 'LR'] +
    [(G(s), 1.20, 1, 1.25, 0, 0, 0.015, 0) for s in 'LR'] +
    [(B('L'), 1.1, 1, 1, 0, 0, 0.035, 0.12), (B('R'), 1.1, 1, 1, 0, 0, 0.035, -0.12),
    (C('L'), 1.45, 1.2, 1.45, -0.012, 0, 0.018, 0), (C('R'), 1.45, 1.2, 1.45, 0.012, 0, 0.018, 0),
    (M, 1.55, 1.2, 2.30, 0, 0, 0.010, 0), (T, 1.50, 1.2, 1.95, 0, 0, 0.006, 0),
])

facial_key('proud', [
    (E(s), 1.10, 1, 0.70, 0, 0, 0.005, 0) for s in 'LR'] +
    [(G(s), 1.10, 1, 0.70, 0, 0, 0.005, 0) for s in 'LR'] +
    [(B('L'), 1, 1, 1, 0, 0, 0.018, 0.10), (B('R'), 1, 1, 1, 0, 0, 0.018, -0.10),
    (C('L'), 1.25, 1.1, 1.25, -0.008, 0, 0.010, 0), (C('R'), 1.25, 1.1, 1.25, 0.008, 0, 0.010, 0),
    (M, 1.35, 1.0, 1.25, 0, 0, 0.012, 0), (T, 1.30, 1.0, 1.15, 0, 0, 0.009, 0),
])

facial_key('worried', [
    (E(s), 1.10, 1, 1.15, 0, 0, 0.005, 0) for s in 'LR'] +
    [(G(s), 1.10, 1, 1.15, 0, 0, 0.005, 0) for s in 'LR'] +
    [(B('L'), 1.1, 1, 1, 0, 0, 0.025, -0.22), (B('R'), 1.1, 1, 1, 0, 0, 0.025, 0.22),
    (M, 1.10, 0.9, 0.70, 0, 0, -0.015, 0), (T, 0.85, 0.8, 0.50, 0, 0, -0.012, 0),
])

facial_key('very_happy', [
    (E(s), 1.15, 1, 1.15, 0, 0, 0.015, 0) for s in 'LR'] +
    [(G(s), 1.15, 1, 1.15, 0, 0, 0.015, 0) for s in 'LR'] +
    [(B('L'), 1.15, 1, 1, 0, 0, 0.045, 0.15), (B('R'), 1.15, 1, 1, 0, 0, 0.045, -0.15),
    (C('L'), 1.55, 1.3, 1.55, -0.012, 0, 0.018, 0), (C('R'), 1.55, 1.3, 1.55, 0.012, 0, 0.018, 0),
    (M, 1.65, 1.2, 2.35, 0, 0, 0.018, 0), (T, 1.60, 1.2, 1.95, 0, 0, 0.015, 0),
])

facial_key('wink', [
    (E('L'), 1, 1, 0.05, 0, 0, 0, 0), (G('L'), 1, 1, 0.05, 0, 0, 0, 0),
    (E('R'), 1.15, 1, 1.15, 0, 0, 0.005, 0), (G('R'), 1.15, 1, 1.15, 0, 0, 0.005, 0),
    (B('L'), 1, 1, 1, 0, 0, -0.015, -0.08), (B('R'), 1, 1, 1, 0, 0, 0.035, -0.10),
    (C('R'), 1.30, 1.1, 1.30, 0.008, 0, 0.010, 0),
    (M, 1.30, 1.0, 1.20, 0.012, 0, 0.010, 0.15), (T, 1.25, 1.0, 1.15, 0.010, 0, 0.008, 0.12),
])

facial_key('shy', [
    (E(s), 1.05, 1, 0.35, 0, 0, -0.005, 0) for s in 'LR'] +
    [(G(s), 1.05, 1, 0.35, 0, 0, -0.005, 0) for s in 'LR'] +
    [(B('L'), 1, 1, 1, 0, 0, 0.010, 0.05), (B('R'), 1, 1, 1, 0, 0, 0.010, -0.05),
    (C('L'), 1.65, 1.4, 1.65, -0.010, 0, 0, 0), (C('R'), 1.65, 1.4, 1.65, 0.010, 0, 0, 0),
    (M, 1.10, 1.0, 0.95, -0.006, 0, 0.006, -0.05), (T, 1.05, 1.0, 0.90, -0.004, 0, 0.004, -0.04),
])

# Hand Poses & Corrective Shape Keys
def make_vertex_group_morph(name, transforms):
    key = mesh.shape_key_add(name=name, from_mix=False)
    for vg_name, pz, sx, sy, sz, dx, dy, dz in transforms:
        vg = mesh.vertex_groups.get(vg_name)
        if not vg: continue
        for v in mesh.data.vertices:
            try:
                w = vg.weight(v.index)
                if w > 0.01:
                    orig = basis.data[v.index].co
                    nx = orig.x + (orig.x * (sx - 1.0) + dx) * w
                    ny = orig.y + (orig.y * (sy - 1.0) + dy) * w
                    nz = orig.z + ((orig.z - pz) * (sz - 1.0) + dz) * w
                    key.data[v.index].co = Vector((nx, ny, nz))
            except RuntimeError:
                pass
    return key

# Hand Articulation Shape Keys (Open, Fist, Point, Thumbs Up)
for side, s in [('L', -1), ('R', 1)]:
    # Fist
    make_vertex_group_morph(f'hand_fist_{side}', [
        (f'SWA_THUMB_01_{side}', 0.48, 0.85, 0.85, 0.85, s * 0.02, 0.03, -0.01),
        (f'SWA_THUMB_02_{side}', 0.42, 0.80, 0.80, 0.80, s * 0.03, 0.05, -0.02),
        (f'SWA_INDEX_01_{side}', 0.41, 0.90, 0.90, 0.90, 0, 0.03, 0.02),
        (f'SWA_INDEX_02_{side}', 0.32, 0.85, 0.85, 0.85, 0, 0.05, 0.04),
        (f'SWA_FINGERS_01_{side}', 0.41, 0.90, 0.90, 0.90, 0, 0.03, 0.02),
        (f'SWA_FINGERS_02_{side}', 0.32, 0.85, 0.85, 0.85, 0, 0.05, 0.04),
    ])
    # Point
    make_vertex_group_morph(f'hand_point_{side}', [
        (f'SWA_INDEX_01_{side}', 0.41, 1.05, 1.05, 1.15, 0, -0.03, -0.02),
        (f'SWA_INDEX_02_{side}', 0.32, 1.05, 1.05, 1.25, 0, -0.06, -0.04),
        (f'SWA_FINGERS_01_{side}', 0.41, 0.90, 0.90, 0.90, 0, 0.03, 0.02),
        (f'SWA_FINGERS_02_{side}', 0.32, 0.85, 0.85, 0.85, 0, 0.05, 0.04),
    ])
    # Thumbs Up
    make_vertex_group_morph(f'hand_thumbs_up_{side}', [
        (f'SWA_THUMB_01_{side}', 0.48, 1.10, 1.10, 1.15, s * -0.02, -0.02, 0.03),
        (f'SWA_THUMB_02_{side}', 0.42, 1.15, 1.15, 1.25, s * -0.04, -0.03, 0.06),
        (f'SWA_INDEX_01_{side}', 0.41, 0.90, 0.90, 0.90, 0, 0.03, 0.02),
        (f'SWA_INDEX_02_{side}', 0.32, 0.85, 0.85, 0.85, 0, 0.05, 0.04),
        (f'SWA_FINGERS_01_{side}', 0.41, 0.90, 0.90, 0.90, 0, 0.03, 0.02),
        (f'SWA_FINGERS_02_{side}', 0.32, 0.85, 0.85, 0.85, 0, 0.05, 0.04),
    ])
    # Open Hand
    make_vertex_group_morph(f'hand_open_{side}', [
        (f'SWA_THUMB_01_{side}', 0.48, 1.10, 1.10, 1.10, s * -0.02, -0.02, 0),
        (f'SWA_THUMB_02_{side}', 0.42, 1.10, 1.10, 1.10, s * -0.04, -0.03, 0),
        (f'SWA_INDEX_01_{side}', 0.41, 1.10, 1.10, 1.10, s * 0.01, -0.01, 0),
        (f'SWA_INDEX_02_{side}', 0.32, 1.10, 1.10, 1.10, s * 0.02, -0.02, 0),
        (f'SWA_FINGERS_01_{side}', 0.41, 1.10, 1.10, 1.10, s * -0.01, -0.01, 0),
        (f'SWA_FINGERS_02_{side}', 0.32, 1.10, 1.10, 1.10, s * -0.02, -0.02, 0),
    ])

# Squash & Stretch Corrective Shape Keys
key_squash = mesh.shape_key_add(name='squash', from_mix=False)
key_stretch = mesh.shape_key_add(name='stretch', from_mix=False)
for v in mesh.data.vertices:
    co = basis.data[v.index].co
    z_rel = (co.z - 0.65)
    key_squash.data[v.index].co = Vector((co.x * 1.10, co.y * 1.10, 0.65 + z_rel * 0.84))
    key_stretch.data[v.index].co = Vector((co.x * 0.92, co.y * 0.92, 0.65 + z_rel * 1.16))

# Joint Volume Correctives
for side, s in [('L', -1), ('R', 1)]:
    make_vertex_group_morph(f'corrective_arm_up_{side}', [
        (f'SWA_UPPER_ARM_{side}', 0.95, 1.15, 1.15, 1.05, s * 0.02, 0, 0.02)
    ])
    make_vertex_group_morph(f'corrective_elbow_bend_{side}', [
        (f'SWA_FOREARM_{side}', 0.80, 1.12, 1.12, 1.08, 0, 0.02, 0)
    ])
    make_vertex_group_morph(f'corrective_knee_bend_{side}', [
        (f'SWA_LOWER_LEG_{side}', 0.20, 1.15, 1.18, 1.08, 0, -0.02, 0)
    ])

# 10. DRIVERS FOR GAZE & BLUSH
sk = mesh.data.shape_keys
sk.animation_data_create()
for k, axis, sign in [
    ('gaze_right', 0, 1), ('gaze_left', 0, -1),
    ('gaze_up', 2, 1), ('gaze_down', 2, -1)
]:
    kb = sk.key_blocks.get(k)
    fcurve = sk.animation_data.drivers.new(f'key_blocks["{k}"].value')
    drv = fcurve.driver
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

# 11. PRODUCTION ANIMATION ACTIONS (Full IK/FK & Articulated Hand Keyframes)
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
        if not pb: continue
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

# Idle Breathing
idle = {
    'SWA_SPINE': [(1, Z, Z), (8, (0.015, 0, 0), (0, 0, 0.015)), (16, Z, Z), (24, (-0.012, 0, 0), (0, 0, -0.008)), (32, Z, Z)],
    'SWA_CHEST': [(1, Z, Z), (8, (0.010, 0, 0), Z), (16, Z, Z), (24, (-0.008, 0, 0), Z), (32, Z, Z)],
    'SWA_HEAD': [(1, Z, Z), (16, (0, 0.015, 0.015), Z), (32, Z, Z)],
    'SWA_UPPER_ARM_L': [(1, Z, Z), (16, (0.03, 0, 0.02), Z), (32, Z, Z)],
    'SWA_UPPER_ARM_R': [(1, Z, Z), (16, (0.03, 0, -0.02), Z), (32, Z, Z)],
}
action('Idle_Breathing', idle, 32, True)

# Idle Look Around
action('Idle_Look_Around', {
    'SWA_HEAD': [(1, Z, Z), (8, (0, 0.18, 0), Z), (16, (0, -0.16, 0), Z), (24, (0.04, 0.10, 0), Z), (32, Z, Z)],
    'SWA_EYE_TARGET': [(1, Z, Z), (8, Z, (0.10, 0, 0)), (16, Z, (-0.10, 0, 0)), (24, Z, (0.05, 0, 0.05)), (32, Z, Z)],
}, 32, True)

# Walk Cycle (Cute mascot waddle with alternating foot lift, body sway, and arm swing)
action('Walk', {
    'SWA_UPPER_LEG_L': [(1, (0.45, 0, 0), Z), (7, (0.10, 0, 0), Z), (13, (-0.40, 0, 0), Z), (19, (0.12, 0, 0), Z), (25, (0.45, 0, 0), Z)],
    'SWA_LOWER_LEG_L': [(1, (-0.10, 0, 0), Z), (7, (-0.45, 0, 0), Z), (13, (0.05, 0, 0), Z), (19, (-0.20, 0, 0), Z), (25, (-0.10, 0, 0), Z)],
    'SWA_FOOT_L': [(1, (-0.15, 0, 0), Z), (7, (-0.10, 0, 0), Z), (13, (0.30, 0, 0), Z), (19, (0.08, 0, 0), Z), (25, (-0.15, 0, 0), Z)],
    'SWA_UPPER_LEG_R': [(1, (-0.40, 0, 0), Z), (7, (0.12, 0, 0), Z), (13, (0.45, 0, 0), Z), (19, (0.10, 0, 0), Z), (25, (-0.40, 0, 0), Z)],
    'SWA_LOWER_LEG_R': [(1, (0.05, 0, 0), Z), (7, (-0.20, 0, 0), Z), (13, (-0.10, 0, 0), Z), (19, (-0.45, 0, 0), Z), (25, (0.05, 0, 0), Z)],
    'SWA_FOOT_R': [(1, (0.30, 0, 0), Z), (7, (0.08, 0, 0), Z), (13, (-0.15, 0, 0), Z), (19, (-0.10, 0, 0), Z), (25, (0.30, 0, 0), Z)],
    'SWA_PELVIS': [(1, Z, (0, 0, 0)), (7, (0, 0, 0.035), (0, 0, 0.020)), (13, Z, (0, 0, 0)), (19, (0, 0, -0.035), (0, 0, 0.020)), (25, Z, (0, 0, 0))],
    'SWA_UPPER_ARM_L': [(1, (-0.35, 0, 0), Z), (13, (0.35, 0, 0), Z), (25, (-0.35, 0, 0), Z)],
    'SWA_FOREARM_L': [(1, (0.15, 0, 0), Z), (13, (0.25, 0, 0), Z), (25, (0.15, 0, 0), Z)],
    'SWA_UPPER_ARM_R': [(1, (0.35, 0, 0), Z), (13, (-0.35, 0, 0), Z), (25, (0.35, 0, 0), Z)],
    'SWA_FOREARM_R': [(1, (0.25, 0, 0), Z), (13, (0.15, 0, 0), Z), (25, (0.25, 0, 0), Z)],
    'SWA_SPINE': [(1, Z, Z), (7, (0.02, 0, -0.025), Z), (13, Z, Z), (19, (0.02, 0, 0.025), Z), (25, Z, Z)],
}, 25, True)

# Run Cycle (Fast spirited mascot sprint)
action('Run', {
    'SWA_UPPER_LEG_L': [(1, (0.75, 0, 0), Z), (5, (0.15, 0, 0), Z), (9, (-0.55, 0, 0), Z), (13, (0.20, 0, 0), Z), (17, (0.75, 0, 0), Z)],
    'SWA_LOWER_LEG_L': [(1, (-0.12, 0, 0), Z), (5, (-0.75, 0, 0), Z), (9, (0.08, 0, 0), Z), (13, (-0.30, 0, 0), Z), (17, (-0.12, 0, 0), Z)],
    'SWA_FOOT_L': [(1, (-0.25, 0, 0), Z), (5, (-0.15, 0, 0), Z), (9, (0.45, 0, 0), Z), (13, (0.12, 0, 0), Z), (17, (-0.25, 0, 0), Z)],
    'SWA_UPPER_LEG_R': [(1, (-0.55, 0, 0), Z), (5, (0.20, 0, 0), Z), (9, (0.75, 0, 0), Z), (13, (0.15, 0, 0), Z), (17, (-0.55, 0, 0), Z)],
    'SWA_LOWER_LEG_R': [(1, (0.08, 0, 0), Z), (5, (-0.30, 0, 0), Z), (9, (-0.12, 0, 0), Z), (13, (-0.75, 0, 0), Z), (17, (0.08, 0, 0), Z)],
    'SWA_FOOT_R': [(1, (0.45, 0, 0), Z), (5, (0.12, 0, 0), Z), (9, (-0.25, 0, 0), Z), (13, (-0.15, 0, 0), Z), (17, (0.45, 0, 0), Z)],
    'SWA_PELVIS': [(1, (0.08, 0, 0), (0, 0, 0)), (5, (0.08, 0, 0.04), (0, 0, 0.04)), (9, (0.08, 0, 0), (0, 0, 0)), (13, (0.08, 0, -0.04), (0, 0, 0.04)), (17, (0.08, 0, 0), (0, 0, 0))],
    'SWA_UPPER_ARM_L': [(1, (-0.55, 0, 0), Z), (9, (0.55, 0, 0), Z), (17, (-0.55, 0, 0), Z)],
    'SWA_FOREARM_L': [(1, (0.30, 0, 0), Z), (9, (0.50, 0, 0), Z), (17, (0.30, 0, 0), Z)],
    'SWA_UPPER_ARM_R': [(1, (0.55, 0, 0), Z), (9, (-0.55, 0, 0), Z), (17, (0.55, 0, 0), Z)],
    'SWA_FOREARM_R': [(1, (0.50, 0, 0), Z), (9, (0.30, 0, 0), Z), (17, (0.50, 0, 0), Z)],
    'SWA_SPINE': [(1, (0.10, 0, 0), Z), (9, (0.10, 0, 0), (0, 0, 0.03)), (17, (0.10, 0, 0), Z)],
}, 17, True)

# Jump & Land
action('Jump', {
    'SWA_MASTER': [(1, Z, Z), (6, Z, (0, 0, -0.05)), (14, Z, (0, 0, 0.42)), (22, Z, (0, 0, 0.42)), (30, Z, Z)],
    'SWA_UPPER_ARM_L': [(1, Z, Z), (12, (0, 0, 1.1), Z), (24, (0, 0, 1.1), Z), (30, Z, Z)],
    'SWA_UPPER_ARM_R': [(1, Z, Z), (12, (0, 0, -1.1), Z), (24, (0, 0, -1.1), Z), (30, Z, Z)],
    'SWA_HAND_L': [(1, Z, Z), (12, (0, 0, 0.25), Z), (30, Z, Z)],
    'SWA_HAND_R': [(1, Z, Z), (12, (0, 0, -0.25), Z), (30, Z, Z)],
}, 30, False)

action('Land', {
    'SWA_MASTER': [(1, Z, (0, 0, 0.16)), (6, Z, (0, 0, -0.08)), (14, Z, Z)],
    'SWA_SPINE': [(1, Z, Z), (6, (0.14, 0, 0), Z), (14, Z, Z)],
    'SWA_LOWER_LEG_L': [(1, Z, Z), (6, (-0.22, 0, 0), Z), (14, Z, Z)],
    'SWA_LOWER_LEG_R': [(1, Z, Z), (6, (-0.22, 0, 0), Z), (14, Z, Z)],
}, 16, False)

# Turns
action('Turn_Left', {'SWA_MASTER': [(1, Z, Z), (10, (0, 0, 0.45), Z), (20, (0, 0, 0.90), Z)]}, 20, False)
action('Turn_Right', {'SWA_MASTER': [(1, Z, Z), (10, (0, 0, -0.45), Z), (20, (0, 0, -0.90), Z)]}, 20, False)

# Sit & Stand
action('Sit', {
    'SWA_MASTER': [(1, Z, Z), (16, Z, (0, 0, -0.28)), (32, Z, (0, 0, -0.28))],
    'SWA_PELVIS': [(1, Z, Z), (16, (-0.12, 0, 0), Z), (32, (-0.12, 0, 0), Z)],
    'SWA_UPPER_LEG_L': [(1, Z, Z), (16, (1.20, 0, 0), Z), (32, (1.20, 0, 0), Z)],
    'SWA_UPPER_LEG_R': [(1, Z, Z), (16, (1.20, 0, 0), Z), (32, (1.20, 0, 0), Z)],
    'SWA_LOWER_LEG_L': [(1, Z, Z), (16, (-1.20, 0, 0), Z), (32, (-1.20, 0, 0), Z)],
    'SWA_LOWER_LEG_R': [(1, Z, Z), (16, (-1.20, 0, 0), Z), (32, (-1.20, 0, 0), Z)],
    'SWA_UPPER_ARM_L': [(1, Z, Z), (16, (0.40, 0, 0), Z), (32, (0.40, 0, 0), Z)],
    'SWA_UPPER_ARM_R': [(1, Z, Z), (16, (0.40, 0, 0), Z), (32, (0.40, 0, 0), Z)],
}, 32, False)

action('Stand', {
    'SWA_MASTER': [(1, Z, (0, 0, -0.28)), (16, Z, Z)],
    'SWA_UPPER_LEG_L': [(1, (1.20, 0, 0), Z), (16, Z, Z)],
    'SWA_UPPER_LEG_R': [(1, (1.20, 0, 0), Z), (16, Z, Z)],
    'SWA_LOWER_LEG_L': [(1, (-1.20, 0, 0), Z), (16, Z, Z)],
    'SWA_LOWER_LEG_R': [(1, (-1.20, 0, 0), Z), (16, Z, Z)],
}, 20, False)

# Wave (Right Arm + Hand waving with open mascot mitten)
action('Wave', {
    'SWA_UPPER_ARM_R': [(1, Z, Z), (8, (0, 0, -1.25), Z), (24, (0, 0, -1.25), Z), (32, Z, Z)],
    'SWA_FOREARM_R': [(1, Z, Z), (8, (0, 0, -0.50), Z), (24, (0, 0, -0.50), Z), (32, Z, Z)],
    'SWA_HAND_R': [(1, Z, Z), (10, (0, 0, 0.40), Z), (18, (0, 0, -0.40), Z), (26, (0, 0, 0.40), Z), (32, Z, Z)],
    'SWA_THUMB_01_R': [(1, Z, Z), (8, (0, -0.30, 0), Z), (24, (0, -0.30, 0), Z), (32, Z, Z)],
    'SWA_HEAD': [(1, Z, Z), (12, (0, -0.08, -0.05), Z), (28, (0, -0.08, -0.05), Z), (32, Z, Z)],
}, 32, True)

# Point (Arm forward, thumb resting)
action('Point', {
    'SWA_UPPER_ARM_R': [(1, Z, Z), (8, (0.80, 0, -0.30), Z), (24, (0.80, 0, -0.30), Z), (32, Z, Z)],
    'SWA_FOREARM_R': [(1, Z, Z), (8, (0.30, 0, 0), Z), (24, (0.30, 0, 0), Z), (32, Z, Z)],
    'SWA_HAND_R': [(1, Z, Z), (8, (0, 0, 0), Z), (24, (0, 0, 0), Z), (32, Z, Z)],
    'SWA_THUMB_01_R': [(1, Z, Z), (8, (0.40, 0, 0), Z), (24, (0.40, 0, 0), Z), (32, Z, Z)],
}, 32, False)

# Thumbs Up (Thumb points up, hand raised)
action('Thumbs_Up', {
    'SWA_UPPER_ARM_R': [(1, Z, Z), (8, (0.60, 0, -0.25), Z), (24, (0.60, 0, -0.25), Z), (32, Z, Z)],
    'SWA_FOREARM_R': [(1, Z, Z), (8, (0.55, 0, 0), Z), (24, (0.55, 0, 0), Z), (32, Z, Z)],
    'SWA_HAND_R': [(1, Z, Z), (8, (0, 1.15, 0), Z), (24, (0, 1.15, 0), Z), (32, Z, Z)],
    'SWA_THUMB_01_R': [(1, Z, Z), (8, (-0.55, 0, 0), Z), (24, (-0.55, 0, 0), Z), (32, Z, Z)],
    'SWA_THUMB_02_R': [(1, Z, Z), (8, (-0.45, 0, 0), Z), (24, (-0.45, 0, 0), Z), (32, Z, Z)],
    'SWA_HEAD': [(1, Z, Z), (12, (0.06, 0, 0.04), Z), (24, (0.06, 0, 0.04), Z), (32, Z, Z)],
}, 32, False)

# Thumbs Down
action('Thumbs_Down', {
    'SWA_UPPER_ARM_R': [(1, Z, Z), (8, (0.60, 0, -0.25), Z), (24, (0.60, 0, -0.25), Z), (32, Z, Z)],
    'SWA_FOREARM_R': [(1, Z, Z), (8, (0.55, 0, 0), Z), (24, (0.55, 0, 0), Z), (32, Z, Z)],
    'SWA_HAND_R': [(1, Z, Z), (8, (0, -1.15, 0), Z), (24, (0, -1.15, 0), Z), (32, Z, Z)],
    'SWA_THUMB_01_R': [(1, Z, Z), (8, (0.55, 0, 0), Z), (24, (0.55, 0, 0), Z), (32, Z, Z)],
    'SWA_HEAD': [(1, Z, Z), (12, (-0.06, 0, 0.04), Z), (24, (-0.06, 0, 0.04), Z), (32, Z, Z)],
}, 32, False)

# Clap (Both hands meeting in front of chest)
action('Clap', {
    'SWA_UPPER_ARM_L': [(1, (0.40, 0, -0.60), Z), (8, (0.40, 0, -0.80), Z), (16, (0.40, 0, -0.60), Z), (24, (0.40, 0, -0.80), Z), (32, (0.40, 0, -0.60), Z)],
    'SWA_UPPER_ARM_R': [(1, (0.40, 0, 0.60), Z), (8, (0.40, 0, 0.80), Z), (16, (0.40, 0, 0.60), Z), (24, (0.40, 0, 0.80), Z), (32, (0.40, 0, 0.60), Z)],
    'SWA_FOREARM_L': [(1, (0.30, 0, 0), Z), (8, (0.40, 0, 0), Z), (16, (0.30, 0, 0), Z), (24, (0.40, 0, 0), Z), (32, (0.30, 0, 0), Z)],
    'SWA_FOREARM_R': [(1, (0.30, 0, 0), Z), (8, (0.40, 0, 0), Z), (16, (0.30, 0, 0), Z), (24, (0.40, 0, 0), Z), (32, (0.30, 0, 0), Z)],
}, 32, True)

# Heart Gesture (Both hands meeting in front of chest forming heart)
action('Heart_Gesture', {
    'SWA_UPPER_ARM_L': [(1, Z, Z), (10, (0.50, 0, -0.70), Z), (24, (0.50, 0, -0.70), Z), (32, Z, Z)],
    'SWA_UPPER_ARM_R': [(1, Z, Z), (10, (0.50, 0, 0.70), Z), (24, (0.50, 0, 0.70), Z), (32, Z, Z)],
    'SWA_FOREARM_L': [(1, Z, Z), (10, (0.35, 0, 0.25), Z), (24, (0.35, 0, 0.25), Z), (32, Z, Z)],
    'SWA_FOREARM_R': [(1, Z, Z), (10, (0.35, 0, -0.25), Z), (24, (0.35, 0, -0.25), Z), (32, Z, Z)],
    'SWA_HAND_L': [(1, Z, Z), (10, (0, 0.25, 0), Z), (24, (0, 0.25, 0), Z), (32, Z, Z)],
    'SWA_HAND_R': [(1, Z, Z), (10, (0, -0.25, 0), Z), (24, (0, -0.25, 0), Z), (32, Z, Z)],
}, 32, False)

# Think (Elbow bent, hand to cheek)
action('Think', {
    'SWA_UPPER_ARM_R': [(1, Z, Z), (8, (0.70, 0, -0.50), Z), (24, (0.70, 0, -0.50), Z), (32, Z, Z)],
    'SWA_FOREARM_R': [(1, Z, Z), (8, (0.80, 0, 0.30), Z), (24, (0.80, 0, 0.30), Z), (32, Z, Z)],
    'SWA_HAND_R': [(1, Z, Z), (8, (0, 0, 0.20), Z), (24, (0, 0, 0.20), Z), (32, Z, Z)],
    'SWA_HEAD': [(1, Z, Z), (8, (0.05, 0.10, 0.06), Z), (24, (0.05, 0.10, 0.06), Z), (32, Z, Z)],
}, 32, False)

# Celebrate / Cheer (Both arms raised high in triumphant V)
action('Celebrate', {
    'SWA_UPPER_ARM_L': [(1, Z, Z), (8, (0, 0, 1.35), Z), (24, (0, 0, 1.35), Z), (32, Z, Z)],
    'SWA_UPPER_ARM_R': [(1, Z, Z), (8, (0, 0, -1.35), Z), (24, (0, 0, -1.35), Z), (32, Z, Z)],
    'SWA_FOREARM_L': [(1, Z, Z), (8, (0, 0, 0.25), Z), (24, (0, 0, 0.25), Z), (32, Z, Z)],
    'SWA_FOREARM_R': [(1, Z, Z), (8, (0, 0, -0.25), Z), (24, (0, 0, -0.25), Z), (32, Z, Z)],
    'SWA_HEAD': [(1, Z, Z), (8, (0.12, 0, 0), Z), (24, (0.12, 0, 0), Z), (32, Z, Z)],
    'SWA_SPINE': [(1, Z, Z), (8, (0, 0, 0), (0, 0, 0.035)), (24, (0, 0, 0), (0, 0, 0.035)), (32, Z, Z)],
}, 32, True)

# Greet & Goodbye
action('Greet', {
    'SWA_UPPER_ARM_R': [(1, Z, Z), (8, (0, 0, -1.05), Z), (24, (0, 0, -1.05), Z), (32, Z, Z)],
    'SWA_FOREARM_R': [(1, Z, Z), (8, (0, 0, -0.30), Z), (24, (0, 0, -0.30), Z), (32, Z, Z)],
    'SWA_SPINE': [(1, Z, Z), (12, (0.10, 0, 0), Z), (22, (0.10, 0, 0), Z), (32, Z, Z)],
    'SWA_HEAD': [(1, Z, Z), (12, (0.08, 0, 0), Z), (22, (0.08, 0, 0), Z), (32, Z, Z)],
}, 32, False)

action('Goodbye', {
    'SWA_UPPER_ARM_R': [(1, Z, Z), (8, (0, 0, -1.25), Z), (24, (0, 0, -1.25), Z), (32, Z, Z)],
    'SWA_FOREARM_R': [(1, Z, Z), (8, (0, 0, -0.40), Z), (24, (0, 0, -0.40), Z), (32, Z, Z)],
    'SWA_HAND_R': [(1, Z, Z), (10, (0, 0, 0.35), Z), (18, (0, 0, -0.35), Z), (26, (0, 0, 0.35), Z), (32, Z, Z)],
}, 32, False)

# Dance (Rhythmic bounce and arm groove)
action('Dance', {
    'SWA_MASTER': [(1, Z, Z), (8, Z, (0, 0, 0.05)), (16, Z, Z), (24, Z, (0, 0, 0.05)), (32, Z, Z)],
    'SWA_PELVIS': [(1, (0, 0.10, 0), Z), (16, (0, -0.10, 0), Z), (32, (0, 0.10, 0), Z)],
    'SWA_UPPER_ARM_L': [(1, (0, 0, 0.75), Z), (16, (0, 0, 0.20), Z), (32, (0, 0, 0.75), Z)],
    'SWA_UPPER_ARM_R': [(1, (0, 0, -0.20), Z), (16, (0, 0, -0.75), Z), (32, (0, 0, -0.20), Z)],
}, 32, True)

# Sleep (Gentle resting curl)
action('Sleep', {
    'SWA_MASTER': [(1, Z, (0, 0, -0.16)), (32, Z, (0, 0, -0.16))],
    'SWA_SPINE': [(1, (0.15, 0, 0), Z), (32, (0.15, 0, 0), Z)],
    'SWA_HEAD': [(1, (0.22, 0.06, 0), Z), (16, (0.25, 0.06, 0), Z), (32, (0.22, 0.06, 0), Z)],
    'SWA_UPPER_ARM_L': [(1, (0.30, 0, 0), Z), (32, (0.30, 0, 0), Z)],
    'SWA_UPPER_ARM_R': [(1, (0.30, 0, 0), Z), (32, (0.30, 0, 0), Z)],
}, 32, True)

# Reactions & Emotions
action('Surprised_Reaction', {
    'SWA_MASTER': [(1, Z, Z), (6, Z, (0, 0.08, 0.12)), (18, Z, Z)],
    'SWA_SPINE': [(1, Z, Z), (6, (-0.15, 0, 0), Z), (18, Z, Z)],
    'SWA_UPPER_ARM_L': [(1, Z, Z), (6, (0, 0, 0.85), Z), (18, Z, Z)],
    'SWA_UPPER_ARM_R': [(1, Z, Z), (6, (0, 0, -0.85), Z), (18, Z, Z)],
}, 24, False)

action('Disappointed_Reaction', {
    'SWA_SPINE': [(1, Z, Z), (10, (0.18, 0, 0), Z), (24, (0.18, 0, 0), Z), (32, Z, Z)],
    'SWA_HEAD': [(1, Z, Z), (10, (0.20, 0, 0), Z), (24, (0.20, 0, 0), Z), (32, Z, Z)],
    'SWA_UPPER_ARM_L': [(1, Z, Z), (10, (0.12, 0, 0), Z), (24, (0.12, 0, 0), Z), (32, Z, Z)],
    'SWA_UPPER_ARM_R': [(1, Z, Z), (10, (0.12, 0, 0), Z), (24, (0.12, 0, 0), Z), (32, Z, Z)],
}, 32, False)

action('Happy_Reaction', {
    'SWA_MASTER': [(1, Z, Z), (8, Z, (0, 0, 0.18)), (16, Z, Z), (24, Z, (0, 0, 0.18)), (32, Z, Z)],
    'SWA_UPPER_ARM_L': [(1, Z, Z), (8, (0, 0, 0.95), Z), (16, Z, Z), (24, (0, 0, 0.95), Z), (32, Z, Z)],
    'SWA_UPPER_ARM_R': [(1, Z, Z), (8, (0, 0, -0.95), Z), (16, Z, Z), (24, (0, 0, -0.95), Z), (32, Z, Z)],
    'SWA_HEAD': [(1, Z, Z), (8, (0.10, 0, 0), Z), (16, Z, Z), (24, (0.10, 0, 0), Z), (32, Z, Z)],
}, 32, False)

# Emotion Clips
for nm in ['Happy', 'Sad', 'Surprised', 'Angry', 'Thinking', 'Confused', 'Excited', 'Proud', 'Worried', 'Very_Happy', 'Wink', 'Shy']:
    action('Emotion_' + nm, {
        'SWA_SPINE': [(1, Z, Z), (16, (0.01, 0, 0), Z), (32, Z, Z)],
        'SWA_HEAD': [(1, Z, Z), (16, (0.02, 0, 0), Z), (32, Z, Z)],
    }, 32, True)

# 12. THREE-POINT HERO LIGHTING & PRODUCTION CAMERAS
def add_light(name, ltype, loc, energy, color, size=0.5):
    ldata = bpy.data.lights.new(name=name, type=ltype)
    ldata.energy = energy
    ldata.color = color
    if ltype == 'AREA':
        ldata.size = size
    lobj = bpy.data.objects.new(name=name, object_data=ldata)
    lobj.location = loc
    colls['SWA_LIGHTING'].objects.link(lobj)
    return lobj

# Key light
add_light('SWA_KeyLight', 'AREA', (2.5, -3.8, 3.2), 220.0, (1.0, 0.98, 0.95), size=2.0)
# Fill light
add_light('SWA_FillLight', 'AREA', (-3.0, -2.8, 2.0), 90.0, (0.88, 0.94, 1.0), size=2.5)
# Rim/Back light
add_light('SWA_RimLight', 'AREA', (0.0, 3.5, 2.8), 260.0, (0.92, 0.96, 1.0), size=2.0)
# Soft bounce light
add_light('SWA_BounceLight', 'AREA', (0.0, -1.0, -0.5), 35.0, (0.95, 0.98, 1.0), size=3.0)

# Production Cameras
cam_data = bpy.data.cameras.new('SWA_HeroCameraData')
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 2.15
cam = bpy.data.objects.new('SWA_HeroCamera', cam_data)
colls['SWA_CAMERA'].objects.link(cam)
scene.camera = cam

def reset_to_neutral():
    if mesh.data.shape_keys:
        for kb in mesh.data.shape_keys.key_blocks:
            kb.value = 0.0
    for pb in arm.pose.bones:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
    arm.animation_data.action = None

scene.frame_start = 1
scene.frame_end = 32
scene.frame_set(1)
scene['Character'] = 'SWA Production mascot with seamless mitten hands and compact cuddly proportions'

# 13. EXPORT PRODUCTION GLB
bpy.ops.object.select_all(action='DESELECT')
mesh.select_set(True)
arm.select_set(True)
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

# Copy directly to swa.glb so all scenes instantly receive the updated mascot
swa_glb_path = os.path.join(OUT, 'swa.glb')
shutil.copyfile(glb_path, swa_glb_path)
print("SYNCED_TO_SWA_GLB", swa_glb_path)

reset_to_neutral()

# 14. RENDER MASTER TURNAROUND VIEWS
views = {
    'front': (Vector((0, -6.5, 0.88)), Vector((0, 0, 0.88)), 2.15),
    'side': (Vector((6.5, 0, 0.88)), Vector((0, 0, 0.88)), 2.15),
    'three_quarter': (Vector((4.5, -4.5, 1.05)), Vector((0, 0, 0.88)), 2.15),
    'back': (Vector((0, 6.5, 0.88)), Vector((0, 0, 0.88)), 2.15),
}

for name, (eye, target, scale) in views.items():
    cam.location = eye
    direction = target - eye
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    cam_data.ortho_scale = scale
    img_path = os.path.join(PRE, f'swa_master_{name}.png')
    scene.render.filepath = img_path
    bpy.ops.render.render(write_still=True)
    print(f'VIEW_RENDERED_{name}')

# 15. RENDER EXPRESSION SHOWCASE
cam.location = (0, -4.5, 1.24)
cam.rotation_euler = (Vector((0, 0, 1.24)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam_data.ortho_scale = 1.15

expressions = {
    'neutral': {'keys': {}, 'head': (0, 0, 0)},
    'happy': {'keys': {'happy': 1.0}, 'head': (math.radians(4), 0, math.radians(2))},
    'very_happy': {'keys': {'very_happy': 1.0}, 'head': (math.radians(8), 0, math.radians(3))},
    'sad': {'keys': {'sad': 1.0}, 'head': (math.radians(-6), 0, math.radians(-2))},
    'angry': {'keys': {'angry': 1.0}, 'head': (math.radians(-6), 0, 0)},
    'surprised': {'keys': {'surprised': 1.0}, 'head': (math.radians(8), 0, 0)},
    'confused': {'keys': {'confused': 1.0}, 'head': (0, math.radians(6), math.radians(-4))},
    'shy': {'keys': {'shy': 1.0}, 'head': (math.radians(-4), math.radians(-4), math.radians(-6))},
    'sleepy': {'keys': {'sleepy': 1.0}, 'head': (math.radians(-8), math.radians(3), 0)},
    'thinking': {'keys': {'thinking': 1.0}, 'head': (math.radians(4), math.radians(6), math.radians(5))},
    'excited': {'keys': {'excited': 1.0}, 'head': (math.radians(6), math.radians(-2), math.radians(-3))},
    'laughing': {'keys': {'laugh': 1.0}, 'head': (math.radians(8), 0, math.radians(-2))},
    'crying': {'keys': {'crying': 1.0}, 'head': (math.radians(-8), math.radians(2), 0)},
    'proud': {'keys': {'proud': 1.0}, 'head': (math.radians(6), math.radians(-4), math.radians(-3))},
    'wink': {'keys': {'wink': 1.0}, 'head': (0, math.radians(-4), math.radians(-5))}
}

keys = mesh.data.shape_keys.key_blocks
pb_head = arm.pose.bones.get('SWA_HEAD')

for label, cfg in expressions.items():
    reset_to_neutral()
    if pb_head:
        pb_head.rotation_euler = cfg.get('head', (0, 0, 0))
    for name, val in cfg.get('keys', {}).items():
        if name in keys:
            keys[name].value = val
    bpy.context.view_layer.update()
    img_path = os.path.join(PRE, f'swa_expression_{label}.png')
    scene.render.filepath = img_path
    bpy.ops.render.render(write_still=True)
    print(f'EXPRESSION_RENDERED_{label}')
    if label == 'wink':
        alt_path = os.path.join(PRE, 'swa_expression_winking.png')
        scene.render.filepath = alt_path
        bpy.ops.render.render(write_still=True)

reset_to_neutral()

# 16. RESTORE HERO VIEW & SAVE MASTER BLEND
cam.location = (0, -6.5, 0.88)
cam.rotation_euler = (Vector((0, 0, 0.88)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam_data.ortho_scale = 2.15
scene.render.resolution_x = 900
scene.render.resolution_y = 900

master_blend = os.path.join(SRC, 'swa_master.blend')
bpy.ops.wm.save_as_mainfile(filepath=master_blend)
print("SAVED_MASTER_BLEND", master_blend)
print("BUILD_SWA_MASTER_DONE")
