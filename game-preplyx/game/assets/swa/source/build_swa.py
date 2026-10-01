import bpy, math, os
from mathutils import Vector
from math import sin, cos, pi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MODEL_DIR = os.path.join(ROOT, 'models')
PREVIEW_DIR = os.path.join(ROOT, 'previews')
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(PREVIEW_DIR, exist_ok=True)

# A hand-designed, low/medium polygon Swallern swallow companion. Built entirely
# from authored primitives and custom forms; no third-party character assets.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights, bpy.data.armatures):
    for item in list(datablocks):
        if item.users == 0: datablocks.remove(item)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.eevee.taa_render_samples = 16
scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.world.color = (0.035, 0.05, 0.09)

# Palette: deep Swallern blue, aqua, clean feather/face, and warm beak/feet.
def mat(name, color, rough=.42, metallic=0.0, emission=None, emit_strength=0.0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metallic
    if emission:
        p.inputs['Emission Color'].default_value=(*emission,1); p.inputs['Emission Strength'].default_value=emit_strength
    return m
M={
'feather':mat('Swa / Swallern blue feather',(.035,.255,.62),.31,.04),
'feather_hi':mat('Swa / Azure feather highlight',(.055,.49,.88),.29,.04),
'navy':mat('Swa / Midnight flight feather',(.018,.085,.24),.38,.06),
'face':mat('Swa / Warm ivory face and chest',(.88,.94,.99),.52),
'eye_white':mat('Swa / Eye white',(.96,.985,1),.2),
'iris':mat('Swa / Ocean iris',(.035,.34,.69),.23,.08),
'iris_ring':mat('Swa / Teal iris ring',(.10,.82,.77),.25,.08, (.05,.44,.41),.25),
'pupil':mat('Swa / Pupil',(.006,.018,.04),.17),
'glint':mat('Swa / Eye glint',(1,1,1),.12),
'beak':mat('Swa / Marigold beak',(.99,.48,.065),.34),
'beak_light':mat('Swa / Beak highlight',(1,.68,.18),.33),
'mouth':mat('Swa / Mouth line',(.20,.074,.055),.48),
'feet':mat('Swa / Golden feet',(.97,.40,.055),.39),
'scarf':mat('Swa / Teal collar',(.035,.69,.65),.32,.06),
'badge':mat('Swa / Sun badge',(.98,.75,.19),.28,.25),
'cheek':mat('Swa / Soft cheek',(.96,.57,.56),.65),
}

parts=[]
# components: all become a single weighted mesh; marker groups drive facial shape keys.
def finish_part(obj, bone, material, markers=()):
    obj.name=obj.name.replace('Sphere','SwaPart')
    if material: obj.data.materials.append(material)
    for poly in obj.data.polygons: poly.use_smooth=True
    vg=obj.vertex_groups.new(name=bone); vg.add(list(range(len(obj.data.vertices))),1.0,'REPLACE')
    for marker in markers:
        mg=obj.vertex_groups.get(marker) or obj.vertex_groups.new(name=marker)
        mg.add(list(range(len(obj.data.vertices))),1.0,'REPLACE')
    parts.append(obj); return obj

def sphere(name, loc, scale, material, bone='spine', rot=(0,0,0), markers=(), segments=20, rings=14):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; o.rotation_euler=rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return finish_part(o,bone,material,markers)

def capsule_between(name, a, b, radius, depth, material, bone, markers=()):
    mid=(Vector(a)+Vector(b))*0.5; vec=Vector(b)-Vector(a)
    o=sphere(name,mid,(radius,depth,vec.length()*0.58),material,bone,markers=markers,segments=16,rings=12)
    o.rotation_mode='QUATERNION'; o.rotation_quaternion=vec.to_track_quat('Z','Y')
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    return o

def curve_mesh(name, points, bevel, material, bone, markers=()):
    c=bpy.data.curves.new(name+'Curve','CURVE'); c.dimensions='3D'; c.resolution_u=2; c.bevel_depth=bevel; c.bevel_resolution=3
    s=c.splines.new('BEZIER'); s.bezier_points.add(len(points)-1)
    for bp, co in zip(s.bezier_points,points): bp.co=co; bp.handle_left_type='AUTO'; bp.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o); o.data.materials.append(material)
    bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.convert(target='MESH'); o=bpy.context.object; o.select_set(False)
    for p in o.data.polygons:p.use_smooth=True
    return finish_part(o,bone,material,markers)

def custom_mesh(name, verts, faces, material, bone, markers=()):
    me=bpy.data.meshes.new(name+'Mesh'); me.from_pydata(verts,[],faces); me.materials.append(material); me.update()
    o=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(o)
    for p in me.polygons:p.use_smooth=True
    return finish_part(o,bone,material,markers)

# Body and chest: rounded, small humanoid proportions, unmistakable blue swallow.
sphere('Torso', (0,.015,1.23),(.43,.34,.57),M['feather'],'spine',segments=24,rings=16)
sphere('Chest bib',(0,-.292,1.24),(.325,.105,.405),M['face'],'chest',segments=24,rings=16)
sphere('Neck',(0,-.005,1.68),(.235,.23,.27),M['feather'],'neck')
# Teal collar band with a tiny Swallern sun drop at center.
for i in range(16):
    a=2*pi*i/16
    sphere('Collar bead',(0.236*cos(a),.236*sin(a)-.01,1.59),(.064,.057,.055),M['scarf'],'neck',segments=10,rings=8)
sphere('Collar knot',(0,-.262,1.565),(.095,.075,.105),M['badge'],'neck',segments=14,rings=10)
sphere('Chest badge',(0,-.397,1.34),(.072,.024,.073),M['scarf'],'chest',segments=14,rings=10)
sphere('Badge glimmer',(0,-.423,1.36),(.023,.014,.023),M['badge'],'chest',segments=10,rings=8)
# Head: slightly wide, large and friendly with an ivory facial mask.
sphere('Head',(0,0,2.18),(.58,.49,.54),M['feather'],'head',segments=28,rings=20)
sphere('Face mask',(0,-.335,2.12),(.485,.178,.366),M['face'],'head',segments=28,rings=20)
# Cheek color is very subtle and stays below the eye line.
sphere('Cheek L',(-.365,-.456,1.99),(.075,.025,.046),M['cheek'],'head',segments=14,rings=10)
sphere('Cheek R',(.365,-.456,1.99),(.075,.025,.046),M['cheek'],'head',segments=14,rings=10)
# Eye clusters, eye bones allow look-target animation. Marker groups feed expression controls.
for side,x in [('L',-.205),('R',.205)]:
    bone='eye.'+side
    sphere('Eye white '+side,(x,-.476,2.185),(.177,.108,.205),M['eye_white'],bone,markers=('face_eye_'+side,),segments=24,rings=18)
    sphere('Iris rim '+side,(x,-.572,2.183),(.095,.041,.116),M['iris_ring'],bone,markers=('face_eye_'+side,),segments=20,rings=14)
    sphere('Iris '+side,(x,-.600,2.182),(.075,.035,.096),M['iris'],bone,markers=('face_eye_'+side,),segments=20,rings=14)
    sphere('Pupil '+side,(x,-.628,2.184),(.045,.024,.065),M['pupil'],bone,markers=('face_eye_'+side,),segments=16,rings=12)
    sphere('Eye glint '+side,(x-.020,-.649,2.218),(.018,.012,.024),M['glint'],bone,markers=('face_eye_'+side,),segments=12,rings=8)
    # Expressive feather brows are individual, bone-controllable pieces.
    bx=x*1.04
    sphere('Brow '+side,(bx,-.475,2.43),(.17,.058,.047),M['navy'],'brow.'+side,rot=(0,0,(-.10 if side=='L' else .10)),markers=('face_brow_'+side,),segments=16,rings=10)
# Tapered beak custom wedge, rounded by bevel-free stylized planes.
verts=[(-.155,-.45,2.075),(.155,-.45,2.075),(-.13,-.73,2.04),(.13,-.73,2.04),(0,-.80,1.995),(0,-.48,1.975)]
faces=[(0,1,3,2),(2,3,4),(0,2,4,5),(3,1,5,4),(0,5,1)]
custom_mesh('Upper beak',verts,faces,M['beak'],'head',('face_beak','face_beak_upper'))
sphere('Beak lower',(0,-.59,1.972),(.112,.155,.038),M['beak_light'],'jaw',markers=('face_beak','face_beak_lower'),segments=16,rings=10)
curve_mesh('Smile line',[(-.105,-.622,1.955),(-.055,-.69,1.943),(0,-.704,1.94),(.055,-.69,1.943),(.105,-.622,1.955)],.009,M['mouth'],'jaw',('face_beak','face_beak_lower'))
# Crown sweep: three tapered feather plumes form a signature Swa silhouette.
sphere('Crest center',(0,-.02,2.695),(.105,.13,.225),M['feather_hi'],'head',rot=(.12,0,0),segments=16,rings=12)
sphere('Crest left',(-.105,.005,2.655),(.072,.105,.18),M['scarf'],'head',rot=(0,-.23,-.1),segments=14,rings=10)
sphere('Crest right',(.11,.012,2.66),(.072,.105,.17),M['feather'],'head',rot=(0,.23,.1),segments=14,rings=10)
# Wings/arms: clear shoulder, forewing, hand fan; each section has independent rig control.
for side,sgn in [('L',-1),('R',1)]:
    sphere('Shoulder '+side,(sgn*.36,.0,1.47),(.19,.205,.22),M['feather_hi'],'clavicle.'+side,segments=18,rings=12)
    sphere('Upper wing '+side,(sgn*.50,.015,1.31),(.17,.20,.355),M['feather'],'wing_upper.'+side,rot=(0,sgn*.18,-sgn*.11),segments=20,rings=14)
    sphere('Wing underside '+side,(sgn*.52,-.11,1.285),(.12,.105,.25),M['navy'],'wing_upper.'+side,rot=(0,sgn*.18,-sgn*.11),segments=16,rings=12)
    sphere('Forewing '+side,(sgn*.66,.0,1.02),(.135,.17,.27),M['feather_hi'],'wing_lower.'+side,rot=(0,sgn*.12,-sgn*.1),segments=18,rings=12)
    sphere('Wing hand '+side,(sgn*.72,-.005,.815),(.15,.155,.15),M['feather'],'hand.'+side,segments=16,rings=12)
    for j in range(3):
        xx=sgn*(.66 + j*.065)
        z=.70-(j%2)*.035
        sphere('Primary feather '+side+str(j),(xx,.02+j*.015,z),(.055,.095,.19 if j==1 else .15),M['feather_hi'] if j==1 else M['feather'],'wing_digit_%02d.%s' % (j+1,side),rot=(0,sgn*(.22-j*.15),0),segments=14,rings=10)
# Forked swallow tail, visible behind silhouette.
sphere('Tail base',(0,.275,1.03),(.23,.23,.20),M['navy'],'tail')
for side,sgn in [('L',-1),('R',1)]:
    sphere('Tail feather '+side,(sgn*.29,.53,.89),(.145,.43,.105),M['feather'],'tail.'+side,rot=(.12,0,sgn*.14),segments=18,rings=12)
    sphere('Tail tip '+side,(sgn*.35,.83,.855),(.10,.20,.075),M['feather_hi'],'tail.'+side,rot=(.10,0,sgn*.14),segments=14,rings=10)
# Legs and three-toed golden feet.
for side,sgn in [('L',-1),('R',1)]:
    x=sgn*.18
    sphere('Hip '+side,(x,.015,.78),(.17,.18,.20),M['feather'],'hip.'+side,segments=16,rings=12)
    sphere('Thigh '+side,(x,.005,.57),(.125,.135,.26),M['navy'],'leg_upper.'+side,segments=16,rings=12)
    sphere('Shin '+side,(x,-.005,.32),(.095,.11,.21),M['feather_hi'],'leg_lower.'+side,segments=16,rings=12)
    sphere('Ankle cuff '+side,(x,-.025,.20),(.105,.12,.055),M['badge'],'foot.'+side,segments=14,rings=8)
    sphere('Foot '+side,(x,-.13,.13),(.155,.29,.09),M['feet'],'foot.'+side,segments=18,rings=12)
    for j in range(3):
        toe_x=x + (j-1)*.09
        sphere('Toe '+side+str(j),(toe_x,-.36,.105),(.065,.17,.055),M['beak_light'],'toe.'+side,rot=(0,0,(j-1)*.12),segments=12,rings=8)

# Join all body pieces as a single efficiently skinned mesh. Per-piece named vertex
# groups preserve bone weights and identify facial regions for exported shape keys.
for o in bpy.context.selected_objects: o.select_set(False)
for o in parts:o.select_set(True)
body=parts[0]; bpy.context.view_layer.objects.active=body
bpy.ops.object.join(); body=bpy.context.object; body.name='SwaMesh'; body.data.name='SwaMesh_Geometry'
for p in body.data.polygons:p.use_smooth=True
# Facial expression controls deform only their dedicated eye/brow/beak marker groups.
body.shape_key_add(name='Basis',from_mix=False)
def make_expression(name, eye_mode=None, brow_mode=None, beak_mode=None):
    key=body.shape_key_add(name=name,from_mix=False)
    marker_names=['face_eye_L','face_eye_R','face_brow_L','face_brow_R','face_beak_lower']
    marker_vertices={}
    for marker in marker_names:
        group=body.vertex_groups.get(marker); ids=set()
        if group:
            for v in body.data.vertices:
                try:
                    if group.weight(v.index)>0.5: ids.add(v.index)
                except: pass
        marker_vertices[marker]=ids
    centers={}
    for marker,ids in marker_vertices.items():
        if ids:
            heights=[body.data.vertices[index].co.z for index in ids]
            centers[marker]=(min(heights)+max(heights))*0.5
    for i,v in enumerate(body.data.vertices):
        co=key.data[i].co.copy()
        for side in ['L','R']:
            eye_marker='face_eye_'+side
            if i in marker_vertices[eye_marker]:
                center_z=centers.get(eye_marker,co.z)
                factor=1.0
                if eye_mode=='blink': factor=.10
                elif eye_mode=='happy': factor=.70
                elif eye_mode=='surprised': factor=1.22
                elif eye_mode=='sleepy': factor=.44
                elif eye_mode=='confused' and side=='L': factor=.88
                co.z=center_z+(co.z-center_z)*factor
            brow_marker='face_brow_'+side
            if i in marker_vertices[brow_marker]:
                delta=0.0
                if brow_mode=='surprised': delta=.085
                elif brow_mode=='sad': delta=-.07 if side=='L' else .025
                elif brow_mode=='confused': delta=.08 if side=='L' else -.015
                elif brow_mode=='determined': delta=-.035
                elif brow_mode=='happy': delta=.025
                co.z+=delta
                if brow_mode=='confused' and side=='L': co.x-=.025
        if beak_mode=='open' and i in marker_vertices['face_beak_lower']:
            co.z-=.055
        key.data[i].co=co
    key.value=0.0
    return key
for args in [('Blink','blink',None,None),('Happy','happy','happy',None),('Surprised','surprised','surprised',None),('Confused','confused','confused',None),('Sad','sleepy','sad',None),('Determined',None,'determined',None),('Sleepy','sleepy',None,None),('BeakOpen',None,None,'open')]:
    make_expression(args[0],args[1],args[2],args[3])

# Armature: all major articulation points, including gaze, lids, brows, jaw, and digits.
arm_data=bpy.data.armatures.new('SwaRig'); arm=bpy.data.objects.new('SwaRig',arm_data); bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active=arm; arm.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
bones={
'root':((0,0,.02),(0,0,.42),None),
'pelvis':((0,0,.68),(0,0,1.02),'root'),
'spine':((0,0,.92),(0,0,1.48),'pelvis'),
'chest':((0,0,1.22),(0,0,1.63),'spine'),
'neck':((0,0,1.48),(0,0,1.83),'chest'),
'head':((0,0,1.78),(0,0,2.33),'neck'),
'jaw':((0,-.28,2.01),(0,-.51,1.98),'head'),
'eye.L':((-.205,-.37,2.18),(-.205,-.56,2.18),'head'),
'eye.R':((.205,-.37,2.18),(.205,-.56,2.18),'head'),
'eyelid.L':((-.205,-.44,2.36),(-.205,-.53,2.32),'head'),
'eyelid.R':((.205,-.44,2.36),(.205,-.53,2.32),'head'),
'brow.L':((-.2,-.39,2.39),(-.2,-.5,2.43),'head'),
'brow.R':((.2,-.39,2.39),(.2,-.5,2.43),'head'),
'clavicle.L':((-.23,0,1.52),(-.4,0,1.45),'chest'),
'clavicle.R':((.23,0,1.52),(.4,0,1.45),'chest'),
'wing_upper.L':((-.37,0,1.47),(-.53,0,1.16),'clavicle.L'),
'wing_upper.R':((.37,0,1.47),(.53,0,1.16),'clavicle.R'),
'wing_lower.L':((-.53,0,1.16),(-.68,0,.91),'wing_upper.L'),
'wing_lower.R':((.53,0,1.16),(.68,0,.91),'wing_upper.R'),
'hand.L':((-.68,0,.91),(-.72,0,.78),'wing_lower.L'),
'hand.R':((.68,0,.91),(.72,0,.78),'wing_lower.R'),
'tail':((0,.20,1.05),(0,.50,.98),'pelvis'),
'tail.L':((0,.45,.98),(-.37,.82,.86),'tail'),
'tail.R':((0,.45,.98),(.37,.82,.86),'tail'),
}
for side,sgn in [('L',-1),('R',1)]:
    x=sgn*.18
    for digit in range(3):
        x_digit=sgn*(.66+digit*.065)
        z_digit=.70-(digit%2)*.035
        bones['wing_digit_%02d.%s' % (digit+1,side)]=((x_digit,0.02,z_digit+.12),(x_digit,0.02,z_digit-.12),'hand.'+side)
    bones.update({
      'hip.'+side:((x,0,.84),(x,0,.63),'pelvis'),
      'leg_upper.'+side:((x,0,.63),(x,0,.38),'hip.'+side),
      'leg_lower.'+side:((x,0,.38),(x,-.015,.19),'leg_upper.'+side),
      'foot.'+side:((x,-.01,.19),(x,-.24,.12),'leg_lower.'+side),
      'toe.'+side:((x,-.2,.12),(x,-.39,.10),'foot.'+side),
    })
edit_bones={}
for name,(head,tail,parent) in bones.items():
    b=arm_data.edit_bones.new(name); b.head=head; b.tail=tail
    if parent:b.parent=arm_data.edit_bones[parent]
    edit_bones[name]=b
# Deform off for utility facial/brow controls; weighted eyes use deforming gaze bones.
for name in ['eyelid.L','eyelid.R']:
    edit_bones[name].use_deform=False
bpy.ops.object.mode_set(mode='OBJECT')
# Protect rigid feature weights while still using a single mesh + armature skin.
mod=body.modifiers.new('Swa Production Skin','ARMATURE'); mod.object=arm
body.parent=arm
body.matrix_parent_inverse=arm.matrix_world.inverted()
# All group weights were assigned rigidly. Prevent armature rest transforms from moving it.
# Set pose position and bone display cleanly.
arm.show_in_front=True; arm_data.display_type='OCTAHEDRAL'; arm_data.pose_position='POSE'
for pb in arm.pose.bones: pb.rotation_mode='XYZ'

# Reusable named actions, with locomotion loops and short expressive moments.
anim_specs={
'Idle':('loop',24,{'spine':[(1,(0,0,0)),(7,(.018,0,0)),(13,(0,0,0)),(19,(-.012,0,0)),(24,(0,0,0))],'head':[(1,(0,0,0)),(12,(.015,0,.025)),(24,(0,0,0))],'wing_upper.L':[(1,(0,0,0)),(24,(0,0,0))]}),
'Idle_Variation':('loop',48,{'head':[(1,(0,0,0)),(14,(.025,0,.08)),(25,(0,0,0)),(37,(-.018,0,-.06)),(48,(0,0,0))],'wing_upper.L':[(1,(0,0,0)),(19,(0,0,-.04)),(29,(0,0,0)),(48,(0,0,0))]}),
'Walk':('loop',24,{'leg_upper.L':[(1,(.42,0,0)),(7,(0,0,0)),(13,(-.42,0,0)),(19,(0,0,0)),(24,(.42,0,0))],'leg_upper.R':[(1,(-.42,0,0)),(7,(0,0,0)),(13,(.42,0,0)),(19,(0,0,0)),(24,(-.42,0,0))],'leg_lower.L':[(1,(-.10,0,0)),(7,(.25,0,0)),(13,(0,0,0)),(19,(.25,0,0)),(24,(-.10,0,0))],'leg_lower.R':[(1,(0,0,0)),(7,(.25,0,0)),(13,(-.10,0,0)),(19,(.25,0,0)),(24,(0,0,0))],'wing_upper.L':[(1,(0,0,.10)),(13,(0,0,-.10)),(24,(0,0,.10))],'wing_upper.R':[(1,(0,0,-.10)),(13,(0,0,.10)),(24,(0,0,-.10))],'spine':[(1,(.04,0,0)),(7,(0,0,0)),(13,(.04,0,0)),(19,(0,0,0)),(24,(.04,0,0))]}),
'Run':('loop',18,{'leg_upper.L':[(1,(.76,0,0)),(5,(0,0,0)),(10,(-.76,0,0)),(14,(0,0,0)),(18,(.76,0,0))],'leg_upper.R':[(1,(-.76,0,0)),(5,(0,0,0)),(10,(.76,0,0)),(14,(0,0,0)),(18,(-.76,0,0))],'leg_lower.L':[(1,(.0,0,0)),(5,(.55,0,0)),(10,(0,0,0)),(14,(.55,0,0)),(18,(0,0,0))],'leg_lower.R':[(1,(.55,0,0)),(5,(0,0,0)),(10,(.0,0,0)),(14,(.55,0,0)),(18,(.55,0,0))],'wing_upper.L':[(1,(0,0,.30)),(10,(0,0,-.30)),(18,(0,0,.30))],'wing_upper.R':[(1,(0,0,-.30)),(10,(0,0,.30)),(18,(0,0,-.30))],'spine':[(1,(.12,0,0)),(5,(0,0,0)),(10,(.12,0,0)),(14,(0,0,0)),(18,(.12,0,0))]}),
'Start_Walking':('once',16,{'spine':[(1,(0,0,0)),(8,(.12,0,0)),(16,(.04,0,0))],'wing_upper.L':[(1,(0,0,0)),(8,(0,0,.22)),(16,(0,0,.10))],'wing_upper.R':[(1,(0,0,0)),(8,(0,0,-.22)),(16,(0,0,-.10))]}),
'Stop_Walking':('once',14,{'spine':[(1,(.09,0,0)),(7,(-.035,0,0)),(14,(0,0,0))],'wing_upper.L':[(1,(0,0,.15)),(14,(0,0,0))],'wing_upper.R':[(1,(0,0,-.15)),(14,(0,0,0))]}),
'Turn_Left':('once',20,{'root':[(1,(0,0,0)),(7,(0,-.30,0)),(14,(0,-.42,0)),(20,(0,0,0))],'head':[(1,(0,0,0)),(7,(0,.08,0)),(20,(0,0,0))]}),
'Turn_Right':('once',20,{'root':[(1,(0,0,0)),(7,(0,.30,0)),(14,(0,.42,0)),(20,(0,0,0))],'head':[(1,(0,0,0)),(7,(0,-.08,0)),(20,(0,0,0))]}),
'Wave':('once',34,{'wing_upper.R':[(1,(0,0,0)),(8,(0,0,-.72)),(17,(0,0,-.95)),(25,(0,0,-.68)),(34,(0,0,0))],'wing_lower.R':[(1,(0,0,0)),(8,(0,0,-.34)),(17,(0,0,.28)),(25,(0,0,-.28)),(34,(0,0,0))],'hand.R':[(1,(0,0,0)),(11,(0,0,.28)),(19,(0,0,-.28)),(27,(0,0,.28)),(34,(0,0,0))],'head':[(1,(0,0,0)),(8,(0,0,.08)),(25,(0,0,.08)),(34,(0,0,0))]}),
'Point':('once',28,{'wing_upper.R':[(1,(0,0,0)),(9,(0,0,-.55)),(18,(0,0,-.55)),(28,(0,0,0))],'wing_lower.R':[(1,(0,0,0)),(9,(0,0,-.42)),(18,(0,0,-.42)),(28,(0,0,0))],'hand.R':[(1,(0,0,0)),(9,(0,0,-.12)),(18,(0,0,-.12)),(28,(0,0,0))],'head':[(1,(0,0,0)),(9,(0,0,.14)),(18,(0,0,.14)),(28,(0,0,0))]}),
'Look_Around':('once',40,{'head':[(1,(0,0,0)),(10,(0,.3,0)),(20,(0,-.28,0)),(30,(0,.12,0)),(40,(0,0,0))],'eye.L':[(1,(0,0,0)),(10,(0,.2,0)),(20,(0,-.2,0)),(40,(0,0,0))],'eye.R':[(1,(0,0,0)),(10,(0,.2,0)),(20,(0,-.2,0)),(40,(0,0,0))]}),
'Look_At_Object':('once',24,{'eye.L':[(1,(0,0,0)),(8,(.08,.10,0)),(17,(.08,.10,0)),(24,(0,0,0))],'eye.R':[(1,(0,0,0)),(8,(.08,.10,0)),(17,(.08,.10,0)),(24,(0,0,0))],'head':[(1,(0,0,0)),(8,(.035,.07,0)),(24,(0,0,0))]}),
'Head_Nod':('once',22,{'head':[(1,(0,0,0)),(6,(.20,0,0)),(11,(-.06,0,0)),(16,(.13,0,0)),(22,(0,0,0))],'neck':[(1,(0,0,0)),(6,(.10,0,0)),(16,(.04,0,0)),(22,(0,0,0))]}),
'Head_Shake':('once',24,{'head':[(1,(0,0,0)),(6,(0,.23,0)),(12,(0,-.23,0)),(18,(0,.14,0)),(24,(0,0,0))]}),
'Curious':('once',32,{'head':[(1,(0,0,0)),(9,(.02,.05,.16)),(23,(.02,.05,.16)),(32,(0,0,0))],'neck':[(1,(0,0,0)),(9,(0,0,.10)),(23,(0,0,.10)),(32,(0,0,0))]}),
'Thinking':('once',42,{'head':[(1,(0,0,0)),(10,(.14,.10,0)),(31,(.14,.10,0)),(42,(0,0,0))],'wing_upper.L':[(1,(0,0,0)),(10,(0,0,.45)),(31,(0,0,.45)),(42,(0,0,0))],'wing_lower.L':[(1,(0,0,0)),(12,(0,0,.55)),(31,(0,0,.55)),(42,(0,0,0))]}),
'Confused':('once',28,{'head':[(1,(0,0,0)),(8,(.08,0,-.16)),(20,(.08,0,-.16)),(28,(0,0,0))],'brow.L':[(1,(0,0,0)),(8,(0,0,.10)),(20,(0,0,.10)),(28,(0,0,0))],'wing_upper.R':[(1,(0,0,0)),(10,(0,0,-.3)),(20,(0,0,-.3)),(28,(0,0,0))]}),
'Excited':('once',26,{'spine':[(1,(0,0,0)),(6,(-.18,0,0)),(13,(.02,0,0)),(20,(-.08,0,0)),(26,(0,0,0))],'wing_upper.L':[(1,(0,0,0)),(7,(0,0,.88)),(15,(0,0,.98)),(26,(0,0,0))],'wing_upper.R':[(1,(0,0,0)),(7,(0,0,-.88)),(15,(0,0,-.98)),(26,(0,0,0))],'head':[(1,(0,0,0)),(8,(0,0,0)),(15,(.04,0,0)),(26,(0,0,0))]}),
'Happy':('once',30,{'head':[(1,(0,0,0)),(8,(-.04,0,0)),(21,(-.04,0,0)),(30,(0,0,0))],'wing_upper.L':[(1,(0,0,0)),(8,(0,0,.28)),(21,(0,0,.28)),(30,(0,0,0))],'wing_upper.R':[(1,(0,0,0)),(8,(0,0,-.28)),(21,(0,0,-.28)),(30,(0,0,0))]}),
'Sad':('once',34,{'spine':[(1,(0,0,0)),(10,(.15,0,0)),(24,(.15,0,0)),(34,(0,0,0))],'head':[(1,(0,0,0)),(10,(.18,0,0)),(24,(.18,0,0)),(34,(0,0,0))],'wing_upper.L':[(1,(0,0,0)),(10,(0,0,-.24)),(24,(0,0,-.24)),(34,(0,0,0))],'wing_upper.R':[(1,(0,0,0)),(10,(0,0,.24)),(24,(0,0,.24)),(34,(0,0,0))]}),
'Celebrate':('once',40,{'spine':[(1,(0,0,0)),(7,(-.22,0,0)),(15,(.08,0,0)),(24,(-.14,0,0)),(32,(.03,0,0)),(40,(0,0,0))],'wing_upper.L':[(1,(0,0,0)),(8,(0,0,.96)),(21,(0,0,.82)),(32,(0,0,.96)),(40,(0,0,0))],'wing_upper.R':[(1,(0,0,0)),(8,(0,0,-.96)),(21,(0,0,-.82)),(32,(0,0,-.96)),(40,(0,0,0))],'leg_upper.L':[(1,(0,0,0)),(8,(.20,0,0)),(15,(-.12,0,0)),(22,(.18,0,0)),(40,(0,0,0))],'leg_upper.R':[(1,(0,0,0)),(8,(-.20,0,0)),(15,(.12,0,0)),(22,(-.18,0,0)),(40,(0,0,0))]}),
'Victory_Small':('once',30,{'wing_upper.R':[(1,(0,0,0)),(8,(0,0,-.42)),(19,(0,0,-.42)),(30,(0,0,0))],'head':[(1,(0,0,0)),(8,(-.08,0,0)),(19,(-.08,0,0)),(30,(0,0,0))]}),
'Victory_Big':('once',46,{'wing_upper.L':[(1,(0,0,0)),(10,(0,0,.95)),(24,(0,0,1.08)),(36,(0,0,.92)),(46,(0,0,0))],'wing_upper.R':[(1,(0,0,0)),(10,(0,0,-.95)),(24,(0,0,-1.08)),(36,(0,0,-.92)),(46,(0,0,0))],'spine':[(1,(0,0,0)),(10,(-.25,0,0)),(20,(.05,0,0)),(31,(-.16,0,0)),(46,(0,0,0))],'head':[(1,(0,0,0)),(10,(-.10,0,0)),(24,(0,0,0)),(46,(0,0,0))]}),
'Attack':('once',26,{'spine':[(1,(0,0,0)),(7,(.18,0,0)),(13,(-.20,0,0)),(19,(.08,0,0)),(26,(0,0,0))],'wing_upper.R':[(1,(0,0,0)),(7,(0,0,-.72)),(13,(0,0,-1.00)),(18,(0,0,-.32)),(26,(0,0,0))],'wing_lower.R':[(1,(0,0,0)),(8,(0,0,-.50)),(14,(0,0,-.9)),(20,(0,0,0)),(26,(0,0,0))],'head':[(1,(0,0,0)),(8,(-.05,0,0)),(14,(.07,0,0)),(26,(0,0,0))]}),
'Attack_Reaction':('once',25,{'spine':[(1,(0,0,0)),(6,(.16,0,0)),(12,(-.12,0,0)),(19,(.04,0,0)),(25,(0,0,0))],'head':[(1,(0,0,0)),(6,(.1,.12,0)),(15,(0,0,0)),(25,(0,0,0))]}),
'Hit_Reaction':('once',26,{'spine':[(1,(0,0,0)),(5,(0,0,-.12)),(9,(0,0,.16)),(15,(0,0,-.06)),(26,(0,0,0))],'head':[(1,(0,0,0)),(5,(0,0,-.14)),(10,(.10,0,.06)),(26,(0,0,0))],'wing_upper.L':[(1,(0,0,0)),(5,(0,0,.52)),(15,(0,0,.10)),(26,(0,0,0))],'wing_upper.R':[(1,(0,0,0)),(5,(0,0,-.52)),(15,(0,0,-.10)),(26,(0,0,0))]}),
'Defeated':('once',44,{'spine':[(1,(0,0,0)),(14,(.26,0,0)),(35,(.26,0,0)),(44,(.10,0,0))],'head':[(1,(0,0,0)),(14,(.3,0,0)),(35,(.3,0,0)),(44,(.18,0,0))],'wing_upper.L':[(1,(0,0,0)),(14,(0,0,-.32)),(35,(0,0,-.32)),(44,(0,0,-.25))],'wing_upper.R':[(1,(0,0,0)),(14,(0,0,.32)),(35,(0,0,.32)),(44,(0,0,.25))]}),
'Ready_Battle_Stance':('once',30,{'spine':[(1,(0,0,0)),(9,(.12,0,0)),(22,(.12,0,0)),(30,(0,0,0))],'wing_upper.L':[(1,(0,0,0)),(9,(0,0,.48)),(22,(0,0,.48)),(30,(0,0,0))],'wing_upper.R':[(1,(0,0,0)),(9,(0,0,-.48)),(22,(0,0,-.48)),(30,(0,0,0))],'leg_upper.L':[(1,(0,0,0)),(9,(.16,0,0)),(22,(.16,0,0)),(30,(0,0,0))],'leg_upper.R':[(1,(0,0,0)),(9,(-.16,0,0)),(22,(-.16,0,0)),(30,(0,0,0))]}),
'Listening':('once',32,{'head':[(1,(0,0,0)),(8,(.02,0,.07)),(23,(.02,0,.07)),(32,(0,0,0))],'wing_upper.L':[(1,(0,0,0)),(8,(0,0,.06)),(32,(0,0,0))]}),
'Correct_Answer':('once',32,{'spine':[(1,(0,0,0)),(7,(-.16,0,0)),(17,(.04,0,0)),(32,(0,0,0))],'wing_upper.L':[(1,(0,0,0)),(8,(0,0,.65)),(20,(0,0,.45)),(32,(0,0,0))],'wing_upper.R':[(1,(0,0,0)),(8,(0,0,-.65)),(20,(0,0,-.45)),(32,(0,0,0))]}),
'Wrong_Answer':('once',30,{'head':[(1,(0,0,0)),(7,(.1,0,-.16)),(19,(.1,0,-.16)),(30,(0,0,0))],'spine':[(1,(0,0,0)),(7,(.09,0,0)),(19,(.09,0,0)),(30,(0,0,0))],'wing_upper.L':[(1,(0,0,0)),(7,(0,0,-.16)),(19,(0,0,-.16)),(30,(0,0,0))]}),
'Encourage':('once',34,{'wing_upper.R':[(1,(0,0,0)),(8,(0,0,-.38)),(21,(0,0,-.38)),(34,(0,0,0))],'head':[(1,(0,0,0)),(8,(-.08,0,0)),(21,(-.08,0,0)),(34,(0,0,0))]}),
'Discover':('once',36,{'head':[(1,(0,0,0)),(8,(-.11,0,0)),(15,(.04,0,0)),(36,(0,0,0))],'wing_upper.L':[(1,(0,0,0)),(9,(0,0,.64)),(20,(0,0,.50)),(36,(0,0,0))],'wing_upper.R':[(1,(0,0,0)),(9,(0,0,-.64)),(20,(0,0,-.50)),(36,(0,0,0))]}),
'Lets_Go':('once',35,{'spine':[(1,(0,0,0)),(8,(-.18,0,0)),(18,(.04,0,0)),(35,(0,0,0))],'wing_upper.L':[(1,(0,0,0)),(8,(0,0,.72)),(20,(0,0,.55)),(35,(0,0,0))],'wing_upper.R':[(1,(0,0,0)),(8,(0,0,-.72)),(20,(0,0,-.55)),(35,(0,0,0))]}),
'Jump':('once',30,{'root':[(1,(0,0,0)),(7,(0,0,0)),(14,(0,0,.62)),(19,(0,0,.62)),(27,(0,0,0)),(30,(0,0,0))],'leg_upper.L':[(1,(0,0,0)),(9,(.32,0,0)),(19,(.32,0,0)),(30,(0,0,0))],'leg_upper.R':[(1,(0,0,0)),(9,(-.32,0,0)),(19,(-.32,0,0)),(30,(0,0,0))],'wing_upper.L':[(1,(0,0,0)),(10,(0,0,.72)),(19,(0,0,.72)),(30,(0,0,0))],'wing_upper.R':[(1,(0,0,0)),(10,(0,0,-.72)),(19,(0,0,-.72)),(30,(0,0,0))]}),
'Fall':('once',24,{'root':[(1,(0,0,.25)),(8,(0,0,-.1)),(17,(0,0,-.45)),(24,(0,0,-.55))],'spine':[(1,(0,0,0)),(10,(.26,0,0)),(24,(.26,0,0))],'wing_upper.L':[(1,(0,0,0)),(10,(0,0,.56)),(24,(0,0,.56))],'wing_upper.R':[(1,(0,0,0)),(10,(0,0,-.56)),(24,(0,0,-.56))]}),
'Land':('once',24,{'root':[(1,(0,0,-.35)),(6,(0,0,.05)),(12,(0,0,0)),(24,(0,0,0))],'spine':[(1,(.12,0,0)),(7,(-.12,0,0)),(16,(0,0,0)),(24,(0,0,0))],'leg_upper.L':[(1,(.25,0,0)),(7,(-.08,0,0)),(24,(0,0,0))],'leg_upper.R':[(1,(-.25,0,0)),(7,(.08,0,0)),(24,(0,0,0))]}),
'Sleep':('loop',48,{'spine':[(1,(.20,0,0)),(13,(.22,0,0)),(25,(.20,0,0)),(37,(.22,0,0)),(48,(.20,0,0))],'head':[(1,(.25,0,.16)),(12,(.28,0,.16)),(24,(.25,0,.16)),(36,(.28,0,.16)),(48,(.25,0,.16))],'wing_upper.L':[(1,(0,0,-.08)),(48,(0,0,-.08))],'wing_upper.R':[(1,(0,0,.08)),(48,(0,0,.08))]}),
'Rest':('loop',36,{'spine':[(1,(.07,0,0)),(18,(.08,0,0)),(36,(.07,0,0))],'head':[(1,(.05,0,0)),(18,(.06,0,0)),(36,(.05,0,0))]}),
}

# Wing bones have a custom local axis from their diagonal rest orientation. Convert
# authored lateral rotation into the local lift axis for clear waves and victories.
LIFT_ACTIONS={'Walk','Run','Wave','Point','Thinking','Confused','Excited','Happy','Sad','Celebrate','Victory_Small','Victory_Big','Attack','Attack_Reaction','Hit_Reaction','Defeated','Ready_Battle_Stance','Correct_Answer','Wrong_Answer','Encourage','Discover','Lets_Go','Jump'}
raw_wing_tracks={action:{bone:list(keys) for bone,keys in spec.items() if bone.startswith('wing_upper.') or bone.startswith('wing_lower.')} for action,(mode,last,spec) in anim_specs.items()}
for action_name,(mode,last,spec) in anim_specs.items():
    if action_name not in LIFT_ACTIONS: continue
    for bone_name,keys in list(spec.items()):
        if bone_name.startswith('wing_upper.') or bone_name.startswith('wing_lower.'):
            spec[bone_name]=[(frame,(-abs(value[2])*2.6,value[1],value[2])) for frame,value in keys]

# Broad celebratory gestures read best with a lateral feather spread; keep those
# authored on the wings' outward local axis after the head-height lift tests.
SPREAD_ACTIONS={'Walk','Run','Wave','Point','Excited','Happy','Celebrate','Victory_Small','Victory_Big','Attack','Correct_Answer','Discover','Lets_Go'}
for action_name in SPREAD_ACTIONS:
    spec=anim_specs[action_name][2]
    for bone_name,keys in raw_wing_tracks.get(action_name,{}).items():
        spec[bone_name]=keys

# A little finger fan gives the Wave and Point clips an articulated wing-hand.
wave_spec=anim_specs['Wave'][2]
for digit in range(1,4):
    wave_spec['wing_digit_%02d.R' % digit]=[(1,(0,0,0)),(12,(.04,0,.10*(digit-2))),(18,(.08,0,.16*(digit-2))),(27,(.04,0,.10*(digit-2))),(34,(0,0,0))]

def set_pose(spec, frame):
    for pb in arm.pose.bones:
        pb.location=(0,0,0); pb.rotation_euler=(0,0,0); pb.scale=(1,1,1)
    for bone,keys in spec.items():
        pb=arm.pose.bones.get(bone)
        if not pb: continue
        frames=[k[0] for k in keys]
        if frame<=frames[0]: value=keys[0][1]
        elif frame>=frames[-1]:value=keys[-1][1]
        else:
            for (fa,va),(fb,vb) in zip(keys,keys[1:]):
                if fa<=frame<=fb:
                    t=(frame-fa)/(fb-fa); t=t*t*(3-2*t)
                    value=tuple(va[i]+(vb[i]-va[i])*t for i in range(3)); break
        pb.rotation_euler=value

def build_actions():
    arm.animation_data_create()
    for name,(mode,last,spec) in anim_specs.items():
        action=bpy.data.actions.new(name=name)
        arm.animation_data.action=action
        frames=sorted(set([1,last]+[f for keys in spec.values() for f,_ in keys]))
        # Key only involved bones; define entire clip from a clean neutral state.
        touched=list(spec.keys())
        for fr in frames:
            scene.frame_set(fr)
            set_pose({b:spec[b] for b in touched},fr)
            for b in touched:
                pb=arm.pose.bones[b]
                pb.keyframe_insert(data_path='rotation_euler',frame=fr,group=b)
                if b=='root': pb.keyframe_insert(data_path='location',frame=fr,group=b)
        action.use_fake_user=True
        action['swa_loop']=mode=='loop'
    arm.animation_data.action=bpy.data.actions.get('Idle')
    scene.frame_start=1; scene.frame_end=24; scene.frame_set(1)
build_actions()

# Authoring metadata retained in the .blend.
body['Character']='Swa / Swallern original learning companion'
body['Geometry note']='Single low/medium-poly weighted mesh; material palette and shape key expressions; no image textures.'
arm['Rig note']='Full body articulated rig with separate gaze, brow, eyelid, jaw, wing, finger, foot, and tail controls.'
scene['Swa_animation_library']=', '.join(anim_specs.keys())

# Hero preview lighting and camera. Render multiple requested inspection angles.
def make_studio():
    scene.render.engine='BLENDER_EEVEE'; scene.eevee.taa_render_samples=16
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.025,.041,.075,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.45
    def area(name,loc,power,color,size,target=(0,0,1.4)):
        d=bpy.data.lights.new(name,'AREA'); d.energy=power; d.color=color; d.shape='DISK'; d.size=size
        o=bpy.data.objects.new(name,d); bpy.context.collection.objects.link(o); o.location=loc; o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    area('Key softbox',(-4,-5,7),720,(.64,.80,1),5)
    area('Blue rim',(3,2,5),900,(.18,.42,1),4)
    area('Warm fill',(4,-4,2.8),350,(1,.60,.33),3)
    area('Face bounce',(0,-4,1.6),170,(.56,1,.93),2)
    camd=bpy.data.cameras.new('Swa Preview Camera'); cam=bpy.data.objects.new('Swa Preview Camera',camd); bpy.context.collection.objects.link(cam); scene.camera=cam
    camd.type='ORTHO'; camd.ortho_scale=3.45; camd.lens=55
    return cam
cam=make_studio()
# Camera positions, all framing centered around the complete character and tail.
views={
'front':((0,-8.2,3.0),(0,0,1.42)),
'back':((0,8.2,3.0),(0,0,1.42)),
'left':((-8.2,0,3.0),(0,0,1.42)),
'right':((8.2,0,3.0),(0,0,1.42)),
'three_quarter':((5.7,-7.2,4.0),(0,0,1.45)),
'gameplay_distance':((0,-10.8,4.4),(0,0,1.45)),
}
if os.environ.get('SWA_SKIP_PREVIEWS') != '1':
    for label,(pos,target) in views.items():
        cam.location=pos; cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.ortho_scale=3.65 if label!='gameplay_distance' else 4.8
        scene.render.filepath=os.path.join(PREVIEW_DIR,'swa_'+label+'.png')
        bpy.ops.render.render(write_still=True)
# Restore front camera and save source blend.
cam.location=views['three_quarter'][0]; cam.rotation_euler=(Vector(views['three_quarter'][1])-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.ortho_scale=3.65
scene.render.filepath=os.path.join(PREVIEW_DIR,'swa_three_quarter.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(os.path.dirname(__file__),'swa.blend'))
# Export clean production GLB: one skinned mesh, one armature and all named actions.
for o in bpy.context.selected_objects:o.select_set(False)
arm.select_set(True); body.select_set(True); bpy.context.view_layer.objects.active=arm
bpy.ops.export_scene.gltf(filepath=os.path.join(MODEL_DIR,'swa.glb'), export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='ACTIONS', export_morph=True, export_skins=True,
    export_materials='EXPORT', export_image_format='AUTO', export_cameras=False, export_lights=False,
    export_apply=False, export_optimize_animation_size=True, export_force_sampling=True)
print('SWA_BUILD_RESULT', {'mesh_vertices':len(body.data.vertices),'mesh_polygons':len(body.data.polygons),'bones':len(arm.data.bones),'animations':len(anim_specs),'blend_shapes':[k.name for k in body.data.shape_keys.key_blocks], 'glb':os.path.getsize(os.path.join(MODEL_DIR,'swa.glb'))})
