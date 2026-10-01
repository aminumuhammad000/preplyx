class_name SwaCharacter
extends Node3D
"""Reusable visual character controller. Game state and input live in outer controllers."""

signal animation_changed(animation_name: StringName)
signal expression_changed(expression_name: StringName)

@export var animation_player_path: NodePath = NodePath("SwaModel/AnimationPlayer")
@export var skeleton_path: NodePath = NodePath("SwaModel/Armature/Skeleton3D")

@export_range(0.05, 1.0, 0.01) var animation_blend_time := 0.22
@export_range(0.0, 1.0, 0.01) var gaze_weight := 0.72

var animation_player: AnimationPlayer
var skeleton: Skeleton3D
var _mesh_instances: Array[MeshInstance3D] = []
var _animation_names: Dictionary = {}
var _current_animation := ""
var _expression := ""
var _expression_values: Dictionary = {}
var _expression_timer := 0.0
var _blink_timer := 0.0
var _blink_cooldown := 3.2
var _rng := RandomNumberGenerator.new()
var _look_target: Node3D
var _look_point := Vector3.ZERO
var _has_look_point := false
var _eye_bones: Array[int] = []
var _head_bone := -1
var _antenna_bone := -1
var _wanted_ant_rot := Vector3.ZERO

const LOOPING_ANIMATIONS := [
	"idle", "idle_breathing", "idle_look_around", "idlevariation", "walk", "run", "sleep", "rest", "dance"
]

const EXPRESSION_KEYS := [
	# Legacy names
	"Blink", "Happy", "Surprised", "Confused", "Sad", "Determined", "Sleepy", "BeakOpen",
	# SWA V3 Production Morphs
	"blink_L", "blink_R", "blink_both", "squint_L", "squint_R", "squint", "wide_L", "wide_R", "wide",
	"brow_raise_L", "brow_raise_R", "brow_lower_L", "brow_lower_R",
	"brow_tilt_in_L", "brow_tilt_in_R", "brow_tilt_out_L", "brow_tilt_out_R",
	"mouth_smile_small", "mouth_smile_open", "mouth_smile_big", "mouth_frown",
	"mouth_worried", "mouth_surprised_O", "mouth_pursed_think", "mouth_laugh", "mouth_shy", "mouth_smirk",
	"smile", "smile_big", "open", "surprised_mouth", "sad_mouth", "angry_mouth", "confused_mouth", "laugh_mouth",
	"phoneme_A", "phoneme_E", "phoneme_O", "phoneme_M",
	"blush", "blush_strong", "blush_off",
	"gaze_left", "gaze_right", "gaze_up", "gaze_down",
	"happy", "sad", "surprised", "angry", "thinking", "laugh", "confused", "sleepy", "crying", "excited", "proud", "worried", "very_happy", "wink", "shy",
	"hand_fist_L", "hand_point_L", "hand_thumbs_up_L", "hand_open_L",
	"hand_fist_R", "hand_point_R", "hand_thumbs_up_R", "hand_open_R",
	"squash", "stretch",
	"corrective_arm_up_L", "corrective_elbow_bend_L", "corrective_knee_bend_L",
	"corrective_arm_up_R", "corrective_elbow_bend_R", "corrective_knee_bend_R"
]

const ACTION_CANDIDATES := {
	"idle": ["Idle_Breathing", "Idle", "Idle_Look_Around"],
	"idle_variation": ["Idle_Look_Around", "Idle_Variation", "Idle_Breathing"],
	"walk": ["Walk"],
	"run": ["Run"],
	"turn_left": ["Turn_Left"],
	"turn_right": ["Turn_Right"],
	"start_walking": ["Walk", "Start_Walking"],
	"stop_walking": ["Idle_Breathing", "Stop_Walking"],
	"wave": ["Wave"],
	"point": ["Point"],
	"look_around": ["Idle_Look_Around", "Look_Around"],
	"look_at_object": ["Idle_Look_Around", "Look_At_Object"],
	"head_nod": ["Happy_Reaction", "Thumbs_Up", "Head_Nod"],
	"head_shake": ["Disappointed_Reaction", "Thumbs_Down", "Head_Shake"],
	"curious": ["Idle_Look_Around", "Curious", "Think"],
	"think": ["Think", "Thinking"],
	"thinking": ["Think", "Thinking"],
	"confused": ["Emotion_Confused", "Confused"],
	"excited": ["Emotion_Excited", "Excited", "Happy_Reaction"],
	"happy": ["Happy_Reaction", "Emotion_Happy", "Happy"],
	"sad": ["Emotion_Sad", "Disappointed_Reaction", "Sad"],
	"celebrate": ["Celebrate", "Happy_Reaction"],
	"victory_small": ["Thumbs_Up", "Victory_Small"],
	"victory_big": ["Celebrate", "Victory_Big"],
	"attack": ["Point", "Wave", "Attack"],
	"attack_reaction": ["Disappointed_Reaction", "Attack_Reaction"],
	"take_hit": ["Surprised_Reaction", "Hit_Reaction"],
	"defeated": ["Disappointed_Reaction", "Defeated"],
	"ready": ["Idle_Breathing", "Ready_Battle_Stance"],
	"listening": ["Idle_Breathing", "Listening"],
	"react_correct": ["Happy_Reaction", "Celebrate", "Correct_Answer"],
	"react_wrong": ["Disappointed_Reaction", "Emotion_Confused", "Wrong_Answer"],
	"encourage": ["Thumbs_Up", "Wave", "Celebrate", "Encourage"],
	"discover": ["Surprised_Reaction", "Discover"],
	"lets_go": ["Wave", "Celebrate", "Lets_Go"],
	"jump": ["Jump"],
	"fall": ["Jump", "Land", "Fall"],
	"land": ["Land"],
	"sleep": ["Sleep"],
	"rest": ["Sleep", "Sit", "Rest"],
	"sit": ["Sit"],
	"stand": ["Stand"],
	"clap": ["Clap"],
	"dance": ["Dance"],
	"greet": ["Greet"],
	"goodbye": ["Goodbye"],
	"heart_gesture": ["Heart_Gesture"],
	"thumbs_up": ["Thumbs_Up"],
	"thumbs_down": ["Thumbs_Down"]
}

func _ready() -> void:
	process_priority = 10
	_rng.randomize()
	_blink_cooldown = _rng.randf_range(2.8, 5.0)
	animation_player = get_node_or_null(animation_player_path) as AnimationPlayer
	if animation_player == null:
		animation_player = _find_descendant(self, "AnimationPlayer") as AnimationPlayer
	if animation_player:
		for name in animation_player.get_animation_list():
			_animation_names[_normalize(name)] = name
			var anim := animation_player.get_animation(name)
			if _normalize(name) in LOOPING_ANIMATIONS or name.to_lower().begins_with("idle") or name.to_lower() == "dance":
				anim.loop_mode = Animation.LOOP_LINEAR
			else:
				anim.loop_mode = Animation.LOOP_NONE
		if not animation_player.animation_finished.is_connected(_on_animation_finished):
			animation_player.animation_finished.connect(_on_animation_finished)
	else:
		push_warning("SwaCharacter could not find an AnimationPlayer below its model.")

	skeleton = get_node_or_null(skeleton_path) as Skeleton3D
	if skeleton == null:
		skeleton = _find_descendant(self, "Skeleton3D") as Skeleton3D
	if skeleton:
		# Support both SWA V3 (SWA_HEAD) and legacy (head)
		_head_bone = skeleton.find_bone("SWA_HEAD")
		if _head_bone < 0:
			_head_bone = skeleton.find_bone("head")
		
		_antenna_bone = skeleton.find_bone("SWA_ANTENNA")
		
		# Support both SWA V3 (SWA_EYE_L/R) and legacy (eye.L/R)
		for bone_name in ["SWA_EYE_L", "SWA_EYE_R", "eye.L", "eye.R"]:
			var index := skeleton.find_bone(bone_name)
			if index >= 0 and not index in _eye_bones:
				_eye_bones.append(index)
	
	_collect_meshes(self)
	idle()

func _process(delta: float) -> void:
	_blink_cooldown -= delta
	if _blink_cooldown <= 0.0 and _expression != "Sleepy":
		trigger_blink()
		_blink_cooldown = _rng.randf_range(2.8, 5.0)
	if _expression_timer > 0.0:
		_expression_timer -= delta
		if _expression_timer <= 0.0 and _expression != "":
			set_expression("neutral")
	if _blink_timer > 0.0:
		_blink_timer -= delta
		if _blink_timer <= 0.0:
			_expression_values["Blink"] = 0.0
			_expression_values["blink_both"] = 0.0
	
	# Articulate antenna bone smoothly with emotional pose and subtle breathing
	if skeleton and _antenna_bone >= 0:
		var cur_rot := skeleton.get_bone_pose_rotation(_antenna_bone)
		var idle_pitch := 0.0
		if _expression == "" or _expression == "Neutral":
			idle_pitch = sin(Time.get_ticks_msec() * 0.0025) * 0.03
		var target_rot := Quaternion.from_euler(_wanted_ant_rot + Vector3(idle_pitch, 0, 0))
		skeleton.set_bone_pose_rotation(_antenna_bone, cur_rot.slerp(target_rot, delta * 5.0))
	
	for mesh_instance in _mesh_instances:
		var mesh := mesh_instance.mesh
		if mesh == null: continue
		for key in EXPRESSION_KEYS:
			var index: int = -1
			for blend_index in mesh.get_blend_shape_count():
				if mesh.get_blend_shape_name(blend_index) == StringName(key):
					index = blend_index
					break
			if index >= 0:
				var target: float = _expression_values.get(key, 0.0)
				var current: float = mesh_instance.get_blend_shape_value(index)
				mesh_instance.set_blend_shape_value(index, move_toward(current, target, delta * 5.5))
	_update_gaze(delta)

func play_action(action: StringName, blend := -1.0) -> void:
	if animation_player == null: return
	var action_key := _normalize(String(action))
	var resolved := ""
	
	# Try candidates list first
	var candidates: Array = ACTION_CANDIDATES.get(String(action).to_lower(), ACTION_CANDIDATES.get(action_key, []))
	for candidate in candidates:
		var norm_c := _normalize(candidate)
		if _animation_names.has(norm_c):
			resolved = _animation_names[norm_c]
			break
	
	# Fallback to direct name match
	if resolved.is_empty():
		resolved = _animation_names.get(action_key, "")
	
	if resolved.is_empty():
		push_warning("Swa animation not found: %s" % action)
		return
	if _current_animation == resolved and animation_player.is_playing(): return
	_current_animation = resolved
	animation_player.play(resolved, animation_blend_time if blend < 0.0 else blend)
	animation_changed.emit(StringName(resolved))

func idle() -> void: play_action(&"idle")
func idle_variation() -> void: play_action(&"idle_variation")
func walk() -> void: play_action(&"walk")
func run() -> void: play_action(&"run")
func turn_left() -> void: play_action(&"turn_left")
func turn_right() -> void: play_action(&"turn_right")
func start_walking() -> void: play_action(&"start_walking")
func stop_walking() -> void: play_action(&"stop_walking")
func wave() -> void: play_action(&"wave")
func point() -> void: play_action(&"point")
func look_around() -> void: play_action(&"look_around")
func head_nod() -> void: play_action(&"head_nod")
func head_shake() -> void: play_action(&"head_shake")
func curious() -> void: set_expression("curious"); play_action(&"curious")
func think() -> void: set_expression("thinking"); play_action(&"think")
func confused() -> void: set_expression("confused"); play_action(&"confused")
func excited() -> void: set_expression("excited"); play_action(&"excited")
func happy() -> void: set_expression("happy"); play_action(&"happy")
func sad() -> void: set_expression("sad"); play_action(&"sad")
func celebrate() -> void: set_expression("happy", 1.8); play_action(&"celebrate")
func victory_small() -> void: set_expression("happy", 1.5); play_action(&"victory_small")
func victory_big() -> void: set_expression("happy", 2.2); play_action(&"victory_big")
func attack() -> void: set_expression("determined", 1.1); play_action(&"attack")
func attack_reaction() -> void: play_action(&"attack_reaction")
func take_hit() -> void: set_expression("surprised", 1.0); play_action(&"take_hit")
func defeated() -> void: set_expression("sad", 2.5); play_action(&"defeated")
func ready_battle() -> void: set_expression("determined", 1.4); play_action(&"ready")
func listening() -> void: play_action(&"listening")
func react_correct() -> void: set_expression("happy", 1.7); play_action(&"react_correct")
func react_wrong() -> void: set_expression("confused", 1.2); play_action(&"react_wrong")
func encourage() -> void: set_expression("happy", 1.4); play_action(&"encourage")
func discover() -> void: set_expression("surprised", 1.2); play_action(&"discover")
func lets_go() -> void: set_expression("excited", 1.5); play_action(&"lets_go")
func jump() -> void: play_action(&"jump")
func fall() -> void: play_action(&"fall")
func land() -> void: play_action(&"land")
func sleep() -> void: set_expression("sleepy"); play_action(&"sleep")
func rest() -> void: play_action(&"rest")
func sit() -> void: play_action(&"sit")
func stand() -> void: play_action(&"stand")
func clap() -> void: play_action(&"clap")
func dance() -> void: play_action(&"dance")
func greet() -> void: play_action(&"greet")
func goodbye() -> void: play_action(&"goodbye")
func thumbs_up() -> void: play_action(&"thumbs_up")
func thumbs_down() -> void: play_action(&"thumbs_down")
func heart_gesture() -> void: play_action(&"heart_gesture")

func set_expression(expression_name: String, duration := 0.0) -> void:
	var key := expression_name.to_lower().strip_edges()
	_expression_values.clear()
	match key:
		"neutral", "":
			_expression = ""
			_wanted_ant_rot = Vector3.ZERO
		"blink":
			_expression_values["Blink"] = 1.0
			_expression_values["blink_both"] = 1.0
			_expression = key
			_blink_timer = 0.16
		"happy", "celebrating":
			_expression_values["Happy"] = 1.0
			_expression_values["happy"] = 1.0
			_expression_values["smile"] = 0.8
			_expression_values["blush"] = 0.6
			_wanted_ant_rot = Vector3(deg_to_rad(-10), 0, 0)
			_expression = "Happy"
		"very_happy":
			_expression_values["Happy"] = 1.0
			_expression_values["very_happy"] = 1.0
			_expression_values["smile_big"] = 1.0
			_expression_values["blush_strong"] = 0.85
			_wanted_ant_rot = Vector3(deg_to_rad(-18), 0, deg_to_rad(-4))
			_expression = "Very_Happy"
		"excited":
			_expression_values["Happy"] = 1.0
			_expression_values["excited"] = 1.0
			_expression_values["smile_big"] = 0.85
			_expression_values["blush_strong"] = 0.70
			_wanted_ant_rot = Vector3(deg_to_rad(-20), 0, deg_to_rad(-5))
			_expression = "Excited"
		"surprised":
			_expression_values["Surprised"] = 1.0
			_expression_values["surprised"] = 1.0
			_expression_values["mouth_surprised_O"] = 1.0
			_expression_values["wide"] = 0.6
			_expression_values["blush"] = 0.3
			_wanted_ant_rot = Vector3(deg_to_rad(-14), 0, 0)
			_expression = "Surprised"
		"confused", "curious":
			_expression_values["Confused"] = 0.75
			_expression_values["confused"] = 1.0
			_expression_values["mouth_smirk"] = 0.6
			_expression_values["blush"] = 0.2
			_wanted_ant_rot = Vector3(0, deg_to_rad(-16), deg_to_rad(6))
			_expression = "Confused"
		"thinking":
			_expression_values["Confused"] = 0.5
			_expression_values["thinking"] = 1.0
			_expression_values["mouth_pursed_think"] = 1.0
			_expression_values["blush"] = 0.25
			_wanted_ant_rot = Vector3(deg_to_rad(-8), deg_to_rad(16), 0)
			_expression = "Thinking"
		"sad", "disappointed":
			_expression_values["Sad"] = 1.0
			_expression_values["sad"] = 1.0
			_expression_values["mouth_frown"] = 0.9
			_expression_values["blush_off"] = 1.0
			_wanted_ant_rot = Vector3(deg_to_rad(22), 0, deg_to_rad(-4))
			_expression = "Sad"
		"worried":
			_expression_values["Sad"] = 0.6
			_expression_values["worried"] = 1.0
			_expression_values["mouth_worried"] = 1.0
			_expression_values["blush"] = 0.2
			_wanted_ant_rot = Vector3(deg_to_rad(14), deg_to_rad(10), 0)
			_expression = "Worried"
		"crying":
			_expression_values["Sad"] = 1.0
			_expression_values["crying"] = 1.0
			_expression_values["blush_off"] = 1.0
			_wanted_ant_rot = Vector3(deg_to_rad(28), 0, 0)
			_expression = "Crying"
		"angry", "determined":
			_expression_values["Determined"] = 1.0
			_expression_values["angry"] = 1.0
			_expression_values["mouth_frown"] = 0.8
			_expression_values["blush"] = 0.4
			_wanted_ant_rot = Vector3(deg_to_rad(-15), 0, 0)
			_expression = "Angry"
		"sleepy":
			_expression_values["Sleepy"] = 1.0
			_expression_values["sleepy"] = 1.0
			_expression_values["blush"] = 0.45
			_wanted_ant_rot = Vector3(deg_to_rad(26), 0, 0)
			_expression = "Sleepy"
		"laugh", "laughing":
			_expression_values["Happy"] = 1.0
			_expression_values["laugh"] = 1.0
			_expression_values["mouth_laugh"] = 1.0
			_expression_values["blush_strong"] = 0.80
			_wanted_ant_rot = Vector3(deg_to_rad(-22), 0, 0)
			_expression = "Laugh"
		"proud":
			_expression_values["Happy"] = 0.5
			_expression_values["proud"] = 1.0
			_expression_values["mouth_smirk"] = 0.85
			_expression_values["blush"] = 0.50
			_wanted_ant_rot = Vector3(deg_to_rad(-14), deg_to_rad(-10), 0)
			_expression = "Proud"
		"wink", "winking":
			_expression_values["blink_L"] = 1.0
			_expression_values["wink"] = 1.0
			_expression_values["smile"] = 0.6
			_expression_values["blush"] = 0.60
			_wanted_ant_rot = Vector3(deg_to_rad(-10), deg_to_rad(-14), 0)
			_expression = "Wink"
		"shy":
			_expression_values["shy"] = 1.0
			_expression_values["squint"] = 0.7
			_expression_values["mouth_shy"] = 0.9
			_expression_values["blush_strong"] = 1.0
			_wanted_ant_rot = Vector3(deg_to_rad(10), deg_to_rad(-12), 0)
			_expression = "Shy"
		_:
			if key in EXPRESSION_KEYS:
				_expression_values[key] = 1.0
			_expression = key
	_expression_timer = duration
	expression_changed.emit(StringName(_expression if not _expression.is_empty() else "Neutral"))

func set_blush(intensity: float) -> void:
	var val := clampf(intensity, 0.0, 1.0)
	if val <= 0.05:
		_expression_values["blush_off"] = 1.0
		_expression_values["blush"] = 0.0
		_expression_values["blush_strong"] = 0.0
	elif val <= 0.55:
		_expression_values["blush_off"] = 0.0
		_expression_values["blush"] = val / 0.55
		_expression_values["blush_strong"] = 0.0
	else:
		_expression_values["blush_off"] = 0.0
		_expression_values["blush"] = 1.0
		_expression_values["blush_strong"] = (val - 0.55) / 0.45

func very_happy() -> void: set_expression("very_happy"); play_action(&"celebrate")
func worried() -> void: set_expression("worried"); play_action(&"think")
func crying() -> void: set_expression("crying"); play_action(&"defeated")
func proud() -> void: set_expression("proud"); play_action(&"victory_small")
func wink() -> void: set_expression("wink"); play_action(&"thumbs_up")
func shy() -> void: set_expression("shy"); play_action(&"idle")

func trigger_blink() -> void:
	_expression_values["Blink"] = 1.0
	_expression_values["blink_both"] = 1.0
	_blink_timer = 0.16


func set_wing_digit_pose(side: String, digit: int, degrees: Vector3) -> void:
	if skeleton == null or digit < 1 or digit > 3: return
	var index := skeleton.find_bone("wing_digit_%02d.%s" % [digit, side.to_upper()])
	if index < 0: return
	skeleton.set_bone_pose_rotation(index, Quaternion.from_euler(degrees * PI / 180.0))

func look_at_target(target: Variant, weight := 1.0) -> void:
	gaze_weight = clampf(weight, 0.0, 1.0)
	_has_look_point = false
	if target is Node3D:
		_look_target = target
	elif target is Vector3:
		_look_point = target
		_has_look_point = true

func clear_look_target() -> void:
	_look_target = null
	_has_look_point = false

func face_target(target: Node3D, turn_speed := 3.5) -> void:
	if target == null: return
	var direction := target.global_position - global_position
	direction.y = 0.0
	if direction.length_squared() < 0.0001: return
	var wanted_yaw := atan2(direction.x, direction.z)
	rotation.y = lerp_angle(rotation.y, wanted_yaw, get_process_delta_time() * turn_speed)
	look_at_target(target, gaze_weight)

func _update_gaze(_delta: float) -> void:
	if skeleton == null or (_eye_bones.is_empty() and _head_bone < 0): return
	var target: Vector3
	if is_instance_valid(_look_target): target = _look_target.global_position
	elif _has_look_point: target = _look_point
	else: return
	var target_local := skeleton.to_local(target)
	var indices := _eye_bones.duplicate()
	if _head_bone >= 0: indices.append(_head_bone)
	for index in indices:
		var bone_pos := skeleton.get_bone_global_pose(index).origin
		var direction := (target_local - bone_pos).normalized()
		var yaw := clampf(atan2(direction.x, direction.z), -0.48, 0.48)
		var pitch := clampf(atan2(direction.y, Vector2(direction.x, direction.z).length()), -0.32, 0.32)
		var scale_weight := gaze_weight * (0.20 if index == _head_bone else 0.50)
		var aim := Quaternion(Vector3.UP, yaw * scale_weight) * Quaternion(Vector3.RIGHT, -pitch * scale_weight)
		var current := skeleton.get_bone_pose_rotation(index)
		skeleton.set_bone_pose_rotation(index, current * aim)

func _on_animation_finished(animation_name: StringName) -> void:
	if _current_animation != String(animation_name): return
	_current_animation = ""
	if not _normalize(String(animation_name)) in LOOPING_ANIMATIONS:
		idle()

func _collect_meshes(node: Node) -> void:
	for child in node.get_children():
		if child is MeshInstance3D:
			_mesh_instances.append(child)
		_collect_meshes(child)

func _find_descendant(node: Node, wanted_name: String) -> Node:
	for child in node.get_children():
		if child.name == wanted_name: return child
		var found := _find_descendant(child, wanted_name)
		if found: return found
	return null

func _normalize(value: String) -> String:
	var lowered := value.to_lower()
	var result := ""
	for i in lowered.length():
		var ch := lowered.unicode_at(i)
		if (ch >= 48 and ch <= 57) or (ch >= 97 and ch <= 122): result += String.chr(ch)
	return result
