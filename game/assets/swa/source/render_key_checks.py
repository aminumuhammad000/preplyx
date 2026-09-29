import bpy, os
from mathutils import Vector
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
body=bpy.data.objects.get('SwaMesh'); scene=bpy.context.scene; cam=scene.camera
cam.location=(0,-8.2,3.0); cam.rotation_euler=(Vector((0,0,1.42))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.ortho_scale=3.65
scene.render.resolution_percentage=45
keys=body.data.shape_keys.key_blocks
for name in ['Happy','Surprised','Sad']:
    for key in keys:key.value=0.0
    keys[name].value=1.0
    scene.render.filepath=os.path.join(root,'previews','swa_expression_'+name.lower()+'_check.png')
    bpy.ops.render.render(write_still=True)
print('EXPRESSION_CHECKS_OK')
