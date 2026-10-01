import bpy, math

# Test creating a soft gradient blush material and mesh patch
# Material
mat_blush = bpy.data.materials.new('SWA | Soft Blush Gradient')
mat_blush.use_nodes = True
tree = mat_blush.node_tree
tree.nodes.clear()

out = tree.nodes.new('ShaderNodeOutputMaterial')
bsdf = tree.nodes.new('ShaderNodeBsdfPrincipled')
coord = tree.nodes.new('ShaderNodeTexCoord')
dist = tree.nodes.new('ShaderNodeVectorMath')
dist.operation = 'LENGTH'

# Radial falloff
ramp = tree.nodes.new('ShaderNodeMapRange')
ramp.inputs['From Min'].default_value = 0.0
ramp.inputs['From Max'].default_value = 1.0
ramp.inputs['To Min'].default_value = 1.0
ramp.inputs['To Max'].default_value = 0.0
ramp.interpolation_type = 'SMOOTHSTEP'

val_blush = tree.nodes.new('ShaderNodeValue')
val_blush.name = 'BLUSH'
val_blush.outputs[0].default_value = 0.65

mult = tree.nodes.new('ShaderNodeMath')
mult.operation = 'MULTIPLY'

# Color: warm soft pink #FF9AB2 -> (1.0, 0.40, 0.55)
bsdf.inputs['Base Color'].default_value = (1.0, 0.38, 0.52, 1.0)
bsdf.inputs['Roughness'].default_value = 0.5
if 'Specular IOR Level' in bsdf.inputs:
    bsdf.inputs['Specular IOR Level'].default_value = 0.0
if 'Emission Color' in bsdf.inputs:
    bsdf.inputs['Emission Color'].default_value = (1.0, 0.45, 0.58, 1.0)
    bsdf.inputs['Emission Strength'].default_value = 0.15

tree.links.new(coord.outputs['Object'], dist.inputs[0])
tree.links.new(dist.outputs['Value'], ramp.inputs['Value'])
tree.links.new(ramp.outputs['Result'], mult.inputs[0])
tree.links.new(val_blush.outputs['Value'], mult.inputs[1])
tree.links.new(mult.outputs['Value'], bsdf.inputs['Alpha'])
tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

# Set blend mode to BLEND for smooth gradient
if hasattr(mat_blush, 'blend_method'):
    mat_blush.blend_method = 'BLEND'
if hasattr(mat_blush, 'shadow_method'):
    mat_blush.shadow_method = 'NONE'

print("GRADIENT_BLUSH_MAT_CREATED")
