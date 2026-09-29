import bpy, math, os
from mathutils import Vector, Euler, Matrix

# Clear existing objects
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for c in list(bpy.data.collections):
    if c.name == 'Collection':
        bpy.data.collections.remove(c)

# Setup scene settings
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'AgX'

# Collections
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

# Materials
def create_pbr_material(name, base_color, roughness=0.38, specular=0.5, sss=0.0, sss_color=(1, 0.8, 0.7)):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*base_color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = specular
    if 'Subsurface Weight' in bsdf.inputs:
        bsdf.inputs['Subsurface Weight'].default_value = sss
        if 'Subsurface Radius' in bsdf.inputs:
            bsdf.inputs['Subsurface Radius'].default_value = sss_color
        if 'Subsurface Scale' in bsdf.inputs:
            bsdf.inputs['Subsurface Scale'].default_value = 0.05
    return mat

# Body material: soft white satin with warm subsurface scattering
bodymat = create_pbr_material('SWA_Porcelain_Satin', (0.97, 0.98, 1.0), roughness=0.38, specular=0.48, sss=0.08)

# Dark glossy eyes (#2D2D3A -> sRGB 0.176, 0.176, 0.227 -> linear ~ 0.026, 0.026, 0.043)
darkmat = create_pbr_material('SWA_Glossy_Eyes', (0.026, 0.026, 0.043), roughness=0.09, specular=0.9)

# Eye catchlight (bright white)
glintmat = create_pbr_material('SWA_Eye_Glint', (1.0, 1.0, 1.0), roughness=0.05, specular=1.0)
glint_bsdf = glintmat.node_tree.nodes.get('Principled BSDF')
if 'Emission Color' in glint_bsdf.inputs:
    glint_bsdf.inputs['Emission Color'].default_value = (1.0, 1.0, 1.0, 1.0)
    glint_bsdf.inputs['Emission Strength'].default_value = 0.3

# Mouth materials
mouth_dark = create_pbr_material('SWA_Mouth_Cavity', (0.12, 0.02, 0.04), roughness=0.3, specular=0.5)
mouth_tongue = create_pbr_material('SWA_Mouth_Tongue', (0.95, 0.25, 0.38), roughness=0.35, specular=0.5)

# Blush material (soft translucent pink #FFB6C1 -> linear 1.0, 0.46, 0.53)
blushmat = bpy.data.materials.new('SWA_Blush_Material')
blushmat.use_nodes = True
blush_bsdf = blushmat.node_tree.nodes.get('Principled BSDF')
blush_bsdf.inputs['Base Color'].default_value = (1.0, 0.46, 0.53, 1.0)
blush_bsdf.inputs['Roughness'].default_value = 0.65
if 'Alpha' in blush_bsdf.inputs:
    blush_bsdf.inputs['Alpha'].default_value = 0.75
blushmat.blend_method = 'BLEND' if hasattr(blushmat, 'blend_method') else 'HASHED'

parts = []

# Catmull-Rom spline interpolation
def catmull_rom(p0, p1, p2, p3, t):
    t2 = t * t
    t3 = t2 * t
    return 0.5 * (
        (2 * p1) +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    )

# 1. BODY
# Control points: (z, rx, ry, cy)
ctrl_pts = [
    (0.20, 0.02, 0.02,  0.00),
    (0.22, 0.05, 0.05,  0.00),
    (0.28, 0.32, 0.30, -0.01),
    (0.42, 0.52, 0.48, -0.02),
    (0.65, 0.64, 0.58, -0.025),
    (0.90, 0.67, 0.60, -0.03),  # belly max
    (1.15, 0.66, 0.59, -0.025),
    (1.38, 0.64, 0.57, -0.02),  # shoulder/chest
    (1.56, 0.57, 0.52, -0.01),  # head/face
    (1.70, 0.46, 0.43,  0.00),  # forehead
    (1.80, 0.26, 0.25,  0.00),  # crown dome
    (1.84, 0.05, 0.05,  0.00),  # top cap
    (1.86, 0.02, 0.02,  0.00),
]

n = len(ctrl_pts)
num_rings = 48
sides = 48
body_verts = []
body_faces = []

sampled_rings = []
for i in range(num_rings):
    t_global = i / (num_rings - 1) * (n - 3)
    idx = int(t_global) + 1
    if idx > n - 3:
        idx = n - 3
        t = 1.0
    else:
        t = t_global - int(t_global)
    p0, p1, p2, p3 = ctrl_pts[idx - 1], ctrl_pts[idx], ctrl_pts[idx + 1], ctrl_pts[idx + 2]
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
body_verts.append((0, 0, ctrl_pts[1][0]))
for j in range(sides):
    body_faces.append((bp_idx, (j + 1) % sides, j))

tp_idx = len(body_verts)
body_verts.append((0, 0, ctrl_pts[-2][0]))
top_ring_start = (num_rings - 1) * sides
for j in range(sides):
    body_faces.append((tp_idx, top_ring_start + j, top_ring_start + (j + 1) % sides))

body_mesh = bpy.data.meshes.new("SWA_Body")
body_mesh.from_pydata(body_verts, [], body_faces)
body_mesh.materials.append(bodymat)
body_mesh.update()
for p in body_mesh.polygons:
    p.use_smooth = True

body_obj = bpy.data.objects.new("SWA_Body", body_mesh)
colls['SWA_CHARACTER'].objects.link(body_obj)
parts.append(body_obj)

# Helper for UV spheres
def add_uv_sphere(name, loc, scale, mat, rot=(0, 0, 0), seg=24, rings=16, group='SWA_CHARACTER'):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = True
    move(o, group)
    parts.append(o)
    return o

# Helper for curved tubes (e.g. antenna, arms)
def add_bezier_tube(name, pts, rad, mat, group='SWA_CHARACTER'):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.resolution_u = 12
    cu.bevel_depth = rad
    cu.bevel_resolution = 4
    s = cu.splines.new('BEZIER')
    s.bezier_points.add(len(pts) - 1)
    for b, p in zip(s.bezier_points, pts):
        b.co = p
        b.handle_left_type = 'AUTO'
        b.handle_right_type = 'AUTO'
    o = bpy.data.objects.new(name, cu)
    colls[group].objects.link(o)
    o.data.materials.append(mat)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object
    o.select_set(False)
    for p in o.data.polygons:
        p.use_smooth = True
    parts.append(o)
    return o

# 2. ANTENNA
antenna_pts = [
    Vector((0, 0.00, 1.84)),
    Vector((0, 0.01, 1.95)),
    Vector((0, 0.05, 2.06)),
    Vector((0, 0.09, 2.15)),
    Vector((0, 0.07, 2.22)),
    Vector((0, 0.04, 2.24)),
]
add_bezier_tube('SWA_Antenna', antenna_pts, 0.040, bodymat)
add_uv_sphere('SWA_Antenna_Tip', (0, 0.04, 2.24), (0.045, 0.045, 0.045), bodymat)

# 3. LEGS & FEET
for s, side in [(-1, 'L'), (1, 'R')]:
    # Leg cylinder/capsule
    add_uv_sphere(f'SWA_Leg_{side}', (s * 0.28, -0.02, 0.18), (0.13, 0.13, 0.10), bodymat)
    # Foot: cute rounded loaf, angled outward ~12 degrees
    rot_z = math.radians(-12 * s)
    add_uv_sphere(f'SWA_Foot_{side}', (s * 0.28, -0.06, 0.06), (0.13, 0.20, 0.065), bodymat, rot=(0, 0, rot_z))

# 4. ARMS & HANDS
for s, side in [(-1, 'L'), (1, 'R')]:
    # Upper arm
    add_uv_sphere(f'SWA_Arm_{side}', (s * 0.65, -0.03, 1.05), (0.13, 0.14, 0.24), bodymat, rot=(0, math.radians(s * 10), 0))
    # Forearm & mitten hand
    add_uv_sphere(f'SWA_Hand_{side}', (s * 0.70, -0.05, 0.80), (0.115, 0.12, 0.15), bodymat, rot=(0, math.radians(s * 8), 0))
    # Tiny cute thumb nub (pointing forward-inward)
    add_uv_sphere(f'SWA_Thumb_{side}', (s * 0.63, -0.13, 0.78), (0.045, 0.05, 0.05), bodymat)

# 5. FACE FEATURES
# Eyes: large expressive dark glossy rounded ovals
for s, side in [(-1, 'L'), (1, 'R')]:
    # Eye: placed on head surface at Z=1.38, Y=-0.58
    eye_x = s * 0.23
    eye_z = 1.38
    eye_y = -0.58
    add_uv_sphere(f'SWA_Eye_{side}', (eye_x, eye_y, eye_z), (0.065, 0.030, 0.080), darkmat, group='SWA_FACE')
    # Glint: crisp white highlight at top-left
    glint_x = eye_x - 0.022
    glint_z = eye_z + 0.028
    glint_y = eye_y - 0.022
    add_uv_sphere(f'SWA_Glint_{side}', (glint_x, glint_y, glint_z), (0.022, 0.015, 0.024), glintmat, group='SWA_FACE')
    # Blush: soft pink blush disc under eye
    blush_x = s * 0.33
    blush_z = 1.25
    blush_y = -0.56
    add_uv_sphere(f'SWA_Cheek_{side}', (blush_x, blush_y, blush_z), (0.11, 0.015, 0.075), blushmat, group='SWA_FACE')
    # Eyebrow: subtle small dark accent
    brow_x = s * 0.23
    brow_z = 1.50
    brow_y = -0.55
    add_uv_sphere(f'SWA_Brow_{side}', (brow_x, brow_y, brow_z), (0.040, 0.012, 0.016), darkmat, group='SWA_FACE')

# Mouth: small integrated open D-shape smile
add_uv_sphere('SWA_Mouth', (0, -0.605, 1.27), (0.065, 0.020, 0.040), mouth_dark, group='SWA_FACE')
add_uv_sphere('SWA_MouthTongue', (0, -0.612, 1.255), (0.042, 0.012, 0.020), mouth_tongue, group='SWA_FACE')

# Lighting setup matching premium mascot studio
def area_light(name, loc, target, energy, size, color=(1, 1, 1)):
    d = bpy.data.lights.new(name, 'AREA')
    d.energy = energy
    d.shape = 'DISK'
    d.size = size
    d.color = color
    o = bpy.data.objects.new(name, d)
    colls['SWA_LIGHTING'].objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - o.location).to_track_quat('-Z', 'Y').to_euler()
    return o

# Soft studio 3-point lighting
area_light('SWA_Key_Softbox', (-3.0, -4.5, 3.5), (0, 0, 1.1), 380, 3.5, (1.0, 0.94, 0.90))
area_light('SWA_Fill', (3.5, -3.5, 2.5), (0, 0, 1.1), 180, 3.0, (0.88, 0.92, 1.0))
area_light('SWA_Rim', (0.5, 3.5, 3.2), (0, 0, 1.2), 320, 2.5, (0.92, 0.94, 1.0))
area_light('SWA_Top', (0, -0.5, 4.5), (0, 0, 1.1), 120, 3.0, (1.0, 1.0, 1.0))

# World background
scene.world.use_nodes = True
bg = scene.world.node_tree.nodes.get('Background')
bg.inputs['Color'].default_value = (0.88, 0.90, 0.94, 1.0)
bg.inputs['Strength'].default_value = 0.9

# Studio ground plane
groundmat = create_pbr_material('SWA_Studio_Floor', (0.88, 0.90, 0.94), roughness=0.7)
bpy.ops.mesh.primitive_plane_add(size=100, location=(0, 0, 0))
ground = move(bpy.context.object, 'SWA_LIGHTING')
ground.name = 'SWA_Studio_Ground'
ground.data.materials.append(groundmat)

# Camera
cam_data = bpy.data.cameras.new('SWA_Hero_Camera')
cam = bpy.data.objects.new('SWA_Hero_Camera', cam_data)
colls['SWA_CAMERA'].objects.link(cam)
scene.camera = cam
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 2.65

# Render turnaround views: front, side, back, three_quarter
pre_dir = '/home/ameetech/Desktop/preplyx2026/game/assets/swa/previews'
views = [
    ('front', (0, -7, 1.1)),
    ('side', (7, 0, 1.1)),
    ('back', (0, 7, 1.1)),
    ('three_quarter', (3.5, -6.5, 1.3)),
]

for label, pos in views:
    cam.location = pos
    cam.rotation_euler = (Vector((0, 0, 1.1)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(pre_dir, f'test_swa_v2_{label}.png')
    bpy.ops.render.render(write_still=True)
    print(f'RENDERED {label}')

print("TEST_SWA_V2_COMPLETE")
