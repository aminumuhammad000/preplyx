import bpy, os
from mathutils import Vector

blend=os.path.join(os.path.dirname(__file__),'swa_master.blend')
out=os.path.join(os.path.dirname(__file__),'..','previews');os.makedirs(out,exist_ok=True)
scene=bpy.context.scene;mesh=bpy.data.objects['SWA_Mesh'];cam=scene.camera
cam.location=(0,-8,2.7);cam.rotation_euler=(Vector((0,0,1.55))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=3.85
scene.render.resolution_x=480;scene.render.resolution_y=480;scene.render.resolution_percentage=60
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
keys=mesh.data.shape_keys.key_blocks
expressions={
 'neutral':{},'happy':{'happy':1},'very_happy':{'happy':.35,'smile_big':.8,'blush_strong':.3,'wide':.12},
 'sad':{'sad':1},'crying':{'crying':1},'surprised':{'surprised':1},'angry':{'angry':1},
 'thinking':{'thinking':1},'confused':{'confused':1},'sleepy':{'sleepy':1},'laughing':{'laugh':1},
 'winking':{'blink_L':1,'happy':.45,'smile':.5},'shy':{'happy':.35,'blush_strong':.55,'smile':.45},
 'excited':{'excited':1},'proud':{'proud':1},'worried':{'worried':1}}
for label,values in expressions.items():
    for k in keys[1:]:k.value=0
    for name,value in values.items():keys[name].value=value
    scene.render.filepath=os.path.join(out,'swa_expression_'+label+'.png');bpy.ops.render.render(write_still=True)
    print('EXPRESSION_CHECK',label,values)
for k in keys[1:]:k.value=0
