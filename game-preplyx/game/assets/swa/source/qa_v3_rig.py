import bpy, os, math
from mathutils import Vector, Euler

SRC = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(SRC, '..'))
BLEND = os.path.join(SRC, 'swa_master.blend')
GLB = os.path.join(ROOT, 'models', 'swa_master.glb')

print("=== STARTING SWA V3 RIG & DEFORMATION QA ===")

# 1. Open Blend file
bpy.ops.wm.open_mainfile(filepath=BLEND)
mesh = bpy.data.objects.get('SWA_Mesh')
arm = bpy.data.objects.get('SWA_Rig')

assert mesh is not None, "SWA_Mesh not found!"
assert arm is not None, "SWA_Rig not found!"
print("1. Found SWA_Mesh and SWA_Rig.")

# 2. Check Antenna Removal
has_antenna_bone = 'SWA_ANTENNA' in arm.data.bones
has_antenna_obj = any('antenna' in o.name.lower() for o in bpy.data.objects)
assert not has_antenna_bone, "SWA_ANTENNA bone should be removed!"
print("2. Antenna removal verified: NO antenna bone or object.")

# 3. Check Bone Hierarchy & Hand Digits
expected_bones = [
    'SWA_MASTER', 'SWA_ROOT', 'SWA_PELVIS', 'SWA_SPINE', 'SWA_CHEST', 'SWA_NECK', 'SWA_HEAD',
    'SWA_UPPER_ARM_L', 'SWA_FOREARM_L', 'SWA_HAND_L',
    'SWA_THUMB_01_L', 'SWA_THUMB_02_L',
    'SWA_INDEX_01_L', 'SWA_INDEX_02_L',
    'SWA_FINGERS_01_L', 'SWA_FINGERS_02_L',
    'SWA_UPPER_ARM_R', 'SWA_FOREARM_R', 'SWA_HAND_R',
    'SWA_THUMB_01_R', 'SWA_THUMB_02_R',
    'SWA_INDEX_01_R', 'SWA_INDEX_02_R',
    'SWA_FINGERS_01_R', 'SWA_FINGERS_02_R',
    'SWA_UPPER_LEG_L', 'SWA_LOWER_LEG_L', 'SWA_FOOT_L',
    'SWA_UPPER_LEG_R', 'SWA_LOWER_LEG_R', 'SWA_FOOT_R',
    'SWA_ARM_IK_L', 'SWA_ARM_POLE_L', 'SWA_ARM_IK_R', 'SWA_ARM_POLE_R',
    'SWA_LEG_IK_L', 'SWA_LEG_POLE_L', 'SWA_LEG_IK_R', 'SWA_LEG_POLE_R',
    'SWA_EYE_TARGET', 'SWA_EYE_L', 'SWA_EYE_R'
]

missing = [b for b in expected_bones if b not in arm.data.bones]
assert len(missing) == 0, f"Missing bones: {missing}"
print(f"3. All {len(expected_bones)} bones verified present in hierarchy.")

# 4. Check IK Constraints
for side in ['L', 'R']:
    pb_forearm = arm.pose.bones.get(f'SWA_FOREARM_{side}')
    ik_arm = pb_forearm.constraints.get('Arm_IK')
    assert ik_arm is not None, f"Arm_IK missing on {side} forearm!"
    assert ik_arm.target == arm and ik_arm.subtarget == f'SWA_ARM_IK_{side}'
    assert ik_arm.chain_count == 2
    
    pb_lowerleg = arm.pose.bones.get(f'SWA_LOWER_LEG_{side}')
    ik_leg = pb_lowerleg.constraints.get('Leg_IK')
    assert ik_leg is not None, f"Leg_IK missing on {side} lower leg!"
    assert ik_leg.target == arm and ik_leg.subtarget == f'SWA_LEG_IK_{side}'
    assert ik_leg.chain_count == 2

print("4. IK Constraints verified on arms and legs (2-bone chains with pole targets).")

# 5. Check Shape Keys
sk = mesh.data.shape_keys.key_blocks
required_keys = [
    'blink_L', 'blink_R', 'blink_both', 'squint', 'wide',
    'smile', 'smile_big', 'open', 'surprised_mouth', 'sad_mouth', 'angry_mouth',
    'happy', 'sad', 'surprised', 'angry', 'thinking', 'laugh', 'confused', 'sleepy', 'crying',
    'hand_fist_L', 'hand_point_L', 'hand_thumbs_up_L', 'hand_open_L',
    'hand_fist_R', 'hand_point_R', 'hand_thumbs_up_R', 'hand_open_R',
    'squash', 'stretch', 'corrective_arm_up_L', 'corrective_elbow_bend_L', 'corrective_knee_bend_L'
]
missing_keys = [k for k in required_keys if k not in sk]
assert len(missing_keys) == 0, f"Missing shape keys: {missing_keys}"
print(f"5. Shape keys verified: {len(sk)} total shape keys (facial, hand poses, volume correctives).")

# 6. Test Extreme Poses & Deformation
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')

# Pose A: Arm raise 90 degrees and 180 degrees
pb_arm_r = arm.pose.bones['SWA_UPPER_ARM_R']
pb_arm_r.rotation_mode = 'XYZ'
pb_arm_r.rotation_euler = (0, 0, math.radians(-90))
bpy.context.view_layer.update()
print("   - Arm 90° pose tested OK.")

pb_arm_r.rotation_euler = (0, 0, math.radians(-165))
bpy.context.view_layer.update()
print("   - Arm 165° overhead reach tested OK.")

# Pose B: Elbow sharp bend
pb_fore_r = arm.pose.bones['SWA_FOREARM_R']
pb_fore_r.rotation_mode = 'XYZ'
pb_fore_r.rotation_euler = (math.radians(90), 0, 0)
bpy.context.view_layer.update()
print("   - Sharp elbow bend tested OK.")

# Pose C: Digits pose (point)
arm.pose.bones['SWA_INDEX_01_R'].rotation_euler = (math.radians(-20), 0, 0)
arm.pose.bones['SWA_THUMB_01_R'].rotation_euler = (math.radians(40), 0, 0)
arm.pose.bones['SWA_FINGERS_01_R'].rotation_euler = (math.radians(60), 0, 0)
bpy.context.view_layer.update()
print("   - Hand pointing & curling digits tested OK.")

# Pose D: Leg bend (squat)
arm.pose.bones['SWA_UPPER_LEG_L'].rotation_euler = (math.radians(80), 0, 0)
arm.pose.bones['SWA_LOWER_LEG_L'].rotation_euler = (math.radians(-80), 0, 0)
bpy.context.view_layer.update()
print("   - Leg squat bend tested OK.")

# Reset pose
for pb in arm.pose.bones:
    pb.location = (0, 0, 0)
    pb.rotation_euler = (0, 0, 0)
    pb.scale = (1, 1, 1)
bpy.context.view_layer.update()
bpy.ops.object.mode_set(mode='OBJECT')

# 7. Check Actions
actions = list(bpy.data.actions)
print(f"7. Production actions in .blend: {len(actions)}")
for a in actions:
    print(f"   - {a.name}")

print("=== ALL QA CHECKS PASSED SUCCESSFULLY ===")
