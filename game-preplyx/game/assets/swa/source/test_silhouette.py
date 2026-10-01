import bpy, math, os
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Test body geometry
u_steps = 48
v_steps = 48

# Profile definition: (u, z, rx, ry, cy)
# u from 0 to 1
profile_pts = [
    # u, z, rx, ry, cy (cy is forward belly shift, negative is forward)
    (0.00, 0.22, 0.00, 0.00,  0.00),
    (0.08, 0.35, 0.42, 0.38, -0.01),
    (0.20, 0.55, 0.58, 0.52, -0.02),
    (0.35, 0.78, 0.66, 0.60, -0.03),
    (0.50, 1.05, 0.67, 0.59, -0.03),
    (0.65, 1.30, 0.65, 0.57, -0.02),
    (0.80, 1.55, 0.58, 0.52, -0.01),
    (0.92, 1.73, 0.42, 0.40,  0.00),
    (1.00, 1.84, 0.00, 0.00,  0.00),
]

# Spline interpolation
def get_slice(t):
    # clamp t
    t = max(0.0, min(1.0, t))
    # find interval
    for i in range(len(profile_pts)-1):
        p0 = profile_pts[i]
        p1 = profile_pts[i+1]
        if p0[0] <= t <= p1[0]:
            f = (t - p0[0]) / (p1[0] - p0[0])
            # smoothstep
            s = f * f * (3 - 2 * f)
            z = p0[1] + (p1[1] - p0[1]) * s
            rx = p0[2] + (p1[2] - p0[2]) * s
            ry = p0[3] + (p1[3] - p0[3]) * s
            cy = p0[4] + (p1[4] - p0[4]) * s
            return z, rx, ry, cy
    return profile_pts[-1][1:]

verts = []
faces = []

# Generate rings
for i in range(u_steps + 1):
    u = i / u_steps
    # Use sinusoidal spacing to concentrate rings near poles
    # angle phi from -pi/2 to pi/2
    phi = -math.pi/2 + math.pi * u
    # t mapped from phi
    t = 0.5 + 0.5 * math.sin(phi)
    # direct u can also work, but let's use smooth t
    z, rx, ry, cy = get_slice(u)
    # cap radius near poles using cos(phi)
    cap = math.cos(phi)
    # enforce zero radius at poles
    if i == 0 or i == u_steps:
        rx = 0.0
        ry = 0.0

    for j in range(v_steps):
        theta = 2 * math.pi * j / v_steps
        x = rx * math.cos(theta)
        y = cy + ry * math.sin(theta)
        verts.append((x, y, z))

for i in range(u_steps):
    for j in range(v_steps):
        v0 = i * v_steps + j
        v1 = i * v_steps + (j + 1) % v_steps
        v2 = (i + 1) * v_steps + (j + 1) % v_steps
        v3 = (i + 1) * v_steps + j
        faces.append((v0, v1, v2, v3))

mesh_data = bpy.data.meshes.new("BodyTest")
mesh_data.from_pydata(verts, [], faces)
mesh_data.update()
for p in mesh_data.polygons:
    p.use_smooth = True

obj = bpy.data.objects.new("BodyTest", mesh_data)
bpy.context.collection.objects.link(obj)

# Camera & Light
cam_data = bpy.data.cameras.new("Cam")
cam = bpy.data.objects.new("Cam", cam_data)
bpy.context.collection.objects.link(cam)
cam.location = (0, -6, 1.1)
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
bpy.context.scene.render.filepath = "/home/ameetech/Desktop/preplyx2026/game/assets/swa/previews/test_body_front.png"
bpy.ops.render.render(write_still=True)
print("TEST_BODY_FRONT_DONE")
