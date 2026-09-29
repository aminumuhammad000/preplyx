extends Node3D

const SWA_SCENE := preload("res://scenes/swa_character.tscn")
const QUICK_ACTIONS := [
	["IDLE", "Idle"], ["WALK", "Walk"], ["RUN", "Run"], ["WAVE", "Wave"], ["POINT", "Point"],
	["THINK", "Thinking"], ["CURIOUS", "Curious"], ["CONFUSED", "Confused"], ["LISTEN", "Listening"],
	["CORRECT", "Correct_Answer"], ["WRONG", "Wrong_Answer"], ["ATTACK", "Attack"],
	["HIT", "Hit_Reaction"], ["CELEBRATE", "Celebrate"], ["VICTORY", "Victory_Big"], ["SLEEP", "Sleep"]	
]
const EXPRESSIONS := ["Neutral", "Happy", "Surprised", "Confused", "Sad", "Determined", "Sleepy", "Blink"]
var swa: SwaCharacter
var camera: Camera3D
var action_picker: OptionButton
var status_label: Label
var expression_picker: OptionButton

func _ready() -> void:
	_build_stage()
	swa = SWA_SCENE.instantiate() as SwaCharacter
	swa.position = Vector3(0, 0.0, 0)
	add_child(swa)
	_build_ui()
	swa.look_at_target(camera)

func _build_stage() -> void:
	var env_node := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("#070e1d")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#9bb8e6")
	env.ambient_light_energy = 0.48
	env.glow_enabled = true
	env.glow_intensity = 0.24
	env_node.environment = env
	add_child(env_node)
	var key := DirectionalLight3D.new()
	key.rotation_degrees = Vector3(-40, -30, 0)
	key.light_color = Color("#d2e4ff")
	key.light_energy = 1.2
	key.shadow_enabled = true
	add_child(key)
	_add_light(Vector3(-3, 3, -2), Color("#329dff"), 2.0, 5.0)
	_add_light(Vector3(3, 2, 2), Color("#2fdbc2"), 1.3, 4.0)
	var floor_mesh := MeshInstance3D.new()
	floor_mesh.name = "TestPlatform"
	var cylinder := CylinderMesh.new()
	cylinder.top_radius = 2.7
	cylinder.bottom_radius = 2.7
	cylinder.height = 0.2
	cylinder.radial_segments = 64
	floor_mesh.mesh = cylinder
	var floor_mat := StandardMaterial3D.new()
	floor_mat.albedo_color = Color("#111b30")
	floor_mat.roughness = 0.45
	floor_mesh.material_override = floor_mat
	floor_mesh.position.y = -0.14
	add_child(floor_mesh)
	var ring := MeshInstance3D.new()
	var torus := TorusMesh.new()
	torus.inner_radius = 2.38
	torus.outer_radius = 2.44
	torus.ring_segments = 64
	torus.rings = 8
	ring.mesh = torus
	var glow := StandardMaterial3D.new()
	glow.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	glow.albedo_color = Color("#2a8feb")
	glow.emission_enabled = true
	glow.emission = Color("#247dc8")
	glow.emission_energy_multiplier = 0.7
	ring.material_override = glow
	ring.position.y = -0.025
	add_child(ring)
	camera = Camera3D.new()
	camera.position = Vector3(0, 2.3, 6.5)
	camera.fov = 37
	camera.current = true
	add_child(camera)
	camera.look_at(Vector3(0, 1.34, 0), Vector3.UP)

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 3
	add_child(layer)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_PASS
	layer.add_child(root)
	var title := Label.new()
	title.text = "SWA CHARACTER TEST"
	title.position = Vector2(28, 22)
	title.add_theme_font_size_override("font_size", 23)
	title.add_theme_color_override("font_color", Color("#f0f6ff"))
	root.add_child(title)
	var subtitle := Label.new()
	subtitle.text = "39 animations  ·  skeletal rig  ·  facial expressions  ·  smooth gaze"
	subtitle.position = Vector2(30, 56)
	subtitle.add_theme_font_size_override("font_size", 12)
	subtitle.add_theme_color_override("font_color", Color("#91a7c8"))
	root.add_child(subtitle)
	var panel := PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	panel.offset_left = 22
	panel.offset_right = -22
	panel.offset_top = -184
	panel.offset_bottom = -18
	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.025, 0.045, 0.085, 0.94)
	panel_style.border_color = Color("#24456d")
	panel_style.set_border_width_all(1)
	panel_style.set_corner_radius_all(18)
	panel_style.content_margin_left = 18
	panel_style.content_margin_right = 18
	panel_style.content_margin_top = 12
	panel_style.content_margin_bottom = 12
	panel.add_theme_stylebox_override("panel", panel_style)
	root.add_child(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 9)
	panel.add_child(box)
	var quick_grid := GridContainer.new()
	quick_grid.columns = 8
	quick_grid.add_theme_constant_override("h_separation", 7)
	quick_grid.add_theme_constant_override("v_separation", 6)
	box.add_child(quick_grid)
	for item in QUICK_ACTIONS:
		var button := Button.new()
		button.text = item[0]
		button.custom_minimum_size = Vector2(116, 34)
		_style_button(button, Color("#245b91"))
		var action_name: String = item[1]
		button.pressed.connect(func(): _play_action(action_name))
		quick_grid.add_child(button)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	box.add_child(row)
	action_picker = OptionButton.new()
	action_picker.custom_minimum_size = Vector2(260, 38)
	var all_actions := ["Idle", "Idle_Variation", "Walk", "Run", "Turn_Left", "Turn_Right", "Start_Walking", "Stop_Walking", "Wave", "Point", "Look_Around", "Look_At_Object", "Head_Nod", "Head_Shake", "Curious", "Thinking", "Confused", "Excited", "Happy", "Sad", "Celebrate", "Victory_Small", "Victory_Big", "Attack", "Attack_Reaction", "Hit_Reaction", "Defeated", "Ready_Battle_Stance", "Listening", "Correct_Answer", "Wrong_Answer", "Encourage", "Discover", "Lets_Go", "Jump", "Fall", "Land", "Sleep", "Rest"]
	for animation in all_actions: action_picker.add_item(animation)
	row.add_child(action_picker)
	var play_button := Button.new()
	play_button.text = "PLAY SELECTED ACTION"
	play_button.custom_minimum_size = Vector2(205, 38)
	_style_button(play_button, Color("#137eae"))
	play_button.pressed.connect(func(): _play_action(action_picker.get_item_text(action_picker.selected)))
	row.add_child(play_button)
	expression_picker = OptionButton.new()
	expression_picker.custom_minimum_size = Vector2(165, 38)
	for expression in EXPRESSIONS: expression_picker.add_item(expression)
	row.add_child(expression_picker)
	var expression_button := Button.new()
	expression_button.text = "SET EXPRESSION"
	expression_button.custom_minimum_size = Vector2(155, 38)
	_style_button(expression_button, Color("#5156a5"))
	expression_button.pressed.connect(func(): _set_expression(expression_picker.get_item_text(expression_picker.selected)))
	row.add_child(expression_button)
	var gaze_button := Button.new()
	gaze_button.text = "LOOK AT CAMERA"
	gaze_button.custom_minimum_size = Vector2(144, 38)
	_style_button(gaze_button, Color("#187e75"))
	gaze_button.pressed.connect(func(): swa.look_at_target(camera))
	row.add_child(gaze_button)
	var blink_button := Button.new()
	blink_button.text = "BLINK"
	blink_button.custom_minimum_size = Vector2(90, 38)
	blink_button.pressed.connect(swa.trigger_blink)
	row.add_child(blink_button)
	status_label = Label.new()
	status_label.text = "Swa is ready. Choose an animation or expression."
	status_label.add_theme_font_size_override("font_size", 11)
	status_label.add_theme_color_override("font_color", Color("#92a9c9"))
	box.add_child(status_label)

func _play_action(action: String) -> void:
	if swa == null: return
	swa.play_action(StringName(action))
	status_label.text = "Animation: " + action.replace("_", " ")
	if action in ["Happy", "Excited", "Celebrate", "Correct_Answer", "Victory_Big", "Victory_Small"]:
		swa.set_expression("happy", 2.0)
	elif action in ["Confused", "Thinking"]:
		swa.set_expression("confused", 2.0)
	elif action == "Sad" or action == "Defeated":
		swa.set_expression("sad", 2.0)
	elif action == "Ready_Battle_Stance" or action == "Attack":
		swa.set_expression("determined", 1.5)

func _set_expression(expression: String) -> void:
	if swa == null: return
	swa.set_expression(expression)
	status_label.text = "Facial expression: " + expression

func _add_light(position: Vector3, color: Color, energy: float, radius: float) -> void:
	var light := OmniLight3D.new()
	light.position = position
	light.light_color = color
	light.light_energy = energy
	light.omni_range = radius
	light.shadow_enabled = false
	add_child(light)

func _style_button(button: Button, color: Color) -> void:
	var style := StyleBoxFlat.new()
	style.bg_color = color.darkened(0.26)
	style.border_color = color.lightened(0.14)
	style.set_border_width_all(1)
	style.set_corner_radius_all(9)
	style.content_margin_left = 9
	style.content_margin_right = 9
	style.content_margin_top = 5
	style.content_margin_bottom = 5
	button.add_theme_stylebox_override("normal", style)
	var hover := style.duplicate() as StyleBoxFlat
	hover.bg_color = color.darkened(0.08)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", hover)
	button.add_theme_color_override("font_color", Color("#f5f8ff"))
	button.add_theme_font_size_override("font_size", 11)
