import bpy, math, os
from mathutils import Vector

# Let's adjust the eye, glint, mouth, and cheek scale on SWA_Mesh in swa_master.blend
bpy.ops.wm.open_mainfile(filepath='/home/ameetech/Desktop/preplyx2026/game/assets/swa/source/swa_master.blend')

mesh = bpy.data.objects['SWA_Mesh']

# Let's inspect the vertex groups of face features
for vg in mesh.vertex_groups:
    if 'Eye' in vg.name or 'Mouth' in vg.name or 'Cheek' in vg.name:
        print(vg.name)
