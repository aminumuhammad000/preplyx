import bpy

mat = bpy.data.materials.get('SWA | Porcelain soft satin')
tree = mat.node_tree

# Find Map Range nodes
# Let's inspect all nodes
for n in tree.nodes:
    print(n.name, n.type)

# Let's adjust the blush mix color and intensity
mix = None
ramp = None
front = None
blush_val = None
for n in tree.nodes:
    if n.type == 'MIX':
        mix = n
    elif n.type == 'MAP_RANGE':
        if ramp is None:
            ramp = n
        else:
            front = n
    elif n.name == 'BLUSH':
        blush_val = n

if mix:
    # Rich soft pink: #FF9EB5
    mix.inputs[7].default_value = (1.0, 0.32, 0.48, 1.0)

if front:
    # Relax front mask so it doesn't attenuate cheeks
    front.inputs['From Min'].default_value = -0.70
    front.inputs['From Max'].default_value = 0.0
    front.inputs['To Min'].default_value = 1.0
    front.inputs['To Max'].default_value = 0.0

if ramp:
    # Soft radial falloff: from center to edge
    ramp.inputs['From Min'].default_value = 0.0
    ramp.inputs['From Max'].default_value = 1.0
    ramp.inputs['To Min'].default_value = 1.0
    ramp.inputs['To Max'].default_value = 0.0

# Render front test
scene = bpy.context.scene
cam = scene.camera
cam.location = (0, -7.5, 1.15)
scene.render.filepath = '/home/ameetech/Desktop/preplyx2026/game/assets/swa/previews/test_blush_front.png'
bpy.ops.render.render(write_still=True)
print("TEST_BLUSH_RENDERED")
