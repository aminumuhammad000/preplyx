extends Node3D

const EXAM_ACCENTS := {"NECO": Color("#24e5c4"), "WAEC": Color("#b64eff"), "JAMB": Color("#34e672")}
const FALLBACK_ACCENTS := [Color("#24e5c4"), Color("#b64eff"), Color("#34e672"), Color("#f3b45f"), Color("#47c8bd")]
const EXAM_JOURNEY_SCENE: PackedScene = preload("res://scenes/exam_journey.tscn")
const GAME_CAMERA_SCRIPT: Script = preload("res://scripts/game_camera.gd")
const SWALLERN_COMPASS_SCRIPT: Script = preload("res://scripts/swallern_compass.gd")
const EXAM_LOGOS := {"NECO":"res://assets/branding/exams/neco_logo.png", "WAEC":"res://assets/branding/exams/waec_logo.png", "JAMB":"res://assets/branding/exams/jamb_logo.png"}
const ARCH_TEXTURES := {
	"NECO": "res://assets/branding/exams/neco_arch.png",
	"WAEC": "res://assets/branding/exams/waec_arch.png",
	"JAMB": "res://assets/branding/exams/jamb_arch.png"
}
const WALK_SPEED := 4.4

var player: Node3D
var camera: Camera3D
var camera_rig: Node3D
var player_rim_light: OmniLight3D
var hovered_door: Node3D
var selected_exam := ""
var transitioning := false
var portal_open := false
var transition_time := 0.0
var door_nodes: Dictionary = {}
var door_mats: Dictionary = {}
var ui_layer: CanvasLayer
var hint_label: Label
var retry_button: Button
var status_label: Label
var selection_player: AudioStreamPlayer
var portal_player: AudioStreamPlayer
var player_pad_glow: MeshInstance3D
var player_key_light: OmniLight3D
var ring_activated := false
var ring_pulse_time := 0.0
var aim_point := Vector2.ZERO
var walk_target := Vector3.ZERO
var idle_time := 0.0
var virtual_move := Vector2.ZERO
var compass_hud: Control
var compass_target: Node3D
var confirmation_overlay: ColorRect
var confirmation_panel: PanelContainer
var confirmation_logo: TextureRect
var confirmation_title: Label
var confirmation_description: Label
var confirmation_status: Label
var confirmation_button: Button
var confirmation_open := false
var _last_entered_door := ""
var _portal_detection_cooldown := 0.0

func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	Input.set_default_cursor_shape(Input.CURSOR_ARROW)
	JourneyData.availability_changed.connect(_on_exam_data_changed)
	_build_world()
	_build_player()
	_build_camera()
	_build_ui()
	selection_player = AudioStreamPlayer.new()
	selection_player.stream = load("res://assets/audio/ui/portal_select.wav")
	selection_player.bus = "UI"
	add_child(selection_player)
	portal_player = AudioStreamPlayer.new()
	portal_player.stream = load("res://assets/audio/ui/portal_open.wav")
	portal_player.bus = "UI"
	add_child(portal_player)
	_on_exam_data_changed()
	JourneyData.load_availability()

func _process(delta: float) -> void:
	_update_hover()
	_update_player(delta)
	_update_doors(delta)
	_update_compass()
	
	# Intelligent companion gaze attention
	if player and player.has_method("look_at_target"):
		if hovered_door != null:
			# Gaze snaps attentively to hovered portal
			player.look_at_target(hovered_door.global_position + Vector3(0.0, 2.1, 0.0), 0.88)
		elif not selected_exam.is_empty() and door_nodes.has(selected_exam):
			# Gaze locks onto selected active portal
			player.look_at_target(door_nodes[selected_exam].global_position + Vector3(0.0, 2.1, 0.0), 0.92)
		elif ring_activated:
			# Swa looks up toward the center portal / user
			player.look_at_target(Vector3(0.0, 2.2, -4.8), 0.70)
		else:
			# Companion idle curiosity glancing
			var glance := Vector3(sin(Time.get_ticks_msec() * 0.00035) * 3.2, 1.6, -4.5 + cos(Time.get_ticks_msec() * 0.00028) * 0.6)
			player.look_at_target(glance, 0.55)

	# Interactive glowing ring feedback
	if player and player_pad_glow:
		var dist_to_pad := Vector2(player.global_position.x, player.global_position.z).length()
		var glow_mat := player_pad_glow.material_override as StandardMaterial3D
		if dist_to_pad < 1.4:
			ring_pulse_time += delta * 6.0
			var pulse := sin(ring_pulse_time) * 0.35 + 1.0
			if not ring_activated:
				ring_activated = true
				if portal_player and portal_player.stream:
					portal_player.pitch_scale = 1.3
					portal_player.play()
				var tween := create_tween()
				tween.tween_property(player_pad_glow, "scale", Vector3(1.16, 1.0, 1.16), 0.18).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
				tween.tween_property(player_pad_glow, "scale", Vector3(1.08, 1.0, 1.08), 0.22)
				if hint_label:
					hint_label.text = "SWA READY  ·  CHOOSE AN EXAM PORTAL TO EXPLORE"
			if glow_mat:
				glow_mat.emission_energy_multiplier = lerpf(glow_mat.emission_energy_multiplier, 1.25 * pulse, delta * 8.0)
		else:
			if ring_activated:
				ring_activated = false
				var tween := create_tween()
				tween.tween_property(player_pad_glow, "scale", Vector3.ONE, 0.25)
				if hint_label:
					hint_label.text = "W A S D / ARROWS MOVE  ·  Q / E FOCUS  ·  ENTER / SPACE REVIEW"
			if glow_mat:
				glow_mat.emission_energy_multiplier = lerpf(glow_mat.emission_energy_multiplier, 0.85, delta * 4.0)

	# Dynamic character lighting
	if player_rim_light and player:
		player_rim_light.global_position = player.global_position + Vector3(0.0, 2.6, -0.65)
	if player_key_light and player:
		player_key_light.global_position = player.global_position + Vector3(0.5, 2.3, 1.2)
	if transitioning:
		transition_time += delta
		if transition_time > 0.92:
			transitioning = false
			_show_entry_card()

func _unhandled_input(event: InputEvent) -> void:
	if camera_rig and camera_rig.has_method("handle_input"):
		camera_rig.handle_input(event)
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE and confirmation_open:
			_close_confirmation()
		elif event.keycode == KEY_ESCAPE and selected_exam != "":
			_reset_selection()
		elif event.keycode in [KEY_ENTER, KEY_KP_ENTER, KEY_SPACE] and selected_exam != "" and not transitioning:
			if confirmation_open: _confirm_selected_exam()
			else: _show_confirmation()
		elif event.keycode == KEY_Q and not confirmation_open:
			_move_focus(-1)
		elif event.keycode == KEY_E and not confirmation_open:
			_move_focus(1)
	elif event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if hovered_door:
				_select_exam(hovered_door.name, false, false)
				_show_confirmation()

func _build_world() -> void:
	var world_env := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color("#1d5ea8")
	sky_mat.sky_horizon_color = Color("#6fa7de")
	sky_mat.ground_bottom_color = Color("#324f70")
	sky_mat.ground_horizon_color = Color("#6a93bf")
	sky.sky_material = sky_mat
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("#6882a2")
	env.ambient_light_energy = 0.26
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.0
	env.tonemap_white = 1.2
	env.glow_enabled = true
	env.glow_normalized = true
	env.glow_intensity = 0.20
	env.glow_strength = 0.70
	env.glow_bloom = 0.0 # Prevents diffuse surfaces from washing out
	env.glow_hdr_threshold = 1.08 # Only true high-emission neon glows
	env.glow_hdr_scale = 1.0
	env.glow_hdr_luminance_cap = 10.0
	env.fog_enabled = false
	world_env.environment = env
	add_child(world_env)

	# Calibrated sunlight with soft, grounding directional shadows
	var key_light := DirectionalLight3D.new()
	key_light.rotation_degrees = Vector3(-46, -34, 0)
	key_light.light_color = Color("#fff5e6")
	key_light.light_energy = 0.68
	key_light.shadow_enabled = true
	key_light.shadow_bias = 0.02
	key_light.shadow_blur = 1.35
	key_light.shadow_opacity = 0.74
	key_light.directional_shadow_max_distance = 32.0
	add_child(key_light)

	# Single gentle skylight fill
	_add_fill_light(Vector3(0, 4.5, 3.0), Color("#b8d6f4"), 0.15, 12.0)

	# Main circular polished marble floor (clean bright atrium floor matching home scene.png)
	var marble_mat := _material(Color("#cbd8e4"), 0.28)
	marble_mat.metallic = 0.02
	var floor_base := _make_cylinder("MarbleFloor", Vector3(0, -0.19, 0), 8.8, 0.38, Color("#cbd8e4"), 0.0)
	floor_base.material_override = marble_mat

	# Outer glowing cyan perimeter ring
	_make_torus("OuterCyanRing", Vector3(0, 0.015, 0), 8.35, 0.045, Color("#3cd4ff"), 1.15)

	# Concentric center glowing cyan rings where Swa stands
	var center_pedestal := _make_cylinder("CenterPedestal", Vector3(0, 0.008, 0), 1.55, 0.02, Color("#c4d4e2"), 0.0)
	center_pedestal.material_override = _material(Color("#c4d4e2"), 0.32)
	player_pad_glow = _make_torus("CenterRingOuter", Vector3(0, 0.02, 0), 1.48, 0.035, Color("#3bd2fa"), 1.05)
	_make_torus("CenterRingMid", Vector3(0, 0.02, 0), 1.15, 0.025, Color("#3cd4ff"), 0.85)
	_make_torus("CenterRingInner", Vector3(0, 0.02, 0), 0.65, 0.02, Color("#6ee4ff"), 0.70)

	# Subtle concentric architectural marble floor seams (matching home scene.png)
	_make_torus("OuterFloorRing", Vector3(0, 0.006, 0), 5.8, 0.018, Color("#a8c0d6"), 0.0)
	_make_torus("MidFloorRing", Vector3(0, 0.006, 0), 3.6, 0.016, Color("#b2c8dc"), 0.0)
	_make_torus("InnerFloorRing", Vector3(0, 0.006, 0), 2.2, 0.014, Color("#bcd0e4"), 0.0)

	# Overhead glass atrium canopy structure with cascading foliage
	var canopy_ring := _make_torus("CanopyRing", Vector3(0, 6.6, -3.2), 6.5, 0.08, Color("#d2e4f5"), 0.1)
	var foliage_tex := load("res://assets/branding/canopy_foliage.png") as Texture2D
	if foliage_tex:
		var foliage_sprite := Sprite3D.new()
		foliage_sprite.name = "CanopyFoliage"
		foliage_sprite.texture = foliage_tex
		foliage_sprite.position = Vector3(0, 6.0, -3.8)
		foliage_sprite.scale = Vector3(0.0042, 0.0042, 0.0042)
		foliage_sprite.shaded = false
		foliage_sprite.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD
		foliage_sprite.billboard = BaseMaterial3D.BILLBOARD_FIXED_Y
		add_child(foliage_sprite)

	_build_architecture()



func _build_door(exam: Dictionary) -> void:
	var root := Node3D.new()
	root.name = exam.id
	root.position = exam.position
	if exam.has("rotation"):
		root.rotation = exam.rotation
	add_child(root)

	var glow_mat := _emission_material(exam.color, 1.05)
	var frame_mat := _material(Color("#f0f5fa"), 0.22)
	frame_mat.metallic = 0.08
	var accent_dark := _material(Color("#1a2b42"), 0.32)
	accent_dark.metallic = 0.22

	# White architectural portal pillars
	for x in [-1.58, 1.58]:
		var pillar := _box_mesh(Vector3(0.38, 4.35, 0.54), frame_mat)
		pillar.position = Vector3(x, 2.18, 0)
		root.add_child(pillar)
		var accent_rail := _box_mesh(Vector3(0.045, 3.85, 0.06), glow_mat)
		accent_rail.position = Vector3(x - signf(x) * 0.18, 2.18, 0.28)
		root.add_child(accent_rail)

	# Curved upper lintel arch
	var lintel := _box_mesh(Vector3(3.54, 0.44, 0.54), frame_mat)
	lintel.position = Vector3(0, 4.38, 0)
	root.add_child(lintel)

	# Portal sill step
	var sill := _box_mesh(Vector3(2.82, 0.12, 0.58), frame_mat)
	sill.position = Vector3(0, 0.06, 0.08)
	root.add_child(sill)

	# High-res Arch Realm Portal Face (Unshaded to preserve rich saturated portal colors without clipping to white)
	var arch_path: String = ARCH_TEXTURES.get(exam.id, "")
	var arch_tex: Texture2D = load(arch_path) as Texture2D if not arch_path.is_empty() else null
	if arch_tex:
		var arch_quad := MeshInstance3D.new()
		var q_mesh := QuadMesh.new()
		q_mesh.size = Vector2(2.78, 4.25)
		arch_quad.mesh = q_mesh
		var arch_mat := StandardMaterial3D.new()
		arch_mat.albedo_texture = arch_tex
		arch_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		arch_quad.material_override = arch_mat
		arch_quad.position = Vector3(0, 2.18, -0.05)
		arch_quad.name = "PortalArchTexture"
		root.add_child(arch_quad)
	else:
		var fallback_portal := MeshInstance3D.new()
		var p_mesh := PlaneMesh.new()
		p_mesh.size = Vector2(2.5, 4.0)
		fallback_portal.mesh = p_mesh
		fallback_portal.material_override = _glass_material(exam.color)
		fallback_portal.position = Vector3(0, 2.15, -0.05)
		fallback_portal.rotation_degrees.x = 90
		root.add_child(fallback_portal)

	# Neon glowing halo / arch accent
	var halo := _torus_mesh(1.42, 0.038, glow_mat)
	halo.name = "PortalHalo"
	halo.position = Vector3(0, 2.65, 0.14)
	halo.rotation_degrees.x = 90
	root.add_child(halo)

	# Sliding translucent energy wings (part when approached or selected)
	var energy_mat := _glass_material(exam.color)
	var wing := _box_mesh(Vector3(1.15, 3.85, 0.06), energy_mat)
	wing.position = Vector3(0.58, 2.15, 0.08)
	wing.name = "DoorWing"
	root.add_child(wing)
	var wing_left := _box_mesh(Vector3(1.15, 3.85, 0.06), energy_mat)
	wing_left.position = Vector3(-0.58, 2.15, 0.08)
	wing_left.name = "DoorWingLeft"
	root.add_child(wing_left)

	# Subtle horizontal energy glints
	for streak_y in [1.35, 2.95]:
		var glint := _box_mesh(Vector3(2.25, 0.018, 0.02), _emission_material(exam.color.lightened(0.2), 0.18))
		glint.position = Vector3(0, streak_y, 0.12)
		root.add_child(glint)

	# Circular entrance threshold pad & glowing ring in front of door
	var pad := _cylinder_mesh(1.45, 0.03, _material(Color("#d8e4f0"), 0.25))
	pad.name = "DoorPad_" + exam.id
	pad.position = Vector3(0, 0.02, 1.1)
	root.add_child(pad)
	var ground_ring := _torus_mesh(1.35, 0.035, _emission_material(exam.color, 0.95))
	ground_ring.name = "DoorRing_" + exam.id
	ground_ring.position = Vector3(0, 0.035, 1.1)
	root.add_child(ground_ring)

	# Potted plants flanking the portal
	_build_potted_plant(root, Vector3(-1.95, 0.0, 0.35), 0.95)
	_build_potted_plant(root, Vector3(1.95, 0.0, 0.35), 0.95)

	# Local accent light for portal threshold
	var portal_light := OmniLight3D.new()
	portal_light.name = "PortalAccentLight"
	portal_light.position = Vector3(0, 2.2, 0.9)
	portal_light.light_color = exam.color
	portal_light.light_energy = 0.36
	portal_light.omni_range = 2.4
	portal_light.shadow_enabled = false
	root.add_child(portal_light)

	# Interaction Hit Area
	var area := Area3D.new()
	area.name = "HitArea"
	area.position = Vector3(0, 2.0, 0.0)
	root.add_child(area)
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(3.2, 4.4, 1.2)
	shape.shape = box
	area.add_child(shape)

	var pick := _box_mesh(Vector3(3.2, 4.4, 0.16), _material(Color(1,1,1,0.001), 0.0))
	pick.position = Vector3(0, 2.0, 0.30)
	pick.name = "PickSurface"
	pick.visible = false
	pick.set_meta("exam_id", exam.id)
	pick.set_meta("subtitle", exam.subtitle)
	pick.set_meta("accent", exam.color)
	root.add_child(pick)

	root.set_meta("exam_id", exam.id)
	root.set_meta("subtitle", exam.subtitle)
	root.set_meta("accent", exam.color)
	door_nodes[exam.id] = root
	door_mats[exam.id] = {
		"glow": glow_mat,
		"energy": energy_mat,
		"wing": wing,
		"wing_left": wing_left,
		"pick": pick,
		"pad": pad,
		"ground_ring": ground_ring,
		"light": portal_light,
		"color": exam.color
	}


func _build_architecture() -> void:
	var wall_mat := _material(Color("#eef3f8"), 0.22)
	wall_mat.metallic = 0.05
	var trim_mat := _emission_material(Color("#6bc8ff"), 0.6)
	var silver_mat := _material(Color("#c8d6e5"), 0.15)
	silver_mat.metallic = 0.6

	# Rear Solarpunk Conservatory Arches and Wall
	var back_wall := _box_mesh(Vector3(22.0, 7.8, 0.4), wall_mat)
	back_wall.position = Vector3(0, 3.2, -8.6)
	add_child(back_wall)
	_add_box_collision(Vector3(22.0, 7.8, 0.4), back_wall.position)

	# Side glass boundary fins and collisions
	for side in [-1, 1]:
		var side_wall := _box_mesh(Vector3(0.4, 6.2, 10.0), wall_mat)
		side_wall.position = Vector3(float(side) * 9.5, 2.8, -3.0)
		add_child(side_wall)
		_add_box_collision(Vector3(0.4, 6.2, 10.0), side_wall.position)

	# Architectural columns behind portals
	for i in 4:
		var x := -6.3 + float(i) * 4.2
		var col := _cylinder_mesh(0.28, 7.4, wall_mat)
		col.position = Vector3(x, 3.5, -7.8)
		add_child(col)

	# --- Left Holographic Billboard ("Small steps big dreams") & Seating Lounge ---
	var left_billboard_root := Node3D.new()
	left_billboard_root.name = "LeftBillboard"
	left_billboard_root.position = Vector3(-6.6, 2.35, -2.8)
	left_billboard_root.rotation_degrees = Vector3(0, 28, 0)
	add_child(left_billboard_root)

	var bb_left_tex := load("res://assets/branding/billboard_left.png") as Texture2D
	if bb_left_tex:
		var quad := MeshInstance3D.new()
		var qm := QuadMesh.new()
		qm.size = Vector2(2.5, 3.6)
		quad.mesh = qm
		var mat := StandardMaterial3D.new()
		mat.albedo_texture = bb_left_tex
		mat.emission_enabled = true
		mat.emission_texture = bb_left_tex
		mat.emission_energy_multiplier = 0.55
		mat.roughness = 0.15
		quad.material_override = mat
		quad.position = Vector3(0, 0.45, 0)
		left_billboard_root.add_child(quad)

	# Sleek support stanchions
	for sx in [-1.15, 1.15]:
		var post := _cylinder_mesh(0.035, 3.2, silver_mat)
		post.position = Vector3(sx, 0.1, -0.05)
		left_billboard_root.add_child(post)

	# White curved lounge bench below left billboard
	var left_bench := _box_mesh(Vector3(2.4, 0.24, 0.72), wall_mat)
	left_bench.position = Vector3(-6.3, 0.22, -2.4)
	left_bench.rotation_degrees = Vector3(0, 28, 0)
	add_child(left_bench)
	_build_potted_plant(self, Vector3(-5.3, 0.0, -1.8), 0.95)
	_build_potted_plant(self, Vector3(-7.4, 0.0, -3.4), 1.05)

	# Blue hanging banner on left pillar
	var banner_tex := load("res://assets/branding/hanging_banner.png") as Texture2D
	if banner_tex:
		var banner_quad := MeshInstance3D.new()
		var b_mesh := QuadMesh.new()
		b_mesh.size = Vector2(0.95, 3.4)
		banner_quad.mesh = b_mesh
		var b_mat := StandardMaterial3D.new()
		b_mat.albedo_texture = banner_tex
		b_mat.emission_enabled = true
		b_mat.emission_texture = banner_tex
		b_mat.emission_energy_multiplier = 0.42
		banner_quad.material_override = b_mat
		banner_quad.position = Vector3(-7.6, 3.4, -4.5)
		banner_quad.rotation_degrees = Vector3(0, 35, 0)
		add_child(banner_quad)

	# --- Right Holographic Billboard (Mascot + "Turn curiosity into learning") & Seating ---
	var right_billboard_root := Node3D.new()
	right_billboard_root.name = "RightBillboard"
	right_billboard_root.position = Vector3(6.6, 2.35, -2.8)
	right_billboard_root.rotation_degrees = Vector3(0, -28, 0)
	add_child(right_billboard_root)

	var bb_right_tex := load("res://assets/branding/billboard_right.png") as Texture2D
	if bb_right_tex:
		var quad := MeshInstance3D.new()
		var qm := QuadMesh.new()
		qm.size = Vector2(2.5, 3.6)
		quad.mesh = qm
		var mat := StandardMaterial3D.new()
		mat.albedo_texture = bb_right_tex
		mat.emission_enabled = true
		mat.emission_texture = bb_right_tex
		mat.emission_energy_multiplier = 0.55
		mat.roughness = 0.15
		quad.material_override = mat
		quad.position = Vector3(0, 0.45, 0)
		right_billboard_root.add_child(quad)

	for sx in [-1.15, 1.15]:
		var post := _cylinder_mesh(0.035, 3.2, silver_mat)
		post.position = Vector3(sx, 0.1, -0.05)
		right_billboard_root.add_child(post)

	# White curved lounge bench below right billboard
	var right_bench := _box_mesh(Vector3(2.4, 0.24, 0.72), wall_mat)
	right_bench.position = Vector3(6.3, 0.22, -2.4)
	right_bench.rotation_degrees = Vector3(0, -28, 0)
	add_child(right_bench)
	_build_potted_plant(self, Vector3(5.3, 0.0, -1.8), 0.95)
	_build_potted_plant(self, Vector3(7.4, 0.0, -3.4), 1.05)


func _build_player() -> void:
	player = load("res://scenes/player_swa.tscn").instantiate() as Node3D
	player.name = "PlayerSwa"
	player.position = Vector3(0, 0.02, 0.0)
	add_child(player)
	walk_target = player.position
	
	# Soft, 2-tier grounding contact shadow beneath Swa's feet
	var shadow_inner := MeshInstance3D.new()
	var mesh_inner := CylinderMesh.new()
	mesh_inner.top_radius = 0.38
	mesh_inner.bottom_radius = 0.38
	mesh_inner.height = 0.002
	shadow_inner.mesh = mesh_inner
	var mat_inner := StandardMaterial3D.new()
	mat_inner.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_inner.albedo_color = Color(0.01, 0.02, 0.05, 0.40)
	shadow_inner.material_override = mat_inner
	shadow_inner.position = Vector3(0, 0.005, 0)
	player.add_child(shadow_inner)

	var shadow_outer := MeshInstance3D.new()
	var mesh_outer := CylinderMesh.new()
	mesh_outer.top_radius = 0.60
	mesh_outer.bottom_radius = 0.60
	mesh_outer.height = 0.002
	shadow_outer.mesh = mesh_outer
	var mat_outer := StandardMaterial3D.new()
	mat_outer.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_outer.albedo_color = Color(0.01, 0.02, 0.05, 0.18)
	shadow_outer.material_override = mat_outer
	shadow_outer.position = Vector3(0, 0.003, 0)
	player.add_child(shadow_outer)
	
	if player.has_method("look_at_target"):
		player.look_at_target(Vector3(0, 1.8, -5.2), 0.7)

func _build_camera() -> void:
	camera_rig = Node3D.new()
	camera_rig.name = "GameCamera"
	camera_rig.set_script(GAME_CAMERA_SCRIPT)
	camera_rig.set("follow_target", player)
	camera_rig.set("follow_height", 1.20)
	camera_rig.set("look_ahead", -1.8)
	camera_rig.set("follow_distance", 8.4)
	camera_rig.set("minimum_distance", 4.5)
	camera_rig.set("maximum_distance", 12.0)
	camera_rig.set("field_of_view", 50.0)
	camera_rig.set("scene_minimum", Vector3(-11.0, 1.2, -10.0))
	camera_rig.set("scene_maximum", Vector3(11.0, 8.0, 12.0))
	add_child(camera_rig)
	camera = camera_rig.get_node("Camera3D") as Camera3D


func _build_ui() -> void:
	ui_layer = CanvasLayer.new()
	ui_layer.layer = 2
	add_child(ui_layer)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_PASS
	ui_layer.add_child(root)

	# --- Subtle Top Readability Gradient to Protect Header UI ---
	var top_gradient := TextureRect.new()
	top_gradient.name = "TopReadabilityGradient"
	top_gradient.set_anchors_preset(Control.PRESET_TOP_WIDE)
	top_gradient.offset_bottom = 115
	top_gradient.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var grad := Gradient.new()
	grad.colors = PackedColorArray([Color(0.015, 0.035, 0.075, 0.68), Color(0.015, 0.035, 0.075, 0.0)])
	var grad_tex := GradientTexture2D.new()
	grad_tex.gradient = grad
	grad_tex.fill_from = Vector2(0, 0)
	grad_tex.fill_to = Vector2(0, 1)
	top_gradient.texture = grad_tex
	top_gradient.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	root.add_child(top_gradient)

	# --- Top-Left Branding with Ribbon Logo ---
	var brand := HBoxContainer.new()
	brand.position = Vector2(28, 22)
	brand.add_theme_constant_override("separation", 12)
	root.add_child(brand)

	var logo := TextureRect.new()
	var ribbon_tex := load("res://assets/branding/swallern_ribbon_logo.png") as Texture2D
	logo.texture = ribbon_tex if ribbon_tex else load("res://assets/branding/logo.svg")
	logo.custom_minimum_size = Vector2(40, 40)
	logo.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	logo.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	brand.add_child(logo)

	var brand_text := VBoxContainer.new()
	brand_text.alignment = BoxContainer.ALIGNMENT_CENTER
	brand.add_child(brand_text)

	var name := Label.new()
	name.text = "SWALLERN"
	name.add_theme_font_size_override("font_size", 18)
	name.add_theme_color_override("font_color", Color("#ffffff"))
	brand_text.add_child(name)

	var tagline := Label.new()
	tagline.text = "LEARN  ·  GROW  ·  SUCCEED"
	tagline.add_theme_font_size_override("font_size", 9)
	tagline.add_theme_color_override("font_color", Color("#6cb8ff"))
	brand_text.add_child(tagline)

	# --- Top-Center Header ---
	var welcome := VBoxContainer.new()
	welcome.set_anchors_preset(Control.PRESET_TOP_WIDE)
	welcome.offset_top = 24
	welcome.offset_bottom = 96
	welcome.add_theme_constant_override("separation", 3)
	welcome.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(welcome)
	_build_compass_and_dpad(root)

	var welcome_title := Label.new()
	welcome_title.text = "Welcome to Swallern"
	welcome_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	welcome_title.add_theme_font_size_override("font_size", 28)
	welcome_title.add_theme_color_override("font_color", Color("#ffffff"))
	welcome.add_child(welcome_title)

	var welcome_subtitle := Label.new()
	welcome_subtitle.text = "Hover to highlight  ·  Click a door to review and unlock"
	welcome_subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	welcome_subtitle.add_theme_font_size_override("font_size", 14)
	welcome_subtitle.add_theme_color_override("font_color", Color("#a6c6e8"))
	welcome.add_child(welcome_subtitle)

	_build_confirmation_card(root)

	# --- Top-Right Status Pill & Retry Button ---
	var top_right_box := HBoxContainer.new()
	top_right_box.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	top_right_box.offset_left = -380
	top_right_box.offset_top = 22
	top_right_box.offset_right = -24
	top_right_box.offset_bottom = 58
	top_right_box.alignment = BoxContainer.ALIGNMENT_END
	top_right_box.add_theme_constant_override("separation", 10)
	root.add_child(top_right_box)

	status_label = Label.new()
	status_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	status_label.add_theme_color_override("font_color", Color("#42e0b4"))
	status_label.add_theme_font_size_override("font_size", 11)
	top_right_box.add_child(status_label)

	retry_button = Button.new()
	retry_button.text = "↺ Try Again"
	retry_button.custom_minimum_size = Vector2(98, 32)
	retry_button.visible = false
	retry_button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	retry_button.pressed.connect(func():
		retry_button.disabled = true
		retry_button.text = "UPDATING…"
		JourneyData.load_availability())
	_style_button(retry_button, Color("#2b72d6"))
	top_right_box.add_child(retry_button)

	var hint := Label.new()
	hint.text = "W A S D / ARROWS MOVE  ·  Q / E FOCUS  ·  ENTER / SPACE REVIEW"
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	hint.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	hint.offset_left = -470
	hint.offset_top = -38
	hint.offset_right = -24
	hint.offset_bottom = -18
	hint.add_theme_font_size_override("font_size", 10)
	hint.add_theme_color_override("font_color", Color("#8eabcb"))
	root.add_child(hint)
	hint_label = hint

func _on_exam_data_changed() -> void:
	if not is_inside_tree() or status_label == null: return
	var ids := JourneyData.exam_ids()
	if ids.is_empty():
		status_label.text = JourneyData.catalog_notice()
		status_label.visible = not status_label.text.is_empty()
		retry_button.visible = true
		retry_button.disabled = JourneyData.loading
		return
	var existing_ids: Array = door_nodes.keys()
	existing_ids.sort()
	var wanted_ids: Array = ids.duplicate()
	wanted_ids.sort()
	if existing_ids != wanted_ids:
		for door in door_nodes.values():
			if is_instance_valid(door): door.queue_free()
		door_nodes.clear()
		door_mats.clear()
		for index in ids.size():
			var code := ids[index]
			var data := JourneyData.exam_data(code)
			var metadata: Dictionary = data.get("visualMetadata", {})
			var accent_value := str(metadata.get("accent", ""))
			var accent: Color = Color(accent_value) if not accent_value.is_empty() else EXAM_ACCENTS.get(code, FALLBACK_ACCENTS[index % FALLBACK_ACCENTS.size()])
			var pos: Vector3
			var rot := Vector3.ZERO
			if code == "NECO":
				pos = Vector3(-4.3, 0.0, -4.5)
				rot = Vector3(0.0, deg_to_rad(13.0), 0.0)
			elif code == "WAEC":
				pos = Vector3(0.0, 0.0, -5.2)
				rot = Vector3.ZERO
			elif code == "JAMB":
				pos = Vector3(4.3, 0.0, -4.5)
				rot = Vector3(0.0, deg_to_rad(-13.0), 0.0)
			else:
				var angle := (float(index) - float(ids.size() - 1) / 2.0) * 0.35
				pos = Vector3(sin(angle) * 5.0, 0.0, -cos(angle) * 5.0)
				rot = Vector3(0.0, -angle, 0.0)
			var exam := {
				"id": code,
				"name": str(data.get("name", code)),
				"subtitle": str(data.get("description", "")),
				"color": accent,
				"position": pos,
				"rotation": rot
			}
			_build_door(exam)
		retry_button.visible = false
	if selected_exam in ids:
		_select_exam(selected_exam, false)
	status_label.text = JourneyData.catalog_notice()
	status_label.visible = not status_label.text.is_empty()
	retry_button.visible = JourneyData.api_state == "offline" or (JourneyData.api_state == "idle" and JourneyData.catalog_source != "api")
	retry_button.disabled = JourneyData.loading
	if JourneyData.loading:
		retry_button.visible = false
	if JourneyData.api_state == "available":
		retry_button.visible = false
	retry_button.text = "UPDATING…" if JourneyData.loading else "↺ Try Again"


func _select_exam(id: String, clicked := true, play_selection_sound := false) -> void:
	if not door_nodes.has(id) or transitioning: return
	var changed := selected_exam != id
	selected_exam = id
	JourneyData.select_exam(id)
	if changed and play_selection_sound and selection_player: selection_player.play()
	if camera_rig:
		camera_rig.set_focus_target(door_nodes[id])
	compass_target = door_nodes[id]
	if changed and player and player.has_method("curious"):
		player.curious()
	if clicked:
		var door: Node3D = door_nodes[id]
		walk_target = Vector3(door.position.x * 0.72, player.position.y, door.position.z + 2.3)
		if player.has_method("look_at_target"):
			player.look_at_target(Vector3(door.position.x, 2.15, door.position.z))

func _update_hover() -> void:
	if confirmation_open or Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		return
	var origin := camera.project_ray_origin(get_viewport().get_mouse_position())
	var direction := camera.project_ray_normal(get_viewport().get_mouse_position())
	var query := PhysicsRayQueryParameters3D.create(origin, origin + direction * 100.0)
	query.collide_with_areas = true
	query.collide_with_bodies = true
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	var next: Node3D = null
	if not hit.is_empty():
		var obj: Object = hit.collider
		if obj is Area3D and obj.get_parent() is Node3D:
			next = obj.get_parent()
		elif obj is Node3D and obj.has_meta("exam_id"):
			next = obj
		elif obj is Node3D and obj.get_parent() and obj.get_parent().has_meta("exam_id"):
			next = obj.get_parent()
	if next != hovered_door:
		hovered_door = next
		Input.set_default_cursor_shape(Input.CURSOR_POINTING_HAND if hovered_door else Input.CURSOR_ARROW)
		if hovered_door and not transitioning:
			if camera_rig: camera_rig.set_focus_target(hovered_door)
			compass_target = hovered_door
			if player.has_method("look_at_target"):
				player.look_at_target(hovered_door.global_position + Vector3.UP * 2.0)
			if player.has_method("curious"): player.curious()
		elif not transitioning:
			var selected_door: Node3D = door_nodes.get(selected_exam)
			if camera_rig: camera_rig.set_focus_target(selected_door)
			compass_target = selected_door
			if not is_instance_valid(selected_door) and player.has_method("clear_look_target"):
				player.clear_look_target()

func _enter_exam(user_clicked := false) -> void:
	if selected_exam == "" or transitioning: return
	var exam := JourneyData.exam_data(selected_exam)
	if not exam.get("hasQuestions", false) and not exam.get("presentationOnly", false): return
	transitioning = true
	portal_open = false
	transition_time = 0.0
	if user_clicked and portal_player: portal_player.play()
	hint_label.text = "SWA IS APPROACHING THE " + selected_exam + " PORTAL..."
	walk_target = Vector3(door_nodes[selected_exam].position.x, player.position.y, door_nodes[selected_exam].position.z + 0.65)
	if player.has_method("lets_go"): player.lets_go()
	_show_status("PORTAL OPENING", true)

func _build_confirmation_card(root: Control) -> void:
	confirmation_overlay = ColorRect.new()
	confirmation_overlay.name = "PortalConfirmationOverlay"
	confirmation_overlay.color = Color(0.008, 0.018, 0.04, 0.58)
	confirmation_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	confirmation_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	confirmation_overlay.visible = false
	root.add_child(confirmation_overlay)

	confirmation_panel = PanelContainer.new()
	confirmation_panel.name = "CyberPortalConfirmation"
	confirmation_panel.set_anchors_preset(Control.PRESET_CENTER)
	confirmation_panel.offset_left = -250
	confirmation_panel.offset_top = -174
	confirmation_panel.offset_right = 250
	confirmation_panel.offset_bottom = 174
	confirmation_panel.custom_minimum_size = Vector2(500, 348)
	confirmation_panel.add_theme_stylebox_override("panel", _cyber_panel_style(Color("#4bd2e6")))
	confirmation_overlay.add_child(confirmation_panel)
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 25)
	margin.add_theme_constant_override("margin_right", 25)
	margin.add_theme_constant_override("margin_top", 19)
	margin.add_theme_constant_override("margin_bottom", 20)
	confirmation_panel.add_child(margin)
	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 10)
	margin.add_child(body)
	var eyebrow := Label.new()
	eyebrow.text = "SWALLERN  /  SECURE EXAM ACCESS"
	eyebrow.add_theme_font_size_override("font_size", 10)
	eyebrow.add_theme_color_override("font_color", Color("#73d6e9"))
	body.add_child(eyebrow)
	var divider := ColorRect.new()
	divider.custom_minimum_size.y = 2
	divider.color = Color("#3c94bf")
	body.add_child(divider)
	var heading_row := HBoxContainer.new()
	heading_row.add_theme_constant_override("separation", 18)
	body.add_child(heading_row)
	var text_column := VBoxContainer.new()
	text_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	text_column.add_theme_constant_override("separation", 5)
	heading_row.add_child(text_column)
	confirmation_title = Label.new()
	confirmation_title.add_theme_font_size_override("font_size", 25)
	confirmation_title.add_theme_color_override("font_color", Color("#f0f8ff"))
	text_column.add_child(confirmation_title)
	confirmation_description = Label.new()
	confirmation_description.custom_minimum_size.x = 300
	confirmation_description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	confirmation_description.add_theme_font_size_override("font_size", 12)
	confirmation_description.add_theme_color_override("font_color", Color("#a9c1d8"))
	text_column.add_child(confirmation_description)
	confirmation_logo = TextureRect.new()
	confirmation_logo.custom_minimum_size = Vector2(78, 78)
	confirmation_logo.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	confirmation_logo.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	confirmation_logo.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	heading_row.add_child(confirmation_logo)
	confirmation_status = Label.new()
	confirmation_status.add_theme_font_size_override("font_size", 11)
	confirmation_status.add_theme_color_override("font_color", Color("#76dfbe"))
	body.add_child(confirmation_status)
	var prompt := Label.new()
	prompt.text = "Confirm your choice and unlock this exam door?"
	prompt.add_theme_font_size_override("font_size", 14)
	prompt.add_theme_color_override("font_color", Color("#e4eefb"))
	body.add_child(prompt)
	var actions := HBoxContainer.new()
	actions.alignment = BoxContainer.ALIGNMENT_END
	actions.add_theme_constant_override("separation", 10)
	body.add_child(actions)
	var cancel := Button.new()
	cancel.text = "CANCEL"
	cancel.custom_minimum_size = Vector2(112, 42)
	cancel.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	cancel.pressed.connect(_close_confirmation)
	_style_button(cancel, Color("#334b68"))
	actions.add_child(cancel)
	confirmation_button = Button.new()
	confirmation_button.text = "UNLOCK & ENTER  →"
	confirmation_button.custom_minimum_size = Vector2(190, 42)
	confirmation_button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	confirmation_button.pressed.connect(_on_confirm_button)
	_style_button(confirmation_button, Color("#167b98"))
	actions.add_child(confirmation_button)

func _show_confirmation() -> void:
	if selected_exam.is_empty() or transitioning or confirmation_overlay == null: return
	var exam_data := JourneyData.exam_data(selected_exam)
	var accent: Color = door_mats[selected_exam].color if door_mats.has(selected_exam) else Color("#4bd2e6")
	confirmation_panel.add_theme_stylebox_override("panel", _cyber_panel_style(accent))
	confirmation_title.text = selected_exam + "  /  EXAM PORTAL"
	confirmation_description.text = str(exam_data.get("name", selected_exam)) + "\n" + str(exam_data.get("description", "Enter this exam world and choose your subjects and years."))
	confirmation_status.text = "QUESTION SETS AVAILABLE" if bool(exam_data.get("hasQuestions", false)) else ("BROWSE CATALOG  ·  AVAILABILITY CHECKED BEFORE CHALLENGE" if bool(exam_data.get("presentationOnly", false)) else "QUESTION DATA NOT AVAILABLE")
	confirmation_button.disabled = not bool(exam_data.get("hasQuestions", false)) and not bool(exam_data.get("presentationOnly", false))
	confirmation_logo.texture = load(EXAM_LOGOS[selected_exam]) if EXAM_LOGOS.has(selected_exam) else null
	confirmation_overlay.visible = true
	confirmation_open = true
	confirmation_panel.scale = Vector2(0.97, 0.97)
	confirmation_panel.modulate.a = 0.0
	var tween := create_tween().set_parallel(true)
	tween.tween_property(confirmation_panel, "scale", Vector2.ONE, 0.18).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(confirmation_panel, "modulate:a", 1.0, 0.16)
	confirmation_button.grab_focus()

func _close_confirmation() -> void:
	confirmation_open = false
	if confirmation_overlay: confirmation_overlay.visible = false
	Input.set_default_cursor_shape(Input.CURSOR_POINTING_HAND if is_instance_valid(hovered_door) else Input.CURSOR_ARROW)

func _confirm_selected_exam(user_clicked := false) -> void:
	if not confirmation_open or transitioning: return
	confirmation_open = false
	confirmation_overlay.visible = false
	_enter_exam(user_clicked)

func _on_confirm_button() -> void:
	_confirm_selected_exam(true)

func _cyber_panel_style(accent: Color) -> StyleBoxFlat:
	var style := _panel_style(Color(0.018, 0.043, 0.078, 0.98), accent, 14)
	style.set_border_width_all(2)
	style.shadow_color = Color(0.0, 0.55, 0.8, 0.25)
	style.shadow_size = 14
	style.shadow_offset = Vector2(0, 5)
	style.content_margin_left = 0
	style.content_margin_right = 0
	style.content_margin_top = 0
	style.content_margin_bottom = 0
	return style

func _show_entry_card() -> void:
	JourneyData.select_exam(selected_exam)
	SceneTransition.transition_to("res://scenes/exam_journey.tscn")

func _reset_selection() -> void:
	confirmation_open = false
	if confirmation_overlay: confirmation_overlay.visible = false
	selected_exam = ""
	JourneyData.select_exam("")
	portal_open = false
	if camera_rig: camera_rig.set_focus_target(null)
	compass_target = null
	if player and player.has_method("clear_look_target"): player.clear_look_target()
	retry_button.visible = JourneyData.api_state == "offline"
	hint_label.text = "W A S D / ARROWS MOVE  ·  Q / E FOCUS  ·  ENTER / SPACE REVIEW"
	_show_status("Choose an exam portal to begin", false)

func _update_player(delta: float) -> void:
	var input_direction := virtual_move
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT): input_direction.x -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT): input_direction.x += 1.0
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP): input_direction.y -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN): input_direction.y += 1.0
	var sprinting := Input.is_key_pressed(KEY_SHIFT)
	var movement: Vector3 = camera_rig.call("movement_direction", input_direction) if camera_rig else Vector3.ZERO
	
	if input_direction.length_squared() > 0.0 and not transitioning:
		# Direct movement control: active while held, immediate responsive step
		if player.has_method("set_move_intent"): player.set_move_intent(movement, sprinting)
		walk_target = player.position
		idle_time = 0.0
	else:
		if transitioning:
			# Auto-navigation into portal on entry sequence
			var target_diff := walk_target - player.position
			if target_diff.length() > 0.05:
				var direction := Vector3(target_diff.x, 0, target_diff.z).normalized()
				if player.has_method("set_move_intent"): player.set_move_intent(direction, true)
			else:
				if player.has_method("set_move_intent"): player.set_move_intent(Vector3.ZERO, false)
		else:
			# Clean stop on release: no ghost targets, no infinite pushing
			if player.has_method("set_move_intent"): player.set_move_intent(Vector3.ZERO, false)
			elif player.has_method("idle"): player.idle()
			walk_target = player.position
			idle_time += delta
			if idle_time > 7.0 and player.has_method("idle_variation"):
				player.idle_variation()
				idle_time = -6.0

	if not transitioning:
		player.position.x = clampf(player.position.x, -7.5, 7.5)
		player.position.z = clampf(player.position.z, -5.6, 4.8)
		_check_portal_proximity(delta)

func _check_portal_proximity(delta: float) -> void:
	if transitioning or door_nodes.is_empty(): return
	if _portal_detection_cooldown > 0.0:
		_portal_detection_cooldown -= delta
	
	var closest_id := ""
	var min_dist := 999.0
	var player_xz := Vector2(player.global_position.x, player.global_position.z)
	
	for id in door_nodes:
		var door: Node3D = door_nodes[id]
		if not is_instance_valid(door): continue
		var door_xz := Vector2(door.global_position.x, door.global_position.z)
		var threshold_pos := Vector2(door_xz.x, door_xz.y + 0.8)
		var dist := player_xz.distance_to(threshold_pos)
		if dist < min_dist:
			min_dist = dist
			closest_id = id
	
	if closest_id.is_empty(): return
	var closest_door: Node3D = door_nodes[closest_id]
	var door_z: float = closest_door.global_position.z
	var dx: float = absf(player.global_position.x - closest_door.global_position.x)
	
	# 1. Approach zone (within 2.8m): Highlight door and activate wings
	if min_dist < 2.8 and player.global_position.z < -2.2:
		if selected_exam != closest_id:
			_select_exam(closest_id, false, false)
		portal_open = true
		if not confirmation_open and hint_label:
			hint_label.text = "[ %s EXAM PORTAL ]  ·  STEP FORWARD OR PRESS ENTER TO UNLOCK" % closest_id
		if player.has_method("look_at_target"):
			player.look_at_target(closest_door.global_position + Vector3(0.0, 2.0, 0.0), 0.85)
	elif min_dist > 3.4 and not confirmation_open and selected_exam == closest_id:
		portal_open = false
		if not ring_activated and hint_label:
			hint_label.text = "W A S D / ARROWS MOVE  ·  Q / E FOCUS  ·  ENTER / SPACE REVIEW"
	
	# 2. Entrance threshold: Swa stepped right into the portal!
	if dx < 1.35 and player.global_position.z <= (door_z + 1.25) and player.global_position.z > (door_z - 1.2):
		if not confirmation_open and _portal_detection_cooldown <= 0.0:
			_last_entered_door = closest_id
			_portal_detection_cooldown = 1.2
			if selected_exam != closest_id:
				_select_exam(closest_id, false, true)
			if portal_player and portal_player.stream:
				portal_player.pitch_scale = 1.2
				portal_player.play()
			if hint_label:
				hint_label.text = "ENTERING %s PORTAL..." % closest_id
			if player.has_method("excited"):
				player.excited()
			_show_confirmation()

func _update_doors(delta: float) -> void:
	var any_focus: bool = (hovered_door != null) or (selected_exam != "")
	for id in door_nodes:
		var mats: Dictionary = door_mats[id]
		var is_focus: bool = (hovered_door != null and hovered_door.name == id) or selected_exam == id
		var target_energy: float
		if is_focus:
			target_energy = 1.15
		elif any_focus:
			target_energy = 0.22 # Non-selected portals gently dim
		else:
			target_energy = 0.45
		var mat: StandardMaterial3D = mats.glow
		mat.emission_energy_multiplier = lerpf(mat.emission_energy_multiplier, target_energy, delta * 5.0)
		var pulse := 0.85 + 0.12 * sin(Time.get_ticks_msec() * 0.0018 + float(id.length()))
		var energy: ShaderMaterial = mats.energy
		energy.set_shader_parameter("glow", 0.025 * pulse * (1.2 if is_focus else 0.7))
		var portal_light: OmniLight3D = mats.light
		portal_light.light_energy = lerpf(portal_light.light_energy, (0.72 if is_focus else 0.25) * pulse, delta * 3.0)
		var ground_ring: MeshInstance3D = mats.ground_ring
		var ring_mat := ground_ring.material_override as StandardMaterial3D
		ring_mat.emission_energy_multiplier = lerpf(ring_mat.emission_energy_multiplier, 0.95 if is_focus else 0.28, delta * 4.0)
		var wing: MeshInstance3D = mats.wing
		var wing_left: MeshInstance3D = mats.wing_left
		var open := clampf(transition_time / 0.9, 0.0, 1.0) if transitioning and id == selected_exam else (1.0 if portal_open and id == selected_exam else 0.0)
		wing.position.x = lerpf(wing.position.x, 0.58 + open * 1.18, delta * 5.0)
		wing_left.position.x = lerpf(wing_left.position.x, -0.58 - open * 1.18, delta * 5.0)
		var root: Node3D = door_nodes[id]
		var phase := Time.get_ticks_msec() * 0.001 + float(id.length())
		root.position.y = sin(phase * 0.5) * 0.015

func _move_focus(direction: int) -> void:
	var ids := JourneyData.exam_ids()
	if ids.is_empty(): return
	var at := ids.find(selected_exam)
	at = clampi(at + direction, 0, ids.size() - 1) if at >= 0 else (0 if direction > 0 else ids.size() - 1)
	_select_exam(ids[at], false)

func _show_status(text: String, active: bool) -> void:
	if status_label:
		status_label.text = JourneyData.catalog_notice()
		status_label.visible = not status_label.text.is_empty()

func _build_compass_and_dpad(root: Control) -> void:
	# --- Circular Frosted Glass Compass HUD ---
	compass_hud = SWALLERN_COMPASS_SCRIPT.new()
	compass_hud.name = "SwallernCompassHUD"
	compass_hud.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	compass_hud.offset_left = 28
	compass_hud.offset_top = -108
	compass_hud.offset_right = 108
	compass_hud.offset_bottom = -28
	compass_hud.player_node = player
	root.add_child(compass_hud)

	# --- Refined Frosted Glass Movement Pad ---
	var dpad := Control.new()
	dpad.name = "MovementPad"
	dpad.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	dpad.offset_left = -148
	dpad.offset_top = -118
	dpad.offset_right = -24
	dpad.offset_bottom = -24
	root.add_child(dpad)

	var normal_style := _panel_style(Color(0.02, 0.05, 0.10, 0.72), Color(0.32, 0.62, 0.90, 0.38), 8)
	normal_style.content_margin_left = 0
	normal_style.content_margin_right = 0
	normal_style.content_margin_top = 0
	normal_style.content_margin_bottom = 0

	var hover_style := _panel_style(Color(0.08, 0.20, 0.36, 0.85), Color(0.24, 0.78, 1.0, 0.75), 8)
	hover_style.content_margin_left = 0
	hover_style.content_margin_right = 0
	hover_style.content_margin_top = 0
	hover_style.content_margin_bottom = 0

	var pressed_style := _panel_style(Color(0.12, 0.32, 0.50, 0.85), Color(0.30, 0.88, 1.0, 0.90), 8)
	pressed_style.content_margin_left = 0
	pressed_style.content_margin_right = 0
	pressed_style.content_margin_top = 0
	pressed_style.content_margin_bottom = 0

	var directions := [
		{"label":"W", "move":Vector2(0,-1), "pos":Vector2(42, 0)},
		{"label":"A", "move":Vector2(-1,0), "pos":Vector2(2, 42)},
		{"label":"S", "move":Vector2(0,1), "pos":Vector2(42, 42)},
		{"label":"D", "move":Vector2(1,0), "pos":Vector2(82, 42)},
	]
	for item in directions:
		var button := Button.new()
		button.text = item.label
		button.position = item.pos
		button.size = Vector2(36, 36)
		button.focus_mode = Control.FOCUS_NONE
		button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		button.add_theme_font_size_override("font_size", 12)
		button.add_theme_color_override("font_color", Color("#e2edfa"))
		button.add_theme_stylebox_override("normal", normal_style)
		button.add_theme_stylebox_override("hover", hover_style)
		button.add_theme_stylebox_override("pressed", pressed_style)
		var move_vector: Vector2 = item.move
		button.button_down.connect(func(): virtual_move = move_vector)
		button.button_up.connect(func():
			if virtual_move == move_vector: virtual_move = Vector2.ZERO)
		button.mouse_exited.connect(func():
			if not Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) and virtual_move == move_vector: virtual_move = Vector2.ZERO)
		dpad.add_child(button)

func _update_compass() -> void:
	if not is_instance_valid(compass_hud): return
	if compass_hud.player_node == null and is_instance_valid(player):
		compass_hud.player_node = player
	var target := compass_target
	if not is_instance_valid(target) and is_instance_valid(hovered_door):
		target = hovered_door
	compass_hud.target_node = target


func _make_box(label: String, pos: Vector3, size: Vector3, color: Color, roughness: float) -> MeshInstance3D:
	var node := _box_mesh(size, _material(color, roughness))
	node.name = label
	node.position = pos
	add_child(node)
	return node

func _box_mesh(size: Vector3, mat: Material) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	node.mesh = mesh
	node.material_override = mat
	return node

func _cylinder_mesh(radius: float, height: float, mat: Material) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 32
	node.mesh = mesh
	node.material_override = mat
	return node

func _build_potted_plant(parent: Node3D, pos: Vector3, plant_scale: float = 1.0) -> Node3D:
	var plant_root := Node3D.new()
	plant_root.name = "PottedPlant"
	plant_root.position = pos
	plant_root.scale = Vector3.ONE * plant_scale
	parent.add_child(plant_root)

	var pot_mat := _material(Color("#f5f8fc"), 0.22)
	pot_mat.metallic = 0.05
	var pot := _cylinder_mesh(0.28, 0.52, pot_mat)
	pot.position = Vector3(0, 0.26, 0)
	plant_root.add_child(pot)

	var soil_mat := _material(Color("#261e19"), 0.85)
	var soil := _cylinder_mesh(0.25, 0.05, soil_mat)
	soil.position = Vector3(0, 0.51, 0)
	plant_root.add_child(soil)

	var leaf_mat := _material(Color("#2ba857"), 0.42)
	var leaf_mat_dark := _material(Color("#1d8540"), 0.48)
	var offsets := [
		Vector3(0.0, 0.72, 0.0),
		Vector3(-0.12, 0.65, 0.1),
		Vector3(0.14, 0.68, -0.08),
		Vector3(0.08, 0.82, 0.06),
		Vector3(-0.06, 0.78, -0.12)
	]
	var sizes := [0.24, 0.19, 0.21, 0.18, 0.17]
	for i in offsets.size():
		var leaf := MeshInstance3D.new()
		var sph := SphereMesh.new()
		sph.radius = sizes[i]
		sph.height = sizes[i] * 1.8
		leaf.mesh = sph
		leaf.material_override = leaf_mat if i % 2 == 0 else leaf_mat_dark
		leaf.position = offsets[i]
		plant_root.add_child(leaf)

	return plant_root

func _add_box_collision(size: Vector3, pos: Vector3) -> void:
	var body := StaticBody3D.new()
	body.position = pos
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	collision.shape = shape
	body.add_child(collision)
	add_child(body)

func _make_cylinder(label: String, pos: Vector3, radius: float, height: float, color: Color, emission: float) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.name = label
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = 64
	node.mesh = mesh
	node.material_override = _emission_material(color, emission)
	node.position = pos
	add_child(node)
	return node

func _make_torus(label: String, pos: Vector3, radius: float, thickness: float, color: Color, energy: float) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.name = label
	var mesh := TorusMesh.new()
	mesh.inner_radius = radius - thickness
	mesh.outer_radius = radius + thickness
	mesh.rings = 48
	mesh.ring_segments = 8
	node.mesh = mesh
	node.material_override = _emission_material(color, energy)
	node.position = pos
	add_child(node)
	return node

func _torus_mesh(radius: float, thickness: float, material: Material) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	var mesh := TorusMesh.new()
	mesh.inner_radius = radius - thickness
	mesh.outer_radius = radius + thickness
	mesh.rings = 40
	mesh.ring_segments = 8
	node.mesh = mesh
	node.material_override = material
	return node

func _add_fill_light(pos: Vector3, color: Color, energy: float, radius: float) -> void:
	var light := OmniLight3D.new()
	light.position = pos
	light.light_color = color
	light.light_energy = energy
	light.omni_range = radius
	light.shadow_enabled = false
	add_child(light)

func _material(color: Color, roughness: float) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = roughness
	return mat

func _emission_material(color: Color, energy: float) -> StandardMaterial3D:
	var mat := _material(color, 0.3)
	mat.emission_enabled = true
	mat.emission = color
	mat.emission_energy_multiplier = energy
	return mat

func _glass_material(color: Color) -> ShaderMaterial:
	var shader := Shader.new()
	shader.code = """
	shader_type spatial;
	render_mode blend_mix, cull_disabled;
	uniform vec4 glass_tint : source_color;
	uniform float glow = 0.03;
	void fragment() {
		ALBEDO = glass_tint.rgb;
		METALLIC = 0.04;
		ROUGHNESS = 0.22;
		EMISSION = glass_tint.rgb * glow;
		ALPHA = glass_tint.a;
	}
	"""
	var mat := ShaderMaterial.new()
	mat.shader = shader
	mat.set_shader_parameter("glass_tint", Color(color.r * 0.2, color.g * 0.3, color.b * 0.38, 0.13))
	mat.set_shader_parameter("glow", 0.03)
	return mat

func _panel_style(bg: Color, border: Color, radius: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(radius)
	style.content_margin_left = 16
	style.content_margin_right = 16
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	return style

func _style_button(button: Button, accent: Color) -> void:
	var normal := StyleBoxFlat.new()
	normal.bg_color = accent.darkened(0.25)
	normal.border_color = accent.lightened(0.25)
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(10)
	normal.content_margin_left = 13
	normal.content_margin_right = 13
	normal.content_margin_top = 7
	normal.content_margin_bottom = 7
	var hover := normal.duplicate() as StyleBoxFlat
	hover.bg_color = accent.darkened(0.06)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", hover)
	button.add_theme_color_override("font_color", Color.WHITE)
	button.add_theme_font_size_override("font_size", 13)
