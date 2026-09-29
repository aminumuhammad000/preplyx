import bpy
import math
from mathutils import Vector, Matrix

# Clear scene
bpy.ops.wm.read_factory_settings(use_empty=True)

def create_lofted_mesh(name, rings_data, sides=16, cap_start=True, cap_end=True):
    # rings_data: list of (center_vec, rx, ry, normal_dir)
    verts = []
    faces = []
    
    # Generate vertices ring by ring
    for center, rx, ry, n_dir in rings_data:
        # compute coordinate frame perpendicular to n_dir
        n = n_dir.normalized() if n_dir.length_squared > 0.001 else Vector((0, 0, 1))
        ref = Vector((0, 1, 0)) if abs(n.z) > 0.9 else Vector((0, 0, 1))
        tangent = n.cross(ref).normalized()
        bitangent = n.cross(tangent).normalized()
        
        for j in range(sides):
            th = 2.0 * math.pi * j / sides
            offset = tangent * (rx * math.cos(th)) + bitangent * (ry * math.sin(th))
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
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    return obj

# Test arm loft
arm_rings = [
    (Vector((-0.48, -0.02, 1.34)), 0.165, 0.175, Vector((-0.2, 0, -1))),
    (Vector((-0.54, -0.02, 1.28)), 0.155, 0.165, Vector((-0.3, 0, -1))),
    (Vector((-0.60, -0.022, 1.20)), 0.145, 0.152, Vector((-0.3, 0, -1))),
    (Vector((-0.63, -0.024, 1.14)), 0.138, 0.144, Vector((-0.3, 0, -1))),
    (Vector((-0.65, -0.025, 1.10)), 0.135, 0.140, Vector((-0.2, 0, -1))),
    (Vector((-0.66, -0.028, 1.04)), 0.130, 0.135, Vector((-0.2, 0, -1))),
    (Vector((-0.67, -0.032, 0.98)), 0.125, 0.130, Vector((-0.1, 0, -1))),
    (Vector((-0.68, -0.036, 0.92)), 0.118, 0.122, Vector((-0.1, 0, -1))),
    (Vector((-0.685, -0.038, 0.86)), 0.108, 0.112, Vector((0, 0, -1))),
]
arm = create_lofted_mesh("TestArm", arm_rings, 16)
print("TEST_ARM_SUCCESS", len(arm.data.vertices), len(arm.data.polygons))

# Test foot loft with flat floor base
def create_mascot_foot(name, s, sides=16):
    # Foot profiled from heel to toe with flat base at z=0.025
    center_x = s * 0.28
    slices = [
        # (y_pos, z_center, rx, rz_top)
        (0.10, 0.055, 0.125, 0.030), # Heel
        (0.04, 0.075, 0.135, 0.050),
        (-0.02, 0.095, 0.145, 0.070), # Ankle rise
        (-0.08, 0.085, 0.155, 0.060), # Midfoot
        (-0.15, 0.070, 0.165, 0.045), # Ball of foot
        (-0.21, 0.055, 0.145, 0.030), # Front toe
        (-0.24, 0.040, 0.080, 0.015), # Toe tip
    ]
    verts = []
    faces = []
    base_z = 0.025
    
    for y, z_ctr, rx, rz_top in slices:
        for j in range(sides):
            th = 2.0 * math.pi * j / sides
            x = center_x + rx * math.cos(th)
            # Flatten bottom half to base_z
            sin_val = math.sin(th)
            if sin_val < -0.1:
                z = base_z
            else:
                z = base_z + (z_ctr - base_z + rz_top) * max(0.0, sin_val)
            verts.append(Vector((x, y, z)))
            
    n_slices = len(slices)
    for i in range(n_slices - 1):
        for j in range(sides):
            v0 = i * sides + j
            v1 = i * sides + (j + 1) % sides
            v2 = (i + 1) * sides + (j + 1) % sides
            v3 = (i + 1) * sides + j
            faces.append((v0, v1, v2, v3))
            
    # Cap heel
    heel_tip = len(verts)
    verts.append(Vector((center_x, slices[0][0], base_z + 0.02)))
    for j in range(sides):
        faces.append((heel_tip, (j + 1) % sides, j))
        
    # Cap toe
    toe_tip = len(verts)
    verts.append(Vector((center_x, slices[-1][0], base_z + 0.01)))
    last_base = (n_slices - 1) * sides
    for j in range(sides):
        faces.append((toe_tip, last_base + j, last_base + (j + 1) % sides))
        
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new(name, me)
    # Apply outward splay
    obj.rotation_euler = (0, 0, math.radians(-10 * s))
    bpy.context.collection.objects.link(obj)
    return obj

foot = create_mascot_foot("TestFoot", -1)
print("TEST_FOOT_SUCCESS", len(foot.data.vertices), len(foot.data.polygons))
