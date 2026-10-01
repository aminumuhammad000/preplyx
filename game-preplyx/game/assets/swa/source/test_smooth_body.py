import bpy, math

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

ctrl_pts = [
    (0.20, 0.02, 0.02,  0.00),  # extra bottom anchor
    (0.22, 0.05, 0.05,  0.00),  # bottom cap
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
    (1.86, 0.02, 0.02,  0.00),  # extra top anchor
]

n = len(ctrl_pts)
num_rings = 48
verts = []
faces = []
sides = 48

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
        verts.append((rx * math.cos(th), cy + ry * math.sin(th), z))

for i in range(num_rings - 1):
    for j in range(sides):
        v0 = i * sides + j
        v1 = i * sides + (j + 1) % sides
        v2 = (i + 1) * sides + (j + 1) % sides
        v3 = (i + 1) * sides + j
        faces.append((v0, v1, v2, v3))

# Close top and bottom poles
bp_idx = len(verts)
verts.append((0, 0, ctrl_pts[1][0]))
for j in range(sides):
    faces.append((bp_idx, (j + 1) % sides, j))

tp_idx = len(verts)
verts.append((0, 0, ctrl_pts[-2][0]))
top_ring_start = (num_rings - 1) * sides
for j in range(sides):
    faces.append((tp_idx, top_ring_start + j, top_ring_start + (j + 1) % sides))

mesh = bpy.data.meshes.new("SWA_Body")
mesh.from_pydata(verts, [], faces)
mesh.update()
for p in mesh.polygons:
    p.use_smooth = True

obj = bpy.data.objects.new("SWA_Body", mesh)
bpy.context.collection.objects.link(obj)

cam_data = bpy.data.cameras.new("Cam")
cam = bpy.data.objects.new("Cam", cam_data)
bpy.context.collection.objects.link(cam)
cam.location = (0, -6, 1.05)
cam.rotation_euler = (math.radians(90), 0, 0)
cam_data.type = 'ORTHO'
cam_data.ortho_scale = 2.4
bpy.context.scene.camera = cam

light_data = bpy.data.lights.new("Sun", 'SUN')
light_data.energy = 3.0
light = bpy.data.objects.new("Sun", light_data)
light.rotation_euler = (math.radians(45), math.radians(30), 0)
bpy.context.collection.objects.link(light)

bpy.context.scene.render.resolution_x = 400
bpy.context.scene.render.resolution_y = 500
bpy.context.scene.render.filepath = "/home/ameetech/Desktop/preplyx2026/game/assets/swa/previews/test_smooth_body.png"
bpy.ops.render.render(write_still=True)
print("TEST_SMOOTH_BODY_DONE")
