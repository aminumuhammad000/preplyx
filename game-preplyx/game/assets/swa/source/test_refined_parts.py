import bpy, math, os
from mathutils import Vector, Euler, Matrix

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

def catmull_rom(p0, p1, p2, p3, t):
    t2 = t * t
    t3 = t2 * t
    return 0.5 * (
        (2 * p1) +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    )

# 1. BODY - Elongated cute capsule/egg matching turnaround
# Height: Z=0.22 to Z=1.92 (height = 1.70). Max width = 1.28. Ratio = 1.33.
body_ctrl = [
    (0.20, 0.02, 0.02,  0.00),
    (0.22, 0.06, 0.06,  0.00),  # bottom cap
    (0.30, 0.36, 0.34, -0.01),
    (0.48, 0.54, 0.50, -0.02),
    (0.75, 0.64, 0.58, -0.025), # lower belly
    (1.05, 0.65, 0.58, -0.025), # mid belly
    (1.35, 0.63, 0.56, -0.02),  # chest
    (1.60, 0.58, 0.52, -0.01),  # face level
    (1.78, 0.48, 0.44,  0.00),  # forehead
    (1.88, 0.30, 0.28,  0.00),  # crown dome
    (1.92, 0.06, 0.06,  0.00),  # top cap
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

body_mesh = bpy.data.meshes.new("SWA_Body")
body_mesh.from_pydata(body_verts, [], body_faces)
body_mesh.update()
for p in body_mesh.polygons:
    p.use_smooth = True
body_obj = bpy.data.objects.new("SWA_Body", body_mesh)
bpy.context.collection.objects.link(body_obj)

# 2. SEAMLESS ORGANIC ARMS
def create_arm(side_sign, side_name):
    # Curve path from shoulder down to hand
    # Shoulder: (s*0.54, -0.02, 1.32)
    # Upper arm: (s*0.64, -0.02, 1.15)
    # Elbow: (s*0.68, -0.03, 0.98)
    # Forearm: (s*0.69, -0.04, 0.85)
    # Wrist: (s*0.69, -0.04, 0.74)
    # Hand tip: (s*0.68, -0.04, 0.65)
    arm_ctrl = [
        # (pos, rx, ry)
        (Vector((side_sign * 0.50, -0.02, 1.34)), 0.15, 0.16), # embedded in torso
        (Vector((side_sign * 0.58, -0.02, 1.25)), 0.14, 0.15), # shoulder
        (Vector((side_sign * 0.65, -0.025, 1.10)), 0.13, 0.14),# upper arm
        (Vector((side_sign * 0.68, -0.035, 0.95)), 0.12, 0.13),# elbow
        (Vector((side_sign * 0.69, -0.045, 0.82)), 0.115, 0.125),# wrist/palm
        (Vector((side_sign * 0.68, -0.05, 0.70)), 0.10, 0.11), # hand
        (Vector((side_sign * 0.67, -0.05, 0.64)), 0.02, 0.02), # tip cap
    ]
    arm_rings = 16
    arm_sides = 16
    arm_verts = []
    arm_faces = []
    
    # interpolate spine
    sampled = []
    for i in range(arm_rings):
        t = i / (arm_rings - 1) * (len(arm_ctrl) - 1)
        k = int(t)
        f = t - k
        if k >= len(arm_ctrl) - 1:
            k = len(arm_ctrl) - 2
            f = 1.0
        # linear / smoothstep
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

    # Close tip cap
    tip_idx = len(arm_verts)
    arm_verts.append(sampled[-1][0])
    last_ring = (arm_rings - 1) * arm_sides
    for j in range(arm_sides):
        arm_faces.append((tip_idx, last_ring + j, last_ring + (j + 1) % arm_sides))

    ame = bpy.data.meshes.new(f"SWA_ArmMesh_{side_name}")
    ame.from_pydata(arm_verts, [], arm_faces)
    ame.update()
    for p in ame.polygons:
        p.use_smooth = True
    ao = bpy.data.objects.new(f"SWA_Arm_{side_name}", ame)
    bpy.context.collection.objects.link(ao)
    
    # Thumb nub
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=16, ring_count=12,
        location=(side_sign * 0.63, -0.10, 0.74)
    )
    to = bpy.context.object
    to.name = f"SWA_Thumb_{side_name}"
    to.scale = (0.045, 0.055, 0.045)
    bpy.ops.object.transform_apply(scale=True)
    for p in to.data.polygons:
        p.use_smooth = True
    return ao, to

create_arm(-1, 'L')
create_arm(1, 'R')

# 3. ANTENNA - Organic curved sprout
antenna_pts = [
    Vector((0, 0.00, 1.92)),
    Vector((0, 0.01, 2.02)),
    Vector((0, 0.05, 2.12)),
    Vector((0, 0.08, 2.20)),
    Vector((0, 0.06, 2.26)),
    Vector((0, 0.03, 2.28)),
]
cu = bpy.data.curves.new('AntennaCurve', 'CURVE')
cu.dimensions = '3D'
cu.resolution_u = 16
cu.bevel_depth = 0.038
cu.bevel_resolution = 4
s = cu.splines.new('BEZIER')
s.bezier_points.add(len(antenna_pts) - 1)
for b, p in zip(s.bezier_points, antenna_pts):
    b.co = p
    b.handle_left_type = 'AUTO'
    b.handle_right_type = 'AUTO'
ao = bpy.data.objects.new('SWA_Antenna', cu)
bpy.context.collection.objects.link(ao)
bpy.context.view_layer.objects.active = ao
ao.select_set(True)
bpy.ops.object.convert(target='MESH')
ao = bpy.context.object
for p in ao.data.polygons:
    p.use_smooth = True
# Soft rounded tip
bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, location=(0, 0.03, 2.28))
tip = bpy.context.object
tip.scale = (0.04, 0.04, 0.04)
bpy.ops.object.transform_apply(scale=True)
for p in tip.data.polygons:
    p.use_smooth = True

# 4. FEET & LEGS
for s, side in [(-1, 'L'), (1, 'R')]:
    # Leg
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24, radius=0.13, depth=0.16,
        location=(s * 0.28, -0.02, 0.16)
    )
    lo = bpy.context.object
    lo.name = f"SWA_Leg_{side}"
    for p in lo.data.polygons:
        p.use_smooth = True
    
    # Foot: rounded pebble loaf, flat on bottom Z=0.0
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=24, ring_count=16,
        location=(s * 0.28, -0.06, 0.075)
    )
    fo = bpy.context.object
    fo.name = f"SWA_Foot_{side}"
    fo.scale = (0.135, 0.21, 0.075)
    fo.rotation_euler = (0, 0, math.radians(-12 * s))
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    for p in fo.data.polygons:
        p.use_smooth = True

# Camera & Light
cam_data = bpy.data.cameras.new("Cam")
cam = bpy.data.objects.new("Cam", cam_data)
bpy.context.collection.objects.link(cam)
cam.location = (0, -6, 1.15)
cam.rotation_euler = (math.radians(90), 0, 0)
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 2.55
bpy.context.scene.camera = cam

light_data = bpy.data.lights.new("Sun", 'SUN')
light_data.energy = 3.0
light = bpy.data.objects.new("Sun", light_data)
light.rotation_euler = (math.radians(45), math.radians(30), 0)
bpy.context.collection.objects.link(light)

bpy.context.scene.render.resolution_x = 400
bpy.context.scene.render.resolution_y = 500
bpy.context.scene.render.filepath = "/home/ameetech/Desktop/preplyx2026/game/assets/swa/previews/test_refined_silhouette.png"
bpy.ops.render.render(write_still=True)
print("TEST_REFINED_SILHOUETTE_DONE")
