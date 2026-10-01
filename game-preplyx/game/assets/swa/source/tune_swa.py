import bpy, math

# Let's adjust the blush shader on SWA_Mesh body material
mat = bpy.data.materials.get('SWA | Porcelain soft satin')
if mat:
    tree = mat.node_tree
    # Let's inspect nodes
    print('Material nodes:', [n.name for n in tree.nodes])
