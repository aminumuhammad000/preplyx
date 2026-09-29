import bpy, math, os
from mathutils import Vector

# Test shader-based blush and integrated face
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Material with shader blush
mat = bpy.data.materials.new('SWA_Porcelain_Blush')
mat.use_nodes = True
tree = mat.node_tree
tree.nodes.clear()

# Nodes
node_out = tree.nodes.new('ShaderNodeOutputMaterial')
node_bsdf = tree.nodes.new('ShaderNodeBsdfPrincipled')
node_coord = tree.nodes.new('ShaderNodeTexCoord')
node_sep = tree.nodes.new('ShaderNodeSeparateXYZ')

# Left cheek distance
# Cheek L center: (-0.30, -0.56, 1.34)
# Cheek R center: (+0.30, -0.56, 1.34)
node_sub_l = tree.nodes.new('ShaderNodeVectorMath')
node_sub_l.operation = 'SUBTRACT'
node_sub_l.inputs[1].default_value = (-0.30, -0.56, 1.34)

node_dist_l = tree.nodes.new('ShaderNodeVectorMath')
node_dist_l.operation = 'LENGTH'

# Right cheek distance
node_sub_r = tree.nodes.new('ShaderNodeVectorMath')
node_sub_r.operation = 'SUBTRACT'
node_sub_r.inputs[1].default_value = (0.30, -0.56, 1.34)

node_dist_r = tree.nodes.new('ShaderNodeVectorMath')
node_dist_r.operation = 'LENGTH'

# Min distance of both cheeks
node_min = tree.nodes.new('ShaderNodeMath')
node_min.operation = 'MINIMUM'

# Smoothstep falloff: radius ~ 0.16
node_ramp = tree.nodes.new('ShaderNodeMapRange')
node_ramp.inputs['From Min'].default_value = 0.05
node_ramp.inputs['From Max'].default_value = 0.16
node_ramp.inputs['To Min'].default_value = 1.0
node_ramp.inputs['To Max'].default_value = 0.0
node_ramp.interpolation_type = 'SMOOTHSTEP'

# Value node for BLUSH control (0 to 1)
node_blush_val = tree.nodes.new('ShaderNodeValue')
node_blush_val.name = 'BLUSH'
node_blush_val.label = 'BLUSH'
node_blush_val.outputs[0].default_value = 0.5  # default 0.5 = normal

# Multiply falloff by BLUSH
node_mult = tree.nodes.new('ShaderNodeMath')
node_mult.operation = 'MULTIPLY'

# Mix base color (porcelain white) with blush pink (#FFB6C1 -> 1.0, 0.714, 0.757)
node_mix = tree.nodes.new('ShaderNodeMix')
node_mix.data_type = 'RGBA'
node_mix.inputs[6].default_value = (0.97, 0.98, 1.0, 1.0) # Base white
node_mix.inputs[7].default_value = (1.0, 0.65, 0.72, 1.0) # Soft pink blush

# Link blush nodes
tree.links.new(node_coord.outputs['Object'], node_sub_l.inputs[0])
tree.links.new(node_coord.outputs['Object'], node_sub_r.inputs[0])
tree.links.new(node_sub_l.outputs['Vector'], node_dist_l.inputs[0])
tree.links.new(node_sub_r.outputs['Vector'], node_dist_r.inputs[0])
tree.links.new(node_dist_l.outputs['Value'], node_min.inputs[0])
tree.links.new(node_dist_r.outputs['Value'], node_min.inputs[1])
tree.links.new(node_min.outputs['Value'], node_ramp.inputs['Value'])
tree.links.new(node_ramp.outputs['Result'], node_mult.inputs[0])
tree.links.new(node_blush_val.outputs['Value'], node_mult.inputs[1])
tree.links.new(node_mult.outputs['Value'], node_mix.inputs['Factor'])

# Principled BSDF settings
node_bsdf.inputs['Roughness'].default_value = 0.38
if 'Specular IOR Level' in node_bsdf.inputs:
    node_bsdf.inputs['Specular IOR Level'].default_value = 0.48
if 'Subsurface Weight' in node_bsdf.inputs:
    node_bsdf.inputs['Subsurface Weight'].default_value = 0.08
    node_bsdf.inputs['Subsurface Radius'].default_value = (1.0, 0.7, 0.6)

tree.links.new(node_mix.outputs[2], node_bsdf.inputs['Base Color'])
tree.links.new(node_bsdf.outputs['BSDF'], node_out.inputs['Surface'])

print("BLUSH_SHADER_CREATED")
