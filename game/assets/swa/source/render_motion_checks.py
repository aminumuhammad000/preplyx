import bpy, os
from mathutils import Vector
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
scene=bpy.context.scene; arm=bpy.data.objects['SwaRig']; cam=scene.camera
cam.location=(5.7,-7.2,4.0); cam.rotation_euler=(Vector((0,0,1.45))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.ortho_scale=4.0; scene.render.resolution_percentage=55
for action_name,frame in [('Wave',18),('Celebrate',21)]:
    action=bpy.data.actions.get(action_name)
    arm.animation_data.action=action
    if getattr(action,'slots',None): arm.animation_data.action_slot=action.slots[0]
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    scene.render.filepath=os.path.join(root,'previews','swa_pose_'+action_name.lower()+'.png')
    bpy.ops.render.render(write_still=True)
print('MOTION_PREVIEWS_OK')
