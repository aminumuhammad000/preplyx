import bpy, os
from mathutils import Vector
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
body=bpy.data.objects.get('SwaMesh'); scene=bpy.context.scene; cam=scene.camera
cam.location=(0,-8.2,3.0); cam.rotation_euler=(Vector((0,0,1.42))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.ortho_scale=3.65
scene.render.resolution_percentage=55
keys=body.data.shape_keys.key_blocks
states={'happy':{'Happy':1.0},'surprised':{'Surprised':1.0,'BeakOpen':.7},'confused':{'Confused':1.0},'sad':{'Sad':1.0},'determined':{'Determined':1.0},'sleepy':{'Sleepy':1.0}}
for name,state in states.items():
    for key in keys:key.value=0.0
    for key,value in state.items():keys[key].value=value
    scene.render.filepath=os.path.join(root,'previews','swa_expression_'+name+'.png')
    bpy.ops.render.render(write_still=True)
print('EXPRESSION_PREVIEWS_OK',list(states))
