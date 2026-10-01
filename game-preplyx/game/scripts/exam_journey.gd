extends Node3D
"""
Swallern Scene 2: Interactive Subject Selection World
An immersive 3D learning world where players explore three major districts
(Art, Science, Commerce) with Swa and choose subjects via floating holographic bubbles.
"""

const SWA_SCENE: PackedScene = preload("res://scenes/player_swa.tscn")
const HUB_SCENE: String = "res://scenes/exam_hub.tscn"
const SWALLERN_COMPASS_SCRIPT: Script = preload("res://scripts/swallern_compass.gd")

# Visual Palette (Swallern Design Language)
const COLOR_SWALLERN_BLUE := Color("#3B82F6")
const COLOR_TEAL := Color("#0D9488")
const COLOR_GREEN := Color("#10B981")
const COLOR_YELLOW := Color("#F59E0B")
const COLOR_ORANGE := Color("#F97316")
const COLOR_PURPLE := Color("#8B5CF6")
const COLOR_NAVY := Color("#0F172A")
const COLOR_LIGHT := Color("#F8FAFC")

# District Configurations
const DISTRICTS := {
	"art": {
		"name": "Art & Humanities",
		"short_name": "ART",
		"angle_deg": -38.0,
		"color": Color("#8B5CF6"),
		"accent": Color("#C084FC"),
		"sign_text": "ART DISTRICT  ·  HUMANITIES & LANGUAGE",
		"description": "Language, literature, visual arts, and creative expression.",
	},
	"science": {
		"name": "Science & Technology",
		"short_name": "SCIENCE",
		"angle_deg": 0.0,
		"color": Color("#0D9488"),
		"accent": Color("#2DD4BF"),
		"sign_text": "SCIENCE DISTRICT  ·  INQUIRY & DISCOVERY",
		"description": "Mathematics, living organisms, matter, forces, and technology.",
	},
	"commerce": {
		"name": "Business & Commerce",
		"short_name": "COMMERCE",
		"angle_deg": 38.0,
		"color": Color("#F59E0B"),
		"accent": Color("#FBBF24"),
		"sign_text": "COMMERCE DISTRICT  ·  ECONOMY & TRADE",
		"description": "Markets, financial systems, trade, public governance, and industry.",
	}
}

# Subject classification and 3D visual archetype lookup
const SUBJECT_ARCHETYPES := {
	"MATH": {"category": "science", "icon_type": "math_polyhedron", "accent": Color("#38BDF8"), "name": "Mathematics"},
	"BIO": {"category": "science", "icon_type": "bio_plant_cell", "accent": Color("#34D399"), "name": "Biology"},
	"CHEM": {"category": "science", "icon_type": "chem_flask_molecule", "accent": Color("#FB923C"), "name": "Chemistry"},
	"PHY": {"category": "science", "icon_type": "phys_planet_magnet", "accent": Color("#60A5FA"), "name": "Physics"},
	"CS": {"category": "science", "icon_type": "cs_computer_circuit", "accent": Color("#818CF8"), "name": "Computer Science"},
	"AGR": {"category": "science", "icon_type": "agr_plant_crop", "accent": Color("#A3E635"), "name": "Agricultural Science"},
	"ENG": {"category": "art", "icon_type": "lit_book_quill", "accent": Color("#C084FC"), "name": "English Language"},
	"LIT": {"category": "art", "icon_type": "lit_book_quill", "accent": Color("#F472B6"), "name": "Literature in English"},
	"ART": {"category": "art", "icon_type": "art_palette_brush", "accent": Color("#E879F9"), "name": "Fine Art"},
	"MUS": {"category": "art", "icon_type": "music_harp", "accent": Color("#A855F7"), "name": "Music"},
	"DRA": {"category": "art", "icon_type": "drama_masks", "accent": Color("#FB7185"), "name": "Drama"},
	"ECON": {"category": "commerce", "icon_type": "econ_coins_graph", "accent": Color("#FBBF24"), "name": "Economics"},
	"GOVT": {"category": "commerce", "icon_type": "govt_capitol_pillars", "accent": Color("#4ADE80"), "name": "Government"},
	"ACC": {"category": "commerce", "icon_type": "acc_ledger_calc_coins", "accent": Color("#38BDF8"), "name": "Accounting"},
	"COMM": {"category": "commerce", "icon_type": "comm_shop_packages", "accent": Color("#FB923C"), "name": "Commerce"},
	"BUS": {"category": "commerce", "icon_type": "comm_shop_packages", "accent": Color("#F43F5E"), "name": "Business Studies"},
	"MKT": {"category": "commerce", "icon_type": "econ_coins_graph", "accent": Color("#F59E0B"), "name": "Marketing"},
}

var player: Node3D
var camera_rig: Node3D
var camera: Camera3D
var world_env: WorldEnvironment
var directional_light: DirectionalLight3D

# Subject Bubble instances
var subject_bubbles: Array[Dictionary] = []
var hovered_bubble: Dictionary = {}
var selected_bubble: Dictionary = {}

# Movement and Navigation
var walk_target := Vector3.ZERO
var virtual_move := Vector2.ZERO
var compass_hud: Control
var is_pointer_down := false

# UI Overlay & Modals
var ui_layer: CanvasLayer
var header_panel: Control
var exam_badge_label: Label
var status_notice_label: Label
var hint_bar_label: Label
var dpad_root: Control

# Year Selection Modal
var year_modal: Control
var year_panel: PanelContainer
var modal_subject_title: Label
var modal_district_badge: Label
var modal_desc_label: Label
var modal_status_subtitle: Label
var year_grid_container: GridContainer
var modal_continue_btn: Button
var modal_cancel_btn: Button
var modal_open := false
var selected_year_value := ""
var selected_year_id_value := ""
var year_buttons: Dictionary = {}

# Audio
var ambient_player: AudioStreamPlayer
var sfx_player: AudioStreamPlayer

func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	JourneyData.availability_changed.connect(_on_catalog_updated)
	
	_setup_lighting_and_world()
	_build_central_hub()
	_build_district_pathways()
	_spawn_swa_companion()
	_build_camera_system()
	_build_hud()
	_build_year_modal()
	_setup_audio()
	
	# Populate subject bubbles from live/fallback catalog
	_populate_world_subjects()
	
	# Trigger background catalog refresh if not yet loaded
	if JourneyData.api_state == "idle" or JourneyData.api_state == "offline":
		JourneyData.load_availability()

func _process(delta: float) -> void:
	_update_player_locomotion(delta)
	_update_camera_tracking(delta)
	_update_subject_bubbles(delta)
	_update_interactive_raycast()

func _exit_tree() -> void:
	if ambient_player:
		ambient_player.stop()

# -----------------------------------------------------------------------------
# 1. 3D ENVIRONMENT & ATMOSPHERE
# -----------------------------------------------------------------------------
# 1. 3D ENVIRONMENT & ATMOSPHERE (LIGHT MODE MATCHING SCENE 1)
# -----------------------------------------------------------------------------
func _setup_lighting_and_world() -> void:
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
	env.ambient_light_energy = 0.32
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.0
	env.tonemap_white = 1.2
	
	env.fog_enabled = false
	
	# Controlled, clean Swallern bloom
	env.glow_enabled = true
	env.glow_normalized = true
	env.glow_intensity = 0.20
	env.glow_strength = 0.70
	env.glow_bloom = 0.0
	env.glow_hdr_threshold = 1.08
	
	world_env = WorldEnvironment.new()
	world_env.environment = env
	add_child(world_env)
	
	# Directional Key Sunlight (warm sunlight with soft shadow matching Scene 1)
	directional_light = DirectionalLight3D.new()
	directional_light.name = "KeySunlight"
	directional_light.rotation_degrees = Vector3(-46.0, -34.0, 0.0)
	directional_light.light_color = Color("#fff5e6")
	directional_light.light_energy = 0.72
	directional_light.shadow_enabled = true
	directional_light.shadow_opacity = 0.74
	directional_light.shadow_blur = 1.35
	add_child(directional_light)
	
	# Soft Skylight Fill
	var fill := DirectionalLight3D.new()
	fill.rotation_degrees = Vector3(30.0, 148.0, 0.0)
	fill.light_color = Color("#b8d6f4")
	fill.light_energy = 0.22
	fill.shadow_enabled = false
	add_child(fill)

# -----------------------------------------------------------------------------
# 2. ARCHITECTURAL WORLD (CENTRAL PLATFORM & 3 DISTRICT PATHWAYS)
# -----------------------------------------------------------------------------
# -----------------------------------------------------------------------------
# 2. ARCHITECTURAL WORLD (SPAWN PLATFORM, MAIN BOULEVARD & FORK JUNCTION)
# -----------------------------------------------------------------------------
const SPAWN_ORIGIN := Vector3(0.0, 0.0, 3.8)
const FORK_ORIGIN := Vector3(0.0, 0.0, -6.5)

func _build_central_hub() -> void:
	var hub_root := Node3D.new()
	hub_root.name = "CentralWorld"
	add_child(hub_root)
	
	# 1. Compact, focused spawn platform (Clean bright atrium marble base, not dominating foreground)
	var spawn_base := _create_mesh_instance(
		CylinderMesh.new(),
		Vector3(0, -0.15, 3.8),
		Vector3(7.2, 0.30, 7.2),
		_pbr_material(Color("#cbd8e4"), 0.32, 0.02)
	)
	hub_root.add_child(spawn_base)
	
	var spawn_plaza := _create_mesh_instance(
		CylinderMesh.new(),
		Vector3(0, -0.06, 3.8),
		Vector3(6.6, 0.12, 6.6),
		_pbr_material(Color("#e2ecf5"), 0.24, 0.02)
	)
	hub_root.add_child(spawn_plaza)
	
	# Outer and inner glowing cyan spawn rings (flush with top surface)
	var spawn_ring := _create_mesh_instance(
		TorusMesh.new(),
		Vector3(0, 0.01, 3.8),
		Vector3(3.1, 0.035, 3.1),
		_emissive_material(Color("#3cd4ff"), 1.05)
	)
	hub_root.add_child(spawn_ring)
	
	var spawn_pad := _create_mesh_instance(
		TorusMesh.new(),
		Vector3(0, 0.01, 3.8),
		Vector3(1.2, 0.025, 1.2),
		_emissive_material(Color("#6ee4ff"), 0.85)
	)
	hub_root.add_child(spawn_pad)
	
	# 2. Shared Main Boulevard (One coherent learning world pathway leading forward to fork)
	var bvd_len := 10.5
	var bvd_center := Vector3(0, -0.06, -1.35)
	var bvd_slab := _create_mesh_instance(
		BoxMesh.new(),
		bvd_center,
		Vector3(4.8, 0.12, bvd_len),
		_pbr_material(Color("#dce8f5"), 0.25, 0.02)
	)
	hub_root.add_child(bvd_slab)
	
	# Luminous neon rail guides along left & right boulevard borders
	for side in [-2.4, 2.4]:
		var rail_pos := Vector3(side, 0.02, -1.35)
		var rail := _create_mesh_instance(
			BoxMesh.new(),
			rail_pos,
			Vector3(0.14, 0.08, bvd_len),
			_emissive_material(COLOR_SWALLERN_BLUE, 1.1)
		)
		hub_root.add_child(rail)
	
	# Boulevard illumination lights
	var bvd_light := OmniLight3D.new()
	bvd_light.position = Vector3(0, 2.4, -1.35)
	bvd_light.light_color = COLOR_SWALLERN_BLUE
	bvd_light.light_energy = 0.55
	bvd_light.omni_range = 8.0
	hub_root.add_child(bvd_light)
	
	# 3. Gradual Fork Junction Plaza (Connecting boulevard to Art, Science, Commerce destinations)
	var fork_base := _create_mesh_instance(
		CylinderMesh.new(),
		Vector3(0, -0.15, -6.5),
		Vector3(9.2, 0.30, 9.2),
		_pbr_material(Color("#cbd8e4"), 0.32, 0.02)
	)
	hub_root.add_child(fork_base)
	
	var fork_plaza := _create_mesh_instance(
		CylinderMesh.new(),
		Vector3(0, -0.06, -6.5),
		Vector3(8.4, 0.12, 8.4),
		_pbr_material(Color("#e2ecf5"), 0.24, 0.02)
	)
	hub_root.add_child(fork_plaza)
	
	var fork_ring := _create_mesh_instance(
		TorusMesh.new(),
		Vector3(0, 0.01, -6.5),
		Vector3(3.9, 0.035, 3.9),
		_emissive_material(Color("#3cd4ff"), 1.05)
	)
	hub_root.add_child(fork_ring)
	
	var fork_light := OmniLight3D.new()
	fork_light.position = Vector3(0, 2.6, -6.5)
	fork_light.light_color = COLOR_SWALLERN_BLUE
	fork_light.light_energy = 0.65
	fork_light.omni_range = 9.0
	hub_root.add_child(fork_light)
	
	# Directional District Guides at the Fork Junction
	_build_central_signposts(hub_root)
	
	# Realm Header floating behind spawn platform
	_build_central_realm_marker(hub_root)

func _build_central_signposts(parent: Node3D) -> void:
	for key in DISTRICTS:
		var d: Dictionary = DISTRICTS[key]
		var angle_rad: float = deg_to_rad(d.angle_deg)
		var dir_vec := Vector3(sin(angle_rad), 0, -cos(angle_rad))
		var sign_pos := FORK_ORIGIN + dir_vec * 3.4 + Vector3(0, 0.8, 0)
		
		var lbl := Label3D.new()
		lbl.text = "✦ " + d.short_name + " ✦"
		lbl.font_size = 24
		lbl.pixel_size = 0.007
		lbl.position = sign_pos
		lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		lbl.modulate = d.accent
		lbl.outline_size = 8
		lbl.outline_modulate = Color("#071224")
		parent.add_child(lbl)

func _build_central_realm_marker(parent: Node3D) -> void:
	var marker_group := Node3D.new()
	marker_group.position = Vector3(0, 0, 7.2)
	parent.add_child(marker_group)
	
	var ground_trim := _create_mesh_instance(
		TorusMesh.new(),
		Vector3(0, 0.04, 0),
		Vector3(2.4, 0.03, 2.4),
		_emissive_material(Color("#3cd4ff"), 1.1)
	)
	marker_group.add_child(ground_trim)
	
	var exam_name := JourneyData.selected_exam if not JourneyData.selected_exam.is_empty() else "SWALLERN"
	var sign_label := Label3D.new()
	sign_label.text = "✦ %s EXAM REALM  ·  CHOOSE YOUR PATH ✦" % exam_name
	sign_label.font_size = 36
	sign_label.pixel_size = 0.0075
	sign_label.position = Vector3(0, 3.8, 0)
	sign_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	sign_label.modulate = Color("#F8FAFC")
	sign_label.outline_size = 8
	sign_label.outline_modulate = Color("#071224")
	marker_group.add_child(sign_label)

func _build_district_pathways() -> void:
	var paths_root := Node3D.new()
	paths_root.name = "DistrictPathways"
	add_child(paths_root)
	
	for key in DISTRICTS:
		var d: Dictionary = DISTRICTS[key]
		var angle_rad: float = deg_to_rad(d.angle_deg)
		var dir_vec := Vector3(sin(angle_rad), 0, -cos(angle_rad))
		var perp_vec := Vector3(-dir_vec.z, 0, dir_vec.x)
		
		var path_group := Node3D.new()
		path_group.name = "Path_" + key.capitalize()
		paths_root.add_child(path_group)
		
		# The three district paths separate forward from the Fork Junction at (0, 0, -6.5)
		var path_start_r := 3.8
		var path_len := 24.0
		var path_center := FORK_ORIGIN + dir_vec * (path_start_r + path_len * 0.5) + Vector3(0, -0.06, 0)
		var p_mat := _pbr_material(Color("#dce8f5"), 0.25, 0.02)
		
		# Floor bridge slab (Bright marble walkway)
		var bridge := _create_mesh_instance(BoxMesh.new(), path_center, Vector3(4.4, 0.12, path_len), p_mat)
		bridge.rotation.y = angle_rad
		path_group.add_child(bridge)
		
		# Glowing neon rail guides along left & right bridge edges
		for side in [-2.2, 2.2]:
			var rail_pos := path_center + perp_vec * float(side) + Vector3(0, 0.08, 0)
			var rail := _create_mesh_instance(BoxMesh.new(), rail_pos, Vector3(0.14, 0.08, path_len), _emissive_material(d.color, 1.15))
			rail.rotation.y = angle_rad
			path_group.add_child(rail)
		
		# Open District Marker at entry
		var gate_pos := FORK_ORIGIN + dir_vec * 6.2
		_build_district_gateway(path_group, gate_pos, angle_rad, d)

func _build_district_gateway(parent: Node3D, pos: Vector3, angle_rad: float, d: Dictionary) -> void:
	var gate := Node3D.new()
	gate.position = pos
	gate.rotation.y = angle_rad
	parent.add_child(gate)
	
	var p_mat := _pbr_material(Color("#f0f5fa"), 0.22, 0.08)
	
	# Sleek ground crystal beacons on left & right borders (Open path, NO door frame)
	for x_side in [-2.5, 2.5]:
		var beacon := _create_mesh_instance(CylinderMesh.new(), Vector3(x_side, 0.55, 0), Vector3(0.32, 1.1, 0.32), p_mat)
		gate.add_child(beacon)
		var gem := _create_mesh_instance(SphereMesh.new(), Vector3(x_side, 1.25, 0), Vector3(0.34, 0.34, 0.34), _emissive_material(d.accent, 1.4))
		gate.add_child(gem)
	
	# Open Floating District Signplate
	var sign_lbl := Label3D.new()
	sign_lbl.text = "✦ " + d.short_name + " DISTRICT ✦"
	sign_lbl.font_size = 32
	sign_lbl.pixel_size = 0.0075
	sign_lbl.position = Vector3(0, 3.2, 0)
	sign_lbl.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	sign_lbl.modulate = d.accent
	sign_lbl.outline_size = 8
	sign_lbl.outline_modulate = Color("#071224")
	gate.add_child(sign_lbl)
	
	# District omni illumination
	var omni := OmniLight3D.new()
	omni.position = Vector3(0, 2.2, 0)
	omni.light_color = d.color
	omni.light_energy = 0.55
	omni.omni_range = 6.5
	gate.add_child(omni)

# -----------------------------------------------------------------------------
# 3. SWA COMPANION INSTANTIATION & GROUNDING
# -----------------------------------------------------------------------------
func _spawn_swa_companion() -> void:
	player = SWA_SCENE.instantiate()
	player.name = "SwaCompanion"
	# Stand completely on top of walkable surface with full feet visibility
	player.position = Vector3(0.0, 0.01, 3.8)
	player.rotation_degrees = Vector3(0.0, 180.0, 0.0)
	add_child(player)
	
	# Soft 2-tier grounding contact shadow beneath Swa's feet
	var shadow_inner := MeshInstance3D.new()
	var mesh_inner := CylinderMesh.new()
	mesh_inner.top_radius = 0.36
	mesh_inner.bottom_radius = 0.36
	mesh_inner.height = 0.002
	shadow_inner.mesh = mesh_inner
	var mat_inner := StandardMaterial3D.new()
	mat_inner.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_inner.albedo_color = Color(0.01, 0.02, 0.05, 0.42)
	shadow_inner.material_override = mat_inner
	shadow_inner.position = Vector3(0, 0.005, 0)
	player.add_child(shadow_inner)
	
	var shadow_outer := MeshInstance3D.new()
	var mesh_outer := CylinderMesh.new()
	mesh_outer.top_radius = 0.58
	mesh_outer.bottom_radius = 0.58
	mesh_outer.height = 0.002
	shadow_outer.mesh = mesh_outer
	var mat_outer := StandardMaterial3D.new()
	mat_outer.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_outer.albedo_color = Color(0.01, 0.02, 0.05, 0.18)
	shadow_outer.material_override = mat_outer
	shadow_outer.position = Vector3(0, 0.003, 0)
	player.add_child(shadow_outer)
	
	if player.has_method("idle"):
		player.idle()
	if player.has_method("set_expression"):
		player.set_expression("happy", 0.3)

func _build_camera_system() -> void:
	camera_rig = Node3D.new()
	camera_rig.name = "CompanionCameraRig"
	camera_rig.position = player.position
	add_child(camera_rig)
	
	camera = Camera3D.new()
	camera.name = "MainGameCamera"
	camera.current = true
	camera.fov = 46.0
	camera.near = 0.1
	camera.far = 150.0
	# Elevated camera composition: Swa framed in foreground, path leads forward into world
	camera.position = Vector3(0.0, 4.8, 9.2)
	camera.rotation_degrees = Vector3(-19.0, 0.0, 0.0)
	camera_rig.add_child(camera)

func _update_camera_tracking(delta: float) -> void:
	if not is_instance_valid(player) or not is_instance_valid(camera_rig): return
	var target_pos: Vector3 = player.global_position
	camera_rig.global_position = camera_rig.global_position.lerp(target_pos, delta * 5.0)

# -----------------------------------------------------------------------------
# 4. HOLOGRAPHIC SUBJECT BUBBLES & RECOGNIZABLE 3D EMBLEMS
# -----------------------------------------------------------------------------
func _populate_world_subjects() -> void:
	for b in subject_bubbles:
		if is_instance_valid(b.get("root")):
			b.root.queue_free()
		if is_instance_valid(b.get("ground_halo")):
			b.ground_halo.queue_free()
	subject_bubbles.clear()
	
	var exam_code := JourneyData.selected_exam if not JourneyData.selected_exam.is_empty() else "JAMB"
	var catalog := JourneyData.exam_data(exam_code)
	var raw_subjects: Array = catalog.get("subjectDetails", [])
	
	# Graceful fallback: If catalog subjectDetails is empty, load standard presentation subjects
	if raw_subjects.is_empty():
		raw_subjects = FallbackExamCatalog.SUBJECT_CATALOG.duplicate(true)
	
	# Segregate subjects by district
	var district_lists: Dictionary = {"art": [], "science": [], "commerce": []}
	for sub in raw_subjects:
		var code: String = str(sub.get("code", "")).to_upper()
		var s_name: String = str(sub.get("name", code))
		var category := _classify_subject_category(code, s_name)
		district_lists[category].append(sub)
	
	# Spawn holographic bubbles along each district path BESIDE the road (alternating left & right)
	# First subjects are placed closer to the fork junction so they are visible sooner
	for cat in district_lists:
		var list: Array = district_lists[cat]
		var dist_cfg: Dictionary = DISTRICTS[cat]
		var angle_rad: float = deg_to_rad(dist_cfg.angle_deg)
		var dir_vec := Vector3(sin(angle_rad), 0, -cos(angle_rad))
		var perp_vec := Vector3(-dir_vec.z, 0, dir_vec.x)
		
		var start_dist := 7.5
		var step_dist := 5.2
		
		for i in range(list.size()):
			var sub_data: Dictionary = list[i]
			var dist := start_dist + float(i) * step_dist
			
			# Flank beside the road: alternate Left side (-2.85m) and Right side (+2.85m)
			var side_sign: float = -1.0 if (i % 2 == 0) else 1.0
			var side_offset: float = side_sign * 2.85
			var bubble_pos := FORK_ORIGIN + dir_vec * dist + perp_vec * side_offset + Vector3(0, 1.85, 0)
			
			_create_subject_bubble_3d(sub_data, cat, bubble_pos, i)

func _classify_subject_category(code: String, s_name: String) -> String:
	if SUBJECT_ARCHETYPES.has(code):
		return SUBJECT_ARCHETYPES[code].category
	var lower := s_name.to_lower()
	if lower.contains("math") or lower.contains("bio") or lower.contains("chem") or lower.contains("phys") or lower.contains("scie") or lower.contains("tech"):
		return "science"
	if lower.contains("econ") or lower.contains("govt") or lower.contains("acc") or lower.contains("comm") or lower.contains("bus") or lower.contains("mark"):
		return "commerce"
	return "art"

func _create_subject_bubble_3d(data: Dictionary, category: String, pos: Vector3, index: int) -> void:
	var code := str(data.get("code", "")).to_upper()
	var s_name := str(data.get("name", code))
	var s_id := str(data.get("id", ""))
	var s_desc := str(data.get("description", "Explore key topics, past questions and exam mastery."))
	
	var archetype: Dictionary = SUBJECT_ARCHETYPES.get(code, {
		"category": category,
		"icon_type": _guess_icon_type(code, s_name),
		"accent": DISTRICTS[category].color,
		"name": s_name
	})
	var accent_color: Color = archetype.accent
	
	var bubble_root := Node3D.new()
	bubble_root.name = "Bubble_" + code
	bubble_root.position = pos
	add_child(bubble_root)
	
	# 1. Outer Holographic Translucent Glass Bubble Sphere
	var glass_sphere := SphereMesh.new()
	glass_sphere.radius = 1.08
	glass_sphere.height = 2.16
	glass_sphere.radial_segments = 32
	glass_sphere.rings = 24
	
	var glass_mat := StandardMaterial3D.new()
	glass_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	glass_mat.albedo_color = Color(accent_color.r, accent_color.g, accent_color.b, 0.26)
	glass_mat.roughness = 0.06
	glass_mat.metallic = 0.15
	glass_mat.emission_enabled = true
	glass_mat.emission = accent_color
	glass_mat.emission_energy_multiplier = 0.42
	glass_mat.rim_enabled = true
	glass_mat.rim = 0.88
	glass_mat.rim_tint = 0.45
	
	var bubble_mesh := MeshInstance3D.new()
	bubble_mesh.mesh = glass_sphere
	bubble_mesh.material_override = glass_mat
	bubble_root.add_child(bubble_mesh)
	
	# Outer subtle holographic ring
	var holo_ring := _create_mesh_instance(
		TorusMesh.new(),
		Vector3.ZERO,
		Vector3(1.22, 0.02, 1.22),
		_emissive_material(accent_color, 1.1)
	)
	holo_ring.rotation_degrees = Vector3(25, 0, 15)
	bubble_root.add_child(holo_ring)
	
	# 2. Glowing Inner Core Omni Light
	var inner_light := OmniLight3D.new()
	inner_light.light_color = accent_color
	inner_light.light_energy = 0.55
	inner_light.omni_range = 3.6
	bubble_root.add_child(inner_light)
	
	# 3. Recognizable 3D Subject Emblem Geometry inside bubble
	var emblem_node := _build_3d_subject_emblem(archetype.icon_type, accent_color)
	bubble_root.add_child(emblem_node)
	
	# 4. Floating 3D Title Nameplate
	var title_label := Label3D.new()
	title_label.text = s_name.to_upper()
	title_label.font_size = 32
	title_label.pixel_size = 0.007
	title_label.position = Vector3(0, 1.50, 0)
	title_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	title_label.modulate = Color("#F8FAFC")
	title_label.outline_size = 8
	title_label.outline_modulate = Color("#071224")
	bubble_root.add_child(title_label)
	
	# Category subtitle tag
	var tag_label := Label3D.new()
	tag_label.text = "[ " + DISTRICTS[category].short_name + " ]"
	tag_label.font_size = 20
	tag_label.pixel_size = 0.0065
	tag_label.position = Vector3(0, 1.84, 0)
	tag_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	tag_label.modulate = accent_color
	tag_label.outline_size = 6
	tag_label.outline_modulate = Color("#071224")
	bubble_root.add_child(tag_label)
	
	# Interactive action beacon prompt (visible on approach / hover)
	var prompt_label := Label3D.new()
	prompt_label.text = "✦ TAP / ENTER TO SELECT ✦"
	prompt_label.font_size = 18
	prompt_label.pixel_size = 0.006
	prompt_label.position = Vector3(0, -1.35, 0)
	prompt_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	prompt_label.modulate = Color(1.0, 1.0, 1.0, 0.0) # Hidden by default
	prompt_label.outline_size = 5
	prompt_label.outline_modulate = Color("#071224")
	bubble_root.add_child(prompt_label)
	
	# 5. Floor Ground Halo under the bubble
	var ground_halo := _create_mesh_instance(
		TorusMesh.new(),
		Vector3(pos.x, 0.06, pos.z),
		Vector3(1.35, 0.04, 1.35),
		_emissive_material(accent_color, 0.75)
	)
	add_child(ground_halo)
	
	# Register bubble record
	var record := {
		"code": code,
		"name": s_name,
		"id": s_id,
		"description": s_desc,
		"category": category,
		"accent": accent_color,
		"root": bubble_root,
		"mesh": bubble_mesh,
		"holo_ring": holo_ring,
		"emblem": emblem_node,
		"light": inner_light,
		"title_label": title_label,
		"tag_label": tag_label,
		"prompt_label": prompt_label,
		"ground_halo": ground_halo,
		"base_pos": pos,
		"phase_offset": float(index) * 1.35,
		"is_hovered": false,
		"scale_current": 1.0,
		"scale_target": 1.0,
	}
	subject_bubbles.append(record)

func _guess_icon_type(code: String, s_name: String) -> String:
	var lower := s_name.to_lower()
	if lower.contains("bio"): return "bio_plant_cell"
	if lower.contains("chem"): return "chem_flask_molecule"
	if lower.contains("phys"): return "phys_planet_magnet"
	if lower.contains("math"): return "math_polyhedron"
	if lower.contains("comp") or lower.contains("tech"): return "cs_computer_circuit"
	if lower.contains("acc") or lower.contains("finan"): return "acc_ledger_calc_coins"
	if lower.contains("econ"): return "econ_coins_graph"
	if lower.contains("comm") or lower.contains("bus"): return "comm_shop_packages"
	if lower.contains("art"): return "art_palette_brush"
	if lower.contains("lit") or lower.contains("eng"): return "lit_book_quill"
	if lower.contains("agr"): return "agr_plant_crop"
	if lower.contains("govt") or lower.contains("civic"): return "govt_capitol_pillars"
	return "math_polyhedron"

# -----------------------------------------------------------------------------
# 3D RECOGNIZABLE SUBJECT EMBLEMS
# -----------------------------------------------------------------------------
func _build_3d_subject_emblem(type: String, accent: Color) -> Node3D:
	var emblem := Node3D.new()
	emblem.name = "Emblem3D"
	
	var mat_accent := _emissive_material(accent, 1.4)
	var mat_gold := _pbr_material(Color("#FBBF24"), 0.15, 0.85)
	var mat_metal := _pbr_material(Color("#E2E8F0"), 0.2, 0.9)
	var mat_glass := _pbr_material(Color(accent.r, accent.g, accent.b, 0.6), 0.05, 0.2)
	
	match type:
		"bio_plant_cell":
			# Biology: Plant + Animal + Cell
			# 1. Biological Cell: Translucent sphere with glowing nucleus and organelle dots
			var cell_outer := _create_mesh_instance(SphereMesh.new(), Vector3(-0.25, 0.1, 0), Vector3(0.48, 0.48, 0.48), _emissive_material(Color("#34D399"), 1.2))
			var cell_nucleus := _create_mesh_instance(SphereMesh.new(), Vector3(-0.25, 0.1, 0), Vector3(0.22, 0.22, 0.22), _emissive_material(Color("#F59E0B"), 1.8))
			emblem.add_child(cell_outer)
			emblem.add_child(cell_nucleus)
			
			# 2. Plant: Emerald curved stem + twin leaf blades
			var stem := _create_mesh_instance(CylinderMesh.new(), Vector3(0.3, -0.15, 0), Vector3(0.06, 0.65, 0.06), _pbr_material(Color("#10B981"), 0.3, 0.1))
			stem.rotation_degrees = Vector3(0, 0, -15)
			emblem.add_child(stem)
			
			var leaf1 := _create_mesh_instance(SphereMesh.new(), Vector3(0.42, 0.12, 0.05), Vector3(0.28, 0.06, 0.16), _emissive_material(Color("#22C55E"), 1.3))
			leaf1.rotation_degrees = Vector3(20, 25, 35)
			var leaf2 := _create_mesh_instance(SphereMesh.new(), Vector3(0.18, 0.0, -0.05), Vector3(0.24, 0.05, 0.14), _emissive_material(Color("#10B981"), 1.3))
			leaf2.rotation_degrees = Vector3(-20, -25, -30)
			emblem.add_child(leaf1)
			emblem.add_child(leaf2)
			
			# 3. DNA strands bridging the two
			for i in range(3):
				var y_step := -0.3 + float(i) * 0.25
				var rung := _create_mesh_instance(CylinderMesh.new(), Vector3(0.02, y_step, 0), Vector3(0.03, 0.45, 0.03), mat_gold)
				rung.rotation_degrees = Vector3(0, float(i) * 45, 90)
				emblem.add_child(rung)
		
		"chem_flask_molecule":
			# Chemistry: Molecules + Flask
			# 1. Laboratory Conical Flask (Body + Neck + Rim)
			var flask_body := _create_mesh_instance(CylinderMesh.new(), Vector3(0, -0.25, 0), Vector3(0.65, 0.45, 0.65), mat_glass)
			var flask_neck := _create_mesh_instance(CylinderMesh.new(), Vector3(0, 0.1, 0), Vector3(0.18, 0.38, 0.18), mat_glass)
			var flask_liquid := _create_mesh_instance(CylinderMesh.new(), Vector3(0, -0.32, 0), Vector3(0.55, 0.22, 0.55), _emissive_material(Color("#FB923C"), 1.6))
			emblem.add_child(flask_body)
			emblem.add_child(flask_neck)
			emblem.add_child(flask_liquid)
			
			# 2. Hovering Molecule (Central Atom + Satellite Atoms + Bonds)
			var mol_center := _create_mesh_instance(SphereMesh.new(), Vector3(0, 0.48, 0), Vector3(0.26, 0.26, 0.26), _emissive_material(Color("#F97316"), 1.8))
			emblem.add_child(mol_center)
			
			var sat_angles := [0.0, 2.1, 4.2]
			for a in sat_angles:
				var sat_pos := Vector3(cos(a) * 0.42, 0.48 + sin(a * 2.0) * 0.1, sin(a) * 0.42)
				var sat_atom := _create_mesh_instance(SphereMesh.new(), sat_pos, Vector3(0.15, 0.15, 0.15), _emissive_material(Color("#FDE047"), 1.5))
				var bond := _create_mesh_instance(CylinderMesh.new(), sat_pos * 0.5 + Vector3(0, 0.24, 0), Vector3(0.03, 0.42, 0.03), mat_metal)
				bond.look_at_from_position(sat_pos * 0.5 + Vector3(0, 0.24, 0), sat_pos, Vector3.UP)
				bond.rotation.x += PI * 0.5
				emblem.add_child(sat_atom)
				emblem.add_child(bond)
		
		"phys_planet_magnet":
			# Physics: Planet/Orbit + Magnet
			# 1. Celestial Planet & Planetary Ring
			var planet := _create_mesh_instance(SphereMesh.new(), Vector3(-0.22, 0.15, 0), Vector3(0.48, 0.48, 0.48), _emissive_material(Color("#60A5FA"), 1.5))
			var planet_ring := _create_mesh_instance(TorusMesh.new(), Vector3(-0.22, 0.15, 0), Vector3(0.85, 0.025, 0.85), _emissive_material(Color("#93C5FD"), 1.4))
			planet_ring.rotation_degrees = Vector3(55, 20, 0)
			emblem.add_child(planet)
			emblem.add_child(planet_ring)
			
			# 2. Horseshoe Magnet (U-shape curve + North/South colored tips)
			var mag_base := _create_mesh_instance(TorusMesh.new(), Vector3(0.32, -0.15, 0), Vector3(0.45, 0.12, 0.45), _pbr_material(Color("#334155"), 0.2, 0.8))
			mag_base.rotation_degrees = Vector3(90, 0, 0)
			emblem.add_child(mag_base)
			
			# North Pole (Red) & South Pole (Blue)
			var n_pole := _create_mesh_instance(BoxMesh.new(), Vector3(0.16, -0.02, 0), Vector3(0.14, 0.18, 0.14), _emissive_material(Color("#EF4444"), 1.5))
			var s_pole := _create_mesh_instance(BoxMesh.new(), Vector3(0.48, -0.02, 0), Vector3(0.14, 0.18, 0.14), _emissive_material(Color("#3B82F6"), 1.5))
			emblem.add_child(n_pole)
			emblem.add_child(s_pole)
		
		"math_polyhedron":
			# Mathematics: Geometric Shapes + Mathematical Numbers/Symbols
			# 1. Interlocking Faceted Geometric Polyhedron
			var core_cube := _create_mesh_instance(BoxMesh.new(), Vector3.ZERO, Vector3(0.65, 0.65, 0.65), mat_accent)
			core_cube.rotation_degrees = Vector3(45, 45, 0)
			var outer_cage := _create_mesh_instance(TorusMesh.new(), Vector3.ZERO, Vector3(0.95, 0.035, 0.95), mat_gold)
			outer_cage.rotation_degrees = Vector3(45, 0, 45)
			emblem.add_child(core_cube)
			emblem.add_child(outer_cage)
			
			# 2. 3D Floating Mathematical Symbols (Plus, Pi glyph)
			var plus_h := _create_mesh_instance(BoxMesh.new(), Vector3(0.45, 0.4, 0), Vector3(0.28, 0.08, 0.08), _emissive_material(Color("#FACC15"), 1.5))
			var plus_v := _create_mesh_instance(BoxMesh.new(), Vector3(0.45, 0.4, 0), Vector3(0.08, 0.28, 0.08), _emissive_material(Color("#FACC15"), 1.5))
			emblem.add_child(plus_h)
			emblem.add_child(plus_v)
			
			var pi_bar := _create_mesh_instance(BoxMesh.new(), Vector3(-0.45, 0.4, 0), Vector3(0.28, 0.07, 0.07), mat_metal)
			var pi_leg1 := _create_mesh_instance(BoxMesh.new(), Vector3(-0.52, 0.28, 0), Vector3(0.07, 0.22, 0.07), mat_metal)
			var pi_leg2 := _create_mesh_instance(BoxMesh.new(), Vector3(-0.38, 0.28, 0), Vector3(0.07, 0.22, 0.07), mat_metal)
			emblem.add_child(pi_bar)
			emblem.add_child(pi_leg1)
			emblem.add_child(pi_leg2)
		
		"cs_computer_circuit":
			# Computer Science: Computer Monitor + Circuit Board
			# 1. Holographic Workstation Monitor
			var mon_screen := _create_mesh_instance(BoxMesh.new(), Vector3(0, 0.18, 0), Vector3(0.72, 0.52, 0.08), _pbr_material(Color("#0F172A"), 0.2, 0.5))
			var mon_display := _create_mesh_instance(BoxMesh.new(), Vector3(0, 0.18, 0.045), Vector3(0.64, 0.44, 0.02), _emissive_material(Color("#818CF8"), 1.6))
			var mon_stand := _create_mesh_instance(CylinderMesh.new(), Vector3(0, -0.15, 0), Vector3(0.08, 0.22, 0.08), mat_metal)
			var mon_base := _create_mesh_instance(BoxMesh.new(), Vector3(0, -0.26, 0), Vector3(0.42, 0.04, 0.32), mat_metal)
			emblem.add_child(mon_screen)
			emblem.add_child(mon_display)
			emblem.add_child(mon_stand)
			emblem.add_child(mon_base)
			
			# 2. Circuit Matrix base with microchip
			var chip := _create_mesh_instance(BoxMesh.new(), Vector3(0.35, -0.24, 0.2), Vector3(0.22, 0.06, 0.22), _emissive_material(Color("#22D3EE"), 1.8))
			emblem.add_child(chip)
		
		"acc_ledger_calc_coins":
			# Accounting: Ledger + Calculator + Coins
			# 1. Open Financial Ledger Book
			var ledger_l := _create_mesh_instance(BoxMesh.new(), Vector3(-0.25, 0.05, 0), Vector3(0.42, 0.06, 0.58), _pbr_material(Color("#F8FAFC"), 0.2, 0.1))
			ledger_l.rotation_degrees = Vector3(0, 0, 12)
			var ledger_r := _create_mesh_instance(BoxMesh.new(), Vector3(0.25, 0.05, 0), Vector3(0.42, 0.06, 0.58), _pbr_material(Color("#F8FAFC"), 0.2, 0.1))
			ledger_r.rotation_degrees = Vector3(0, 0, -12)
			emblem.add_child(ledger_l)
			emblem.add_child(ledger_r)
			
			# 2. Calculator Tablet with Keypad grid
			var calc_body := _create_mesh_instance(BoxMesh.new(), Vector3(0.28, 0.35, 0.1), Vector3(0.32, 0.44, 0.06), _pbr_material(Color("#1E293B"), 0.2, 0.4))
			var calc_screen := _create_mesh_instance(BoxMesh.new(), Vector3(0.28, 0.48, 0.135), Vector3(0.24, 0.1, 0.02), _emissive_material(Color("#38BDF8"), 1.6))
			emblem.add_child(calc_body)
			emblem.add_child(calc_screen)
			
			# 3. Stack of Metallic Coins
			for i in range(3):
				var coin := _create_mesh_instance(CylinderMesh.new(), Vector3(-0.35, -0.15 + float(i) * 0.08, 0.2), Vector3(0.32, 0.06, 0.32), mat_gold)
				emblem.add_child(coin)
		
		"econ_coins_graph":
			# Economics: Coins + Ascending Graph
			# 1. Stacked Gold Coin Columns
			for i in range(4):
				var c1 := _create_mesh_instance(CylinderMesh.new(), Vector3(-0.32, -0.28 + float(i) * 0.12, 0), Vector3(0.42, 0.09, 0.42), mat_gold)
				emblem.add_child(c1)
			for i in range(2):
				var c2 := _create_mesh_instance(CylinderMesh.new(), Vector3(-0.02, -0.28 + float(i) * 0.12, 0.15), Vector3(0.38, 0.09, 0.38), mat_gold)
				emblem.add_child(c2)
			
			# 2. 3D Ascending Bar Graph Pillars + Trend Arrow
			var bar1 := _create_mesh_instance(BoxMesh.new(), Vector3(0.12, -0.15, -0.1), Vector3(0.15, 0.35, 0.15), _pbr_material(Color("#3B82F6"), 0.2, 0.4))
			var bar2 := _create_mesh_instance(BoxMesh.new(), Vector3(0.30, 0.02, -0.1), Vector3(0.15, 0.65, 0.15), _pbr_material(Color("#3B82F6"), 0.2, 0.4))
			var bar3 := _create_mesh_instance(BoxMesh.new(), Vector3(0.48, 0.22, -0.1), Vector3(0.15, 1.05, 0.15), _emissive_material(Color("#FBBF24"), 1.6))
			emblem.add_child(bar1)
			emblem.add_child(bar2)
			emblem.add_child(bar3)
			
			# Upward Trend Arrow
			var arrow := _create_mesh_instance(BoxMesh.new(), Vector3(0.32, 0.45, 0.0), Vector3(0.12, 0.55, 0.12), _emissive_material(Color("#22C55E"), 1.8))
			arrow.rotation_degrees = Vector3(0, 0, -45)
			emblem.add_child(arrow)
		
		"comm_shop_packages":
			# Commerce: Shop / Market Stall + Packages / Cargo Trade
			# 1. Market Shop Canopy Awning
			var roof := _create_mesh_instance(BoxMesh.new(), Vector3(0, 0.32, 0), Vector3(0.78, 0.12, 0.65), _pbr_material(Color("#EA580C"), 0.3, 0.1))
			roof.rotation_degrees = Vector3(15, 0, 0)
			var counter := _create_mesh_instance(BoxMesh.new(), Vector3(0, -0.18, 0), Vector3(0.72, 0.38, 0.45), _pbr_material(Color("#78350F"), 0.4, 0.1))
			emblem.add_child(roof)
			emblem.add_child(counter)
			
			# 2. Shipping Cargo Crate / Package with security ribbon
			var crate := _create_mesh_instance(BoxMesh.new(), Vector3(0.38, -0.1, 0.22), Vector3(0.36, 0.36, 0.36), _pbr_material(Color("#D97706"), 0.3, 0.2))
			var strap_h := _create_mesh_instance(BoxMesh.new(), Vector3(0.38, -0.1, 0.22), Vector3(0.38, 0.06, 0.38), _emissive_material(Color("#FEF08A"), 1.4))
			var strap_v := _create_mesh_instance(BoxMesh.new(), Vector3(0.38, -0.1, 0.22), Vector3(0.06, 0.38, 0.38), _emissive_material(Color("#FEF08A"), 1.4))
			emblem.add_child(crate)
			emblem.add_child(strap_h)
			emblem.add_child(strap_v)
		
		"art_palette_brush":
			# Art: Palette + Brush
			# 1. Artist Wooden Palette
			var palette := _create_mesh_instance(CylinderMesh.new(), Vector3(-0.1, -0.05, 0), Vector3(0.72, 0.04, 0.58), _pbr_material(Color("#B45309"), 0.3, 0.1))
			palette.rotation_degrees = Vector3(25, -20, 15)
			emblem.add_child(palette)
			
			# 5 Colorful paint pigment drops on palette
			var paint_cols := [Color("#EF4444"), Color("#3B82F6"), Color("#EAB308"), Color("#10B981"), Color("#A855F7")]
			for i in range(paint_cols.size()):
				var ang := float(i) * 0.9 - 1.8
				var p_dot := _create_mesh_instance(SphereMesh.new(), Vector3(-0.1 + cos(ang) * 0.24, 0.02 + sin(ang) * 0.1, sin(ang) * 0.18), Vector3(0.09, 0.05, 0.09), _emissive_material(paint_cols[i], 1.5))
				emblem.add_child(p_dot)
			
			# 2. Artist Paintbrush
			var handle := _create_mesh_instance(CylinderMesh.new(), Vector3(0.28, 0.25, 0), Vector3(0.04, 0.72, 0.04), _pbr_material(Color("#78350F"), 0.3, 0.1))
			handle.rotation_degrees = Vector3(0, 0, -40)
			var ferrule := _create_mesh_instance(CylinderMesh.new(), Vector3(0.12, 0.04, 0), Vector3(0.055, 0.14, 0.055), mat_metal)
			ferrule.rotation_degrees = Vector3(0, 0, -40)
			var bristle_mesh := CylinderMesh.new()
			bristle_mesh.top_radius = 0.0
			bristle_mesh.bottom_radius = 0.5
			bristle_mesh.height = 1.0
			var bristles := _create_mesh_instance(bristle_mesh, Vector3(0.05, -0.05, 0), Vector3(0.06, 0.18, 0.06), _emissive_material(Color("#E879F9"), 1.6))
			bristles.rotation_degrees = Vector3(0, 0, 140)
			emblem.add_child(handle)
			emblem.add_child(ferrule)
			emblem.add_child(bristles)
		
		"lit_book_quill":
			# Literature / English: Open Book + Quill
			# 1. Open Hardcover Manuscript
			var cover_l := _create_mesh_instance(BoxMesh.new(), Vector3(-0.28, -0.05, 0), Vector3(0.48, 0.05, 0.65), _pbr_material(Color("#1E293B"), 0.3, 0.3))
			cover_l.rotation_degrees = Vector3(0, 0, 14)
			var cover_r := _create_mesh_instance(BoxMesh.new(), Vector3(0.28, -0.05, 0), Vector3(0.48, 0.05, 0.65), _pbr_material(Color("#1E293B"), 0.3, 0.3))
			cover_r.rotation_degrees = Vector3(0, 0, -14)
			var pages_l := _create_mesh_instance(BoxMesh.new(), Vector3(-0.25, 0.02, 0), Vector3(0.42, 0.08, 0.60), _pbr_material(Color("#FEF3C7"), 0.2, 0.05))
			pages_l.rotation_degrees = Vector3(0, 0, 14)
			var pages_r := _create_mesh_instance(BoxMesh.new(), Vector3(0.25, 0.02, 0), Vector3(0.42, 0.08, 0.60), _pbr_material(Color("#FEF3C7"), 0.2, 0.05))
			pages_r.rotation_degrees = Vector3(0, 0, -14)
			emblem.add_child(cover_l)
			emblem.add_child(cover_r)
			emblem.add_child(pages_l)
			emblem.add_child(pages_r)
			
			# 2. Feather Quill Pen
			var quill_shaft := _create_mesh_instance(CylinderMesh.new(), Vector3(0.22, 0.32, 0), Vector3(0.03, 0.65, 0.03), _pbr_material(Color("#F8FAFC"), 0.2, 0.2))
			quill_shaft.rotation_degrees = Vector3(0, 0, -35)
			var feather := _create_mesh_instance(SphereMesh.new(), Vector3(0.35, 0.52, 0), Vector3(0.18, 0.42, 0.04), _emissive_material(accent, 1.4))
			feather.rotation_degrees = Vector3(0, 0, -35)
			var nib_mesh := CylinderMesh.new()
			nib_mesh.top_radius = 0.0
			nib_mesh.bottom_radius = 0.5
			nib_mesh.height = 1.0
			var nib := _create_mesh_instance(nib_mesh, Vector3(0.05, 0.08, 0), Vector3(0.04, 0.12, 0.04), mat_gold)
			nib.rotation_degrees = Vector3(0, 0, 145)
			emblem.add_child(quill_shaft)
			emblem.add_child(feather)
			emblem.add_child(nib)
		
		"agr_plant_crop":
			# Agriculture: Wheat Stalks + Seedling
			for i in [-0.18, 0.18]:
				var stalk := _create_mesh_instance(CylinderMesh.new(), Vector3(i, 0.0, 0), Vector3(0.04, 0.75, 0.04), _pbr_material(Color("#CA8A04"), 0.3, 0.1))
				var ear := _create_mesh_instance(SphereMesh.new(), Vector3(i, 0.42, 0), Vector3(0.15, 0.35, 0.15), _emissive_material(Color("#FACC15"), 1.6))
				emblem.add_child(stalk)
				emblem.add_child(ear)
			var base_pot := _create_mesh_instance(CylinderMesh.new(), Vector3(0, -0.32, 0), Vector3(0.55, 0.22, 0.55), _pbr_material(Color("#78350F"), 0.4, 0.1))
			emblem.add_child(base_pot)
		
		"govt_capitol_pillars":
			# Government: Capitol Pediment + Columns
			var base := _create_mesh_instance(BoxMesh.new(), Vector3(0, -0.38, 0), Vector3(0.85, 0.12, 0.55), mat_accent)
			var roof := _create_mesh_instance(BoxMesh.new(), Vector3(0, 0.38, 0), Vector3(0.85, 0.12, 0.55), mat_accent)
			emblem.add_child(base)
			emblem.add_child(roof)
			for x_col in [-0.28, 0.0, 0.28]:
				var col := _create_mesh_instance(CylinderMesh.new(), Vector3(x_col, 0, 0), Vector3(0.11, 0.64, 0.11), mat_gold)
				emblem.add_child(col)
		
		_:
			# Default Crystal Polyhedron
			var gem := _create_mesh_instance(SphereMesh.new(), Vector3.ZERO, Vector3(0.65, 0.9, 0.65), mat_accent)
			emblem.add_child(gem)
	
	return emblem

# -----------------------------------------------------------------------------
# 5. INTERACTION & PROXIMITY BEHAVIOR
# -----------------------------------------------------------------------------
func _update_subject_bubbles(delta: float) -> void:
	var t: float = Time.get_ticks_msec() * 0.001
	var player_pos := player.global_position if is_instance_valid(player) else Vector3.ZERO
	var closest_bubble: Dictionary = {}
	var min_dist := 999.0
	
	for b in subject_bubbles:
		var root: Node3D = b.root
		var base_pos: Vector3 = b.base_pos
		var offset: float = b.phase_offset
		
		# 1. Floating bobbing sine wave
		var bob_y := sin(t * 1.8 + offset) * 0.14
		root.position.y = base_pos.y + bob_y
		
		# 2. Hologram rotation
		var emblem: Node3D = b.emblem
		if is_instance_valid(emblem):
			emblem.rotation.y += delta * 1.1
			emblem.rotation.x = sin(t * 0.8 + offset) * 0.12
		
		var h_ring: Node3D = b.get("holo_ring")
		if is_instance_valid(h_ring):
			h_ring.rotation.y += delta * 0.8
		
		# 3. Proximity detection
		var dist_to_player := player_pos.distance_to(root.global_position)
		if dist_to_player < min_dist:
			min_dist = dist_to_player
			closest_bubble = b
		
		var is_near := dist_to_player < 3.4
		var is_active: bool = is_near or bool(b.get("is_hovered", false))
		
		# Bubble smooth scaling up when approached or hovered
		b.scale_target = 1.22 if is_active else 1.0
		b.scale_current = lerpf(float(b.scale_current), float(b.scale_target), delta * 6.0)
		root.scale = Vector3.ONE * float(b.scale_current)
		
		# Glass emission glow ramp
		var mat: StandardMaterial3D = b.mesh.material_override
		var target_energy: float = 1.25 if is_active else 0.42
		mat.emission_energy_multiplier = lerpf(mat.emission_energy_multiplier, target_energy, delta * 5.0)
		
		# Inner light intensity
		var light: OmniLight3D = b.light
		if is_instance_valid(light):
			light.light_energy = lerpf(light.light_energy, 1.35 if is_active else 0.55, delta * 5.0)
		
		# Ground halo glow ramp
		var halo_mat: StandardMaterial3D = b.ground_halo.material_override
		halo_mat.emission_energy_multiplier = lerpf(halo_mat.emission_energy_multiplier, 1.45 if is_active else 0.65, delta * 5.0)
		
		# Prompt beacon visibility
		var prompt: Label3D = b.get("prompt_label")
		if is_instance_valid(prompt):
			var target_alpha := 1.0 if is_active else 0.0
			prompt.modulate.a = lerpf(prompt.modulate.a, target_alpha, delta * 6.0)
	
	# Swa companion awareness: looks attentively at closest bubble
	if min_dist < 4.8 and not closest_bubble.is_empty() and is_instance_valid(player):
		if player.has_method("look_at_target"):
			player.look_at_target(closest_bubble.root.global_position, 0.78)
		if hint_bar_label and not modal_open:
			hint_bar_label.text = "[ %s ]  ·  TAP OR PRESS ENTER TO CHOOSE SUBJECT" % closest_bubble.name.to_upper()
	elif hint_bar_label and not modal_open:
		hint_bar_label.text = "W A S D / ARROWS MOVE  ·  CLICK SUBJECT BUBBLES TO EXPLORE"

func _update_interactive_raycast() -> void:
	if modal_open: return
	var mouse_pos := get_viewport().get_mouse_position()
	var ray_origin := camera.project_ray_origin(mouse_pos)
	var ray_dir := camera.project_ray_normal(mouse_pos)
	
	var best_bubble: Dictionary = {}
	var best_dist := 999.0
	
	for b in subject_bubbles:
		var center: Vector3 = b.root.global_position
		# Sphere intersection test (Radius = 1.45m for touch-friendly clickability)
		var oc := ray_origin - center
		var b_val := oc.dot(ray_dir)
		var c_val := oc.dot(oc) - (1.45 * 1.45)
		var disc := b_val * b_val - c_val
		
		if disc >= 0.0:
			var t_hit := -b_val - sqrt(disc)
			if t_hit > 0.0 and t_hit < best_dist:
				best_dist = t_hit
				best_bubble = b
	
	# Update hover states
	for b in subject_bubbles:
		var was_hovered: bool = b.is_hovered
		b.is_hovered = (b == best_bubble)
		if not was_hovered and b.is_hovered:
			_play_sound("res://assets/audio/ui/navigation_tick.wav", 0.95)

func _unhandled_input(event: InputEvent) -> void:
	if modal_open:
		if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
			_close_year_modal()
		return
	
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		is_pointer_down = true
		_handle_world_click(event.position)
	elif event is InputEventMouseButton and not event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		is_pointer_down = false
	
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ENTER or event.keycode == KEY_SPACE:
			_select_nearest_bubble()
		elif event.keycode == KEY_ESCAPE:
			_return_to_hub()

func _handle_world_click(screen_pos: Vector2) -> void:
	var ray_origin := camera.project_ray_origin(screen_pos)
	var ray_dir := camera.project_ray_normal(screen_pos)
	
	# 1. Check if clicked directly on a subject bubble
	for b in subject_bubbles:
		var center: Vector3 = b.root.global_position
		var oc := ray_origin - center
		var b_val := oc.dot(ray_dir)
		var c_val := oc.dot(oc) - (1.5 * 1.5)
		if b_val * b_val - c_val >= 0.0:
			_on_subject_bubble_selected(b)
			return
	
	# 2. Otherwise, click on ground path to direct Swa to walk there
	var plane := Plane(Vector3.UP, 0.0)
	var hit: Variant = plane.intersects_ray(ray_origin, ray_dir)
	if hit is Vector3:
		walk_target = _clamp_to_walkable_area(hit)
		if player and player.has_method("navigate_to"):
			player.navigate_to(walk_target)

func _select_nearest_bubble() -> void:
	var player_pos := player.global_position if is_instance_valid(player) else Vector3.ZERO
	var nearest: Dictionary = {}
	var min_dist := 999.0
	for b in subject_bubbles:
		var d := player_pos.distance_to(b.root.global_position)
		if d < min_dist:
			min_dist = d
			nearest = b
	if min_dist < 4.2 and not nearest.is_empty():
		_on_subject_bubble_selected(nearest)

func _on_subject_bubble_selected(bubble: Dictionary) -> void:
	selected_bubble = bubble
	_play_sound("res://assets/audio/ui/portal_select.wav", 1.1)
	
	# Companion celebration reaction
	if is_instance_valid(player):
		if player.has_method("celebrate"):
			player.celebrate()
		elif player.has_method("excited"):
			player.excited()
	
	# Open Year Selection Glass Modal
	_open_year_modal_for_subject(bubble)

# -----------------------------------------------------------------------------
# 6. YEAR SELECTION MODAL (POLISHED SWALLERN GLASS PANEL)
# -----------------------------------------------------------------------------
func _build_year_modal() -> void:
	year_modal = Control.new()
	year_modal.name = "YearSelectionModal"
	year_modal.set_anchors_preset(Control.PRESET_FULL_RECT)
	year_modal.visible = false
	ui_layer.add_child(year_modal)
	
	# Dimmed backdrop
	var backdrop := ColorRect.new()
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.color = Color(0.015, 0.035, 0.07, 0.72)
	year_modal.add_child(backdrop)
	
	# Center Frosted Glass Panel Container
	year_panel = PanelContainer.new()
	year_panel.custom_minimum_size = Vector2(640, 530)
	year_panel.set_anchors_preset(Control.PRESET_CENTER)
	year_panel.offset_left = -320
	year_panel.offset_top = -265
	year_panel.offset_right = 320
	year_panel.offset_bottom = 265
	
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.02, 0.05, 0.10, 0.94)
	style.border_color = Color("#38BDF8")
	style.set_border_width_all(2)
	style.set_corner_radius_all(16)
	style.shadow_color = Color(0.0, 0.45, 0.8, 0.28)
	style.shadow_size = 20
	style.shadow_offset = Vector2(0, 6)
	style.content_margin_left = 32
	style.content_margin_right = 32
	style.content_margin_top = 28
	style.content_margin_bottom = 28
	year_panel.add_theme_stylebox_override("panel", style)
	year_modal.add_child(year_panel)
	
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 14)
	year_panel.add_child(vbox)
	
	# Top Header Bar
	var top_bar := HBoxContainer.new()
	vbox.add_child(top_bar)
	
	modal_district_badge = Label.new()
	modal_district_badge.text = "SCIENCE DISTRICT"
	modal_district_badge.add_theme_color_override("font_color", Color("#38BDF8"))
	modal_district_badge.add_theme_font_size_override("font_size", 12)
	top_bar.add_child(modal_district_badge)
	
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top_bar.add_child(spacer)
	
	modal_cancel_btn = Button.new()
	modal_cancel_btn.text = "✕ CLOSE"
	modal_cancel_btn.focus_mode = Control.FOCUS_ALL
	modal_cancel_btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	modal_cancel_btn.pressed.connect(_close_year_modal)
	_style_glass_button(modal_cancel_btn, Color("#334B68"))
	top_bar.add_child(modal_cancel_btn)
	
	# Subject Title
	modal_subject_title = Label.new()
	modal_subject_title.text = "BIOLOGY"
	modal_subject_title.add_theme_font_size_override("font_size", 28)
	modal_subject_title.add_theme_color_override("font_color", Color("#F8FAFC"))
	vbox.add_child(modal_subject_title)
	
	# Subject Description
	modal_desc_label = Label.new()
	modal_desc_label.text = "Living organisms, genetics, ecology, and cell biology."
	modal_desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	modal_desc_label.add_theme_font_size_override("font_size", 13)
	modal_desc_label.add_theme_color_override("font_color", Color("#94A3B8"))
	vbox.add_child(modal_desc_label)
	
	# Separator line
	var sep := HSeparator.new()
	sep.add_theme_constant_override("separation", 8)
	vbox.add_child(sep)
	
	# Section Title: Choose Exam Year
	var year_title_box := HBoxContainer.new()
	vbox.add_child(year_title_box)
	
	var year_title := Label.new()
	year_title.text = "CHOOSE EXAM YEAR"
	year_title.add_theme_font_size_override("font_size", 13)
	year_title.add_theme_color_override("font_color", Color("#38BDF8"))
	year_title_box.add_child(year_title)
	
	var yr_spacer := Control.new()
	yr_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	year_title_box.add_child(yr_spacer)
	
	modal_status_subtitle = Label.new()
	modal_status_subtitle.text = "SELECT ANY YEAR TO START"
	modal_status_subtitle.add_theme_font_size_override("font_size", 11)
	modal_status_subtitle.add_theme_color_override("font_color", Color("#64748B"))
	year_title_box.add_child(modal_status_subtitle)
	
	# Scrollable Year Grid
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(0, 190)
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(scroll)
	
	year_grid_container = GridContainer.new()
	year_grid_container.columns = 5
	year_grid_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	year_grid_container.add_theme_constant_override("h_separation", 10)
	year_grid_container.add_theme_constant_override("v_separation", 10)
	scroll.add_child(year_grid_container)
	
	# Bottom Action Bar
	var bot_bar := HBoxContainer.new()
	bot_bar.add_theme_constant_override("separation", 16)
	vbox.add_child(bot_bar)
	
	var back_btn := Button.new()
	back_btn.text = "← OTHER SUBJECTS"
	back_btn.custom_minimum_size = Vector2(160, 44)
	back_btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	back_btn.pressed.connect(_close_year_modal)
	_style_glass_button(back_btn, Color(0.06, 0.12, 0.22, 0.85))
	bot_bar.add_child(back_btn)
	
	var bot_spacer := Control.new()
	bot_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bot_bar.add_child(bot_spacer)
	
	modal_continue_btn = Button.new()
	modal_continue_btn.text = "START EXAM  →"
	modal_continue_btn.custom_minimum_size = Vector2(210, 44)
	modal_continue_btn.disabled = true
	modal_continue_btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	modal_continue_btn.pressed.connect(_on_continue_to_exam)
	_style_primary_button(modal_continue_btn, COLOR_SWALLERN_BLUE)
	bot_bar.add_child(modal_continue_btn)

func _open_year_modal_for_subject(bubble: Dictionary) -> void:
	modal_open = true
	selected_year_value = ""
	selected_year_id_value = ""
	modal_continue_btn.disabled = true
	modal_continue_btn.text = "CHOOSE A YEAR  →"
	
	var cat: String = bubble.get("category", "science")
	var dist_cfg: Dictionary = DISTRICTS.get(cat, DISTRICTS["science"])
	
	modal_district_badge.text = dist_cfg.name.to_upper()
	modal_district_badge.add_theme_color_override("font_color", bubble.accent)
	modal_subject_title.text = bubble.name.to_upper()
	modal_desc_label.text = bubble.description
	
	# Populate Years Grid
	_populate_years_grid(bubble)
	
	year_modal.visible = true
	year_panel.scale = Vector2(0.95, 0.95)
	year_panel.modulate.a = 0.0
	
	var tw := create_tween().set_parallel(true)
	tw.tween_property(year_panel, "scale", Vector2.ONE, 0.2).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(year_panel, "modulate:a", 1.0, 0.18)

func _populate_years_grid(bubble: Dictionary) -> void:
	for c in year_grid_container.get_children():
		c.queue_free()
	year_buttons.clear()
	
	var exam_code := JourneyData.selected_exam if not JourneyData.selected_exam.is_empty() else "JAMB"
	var sub_name: String = bubble.name
	var sub_rec := JourneyData.subject_record(exam_code, sub_name)
	var sub_id := str(sub_rec.get("id", bubble.get("id", "")))
	var sub_ids: Array[String] = [sub_id] if not sub_id.is_empty() else []
	
	var years_list: Array[String] = []
	var has_live_catalog: bool = JourneyData.has_real_catalog()
	
	# Prefer real verified years from live database whenever available
	if has_live_catalog:
		var live_years := JourneyData.years_for(exam_code, [sub_name])
		if not live_years.is_empty():
			years_list = live_years.duplicate()
	
	# If live catalog had no specific year set or when offline, provide UI display fallback so panel is never empty
	var is_using_fallback_display := false
	if years_list.is_empty():
		is_using_fallback_display = true
		var max_year: int = FallbackExamCatalog.current_fallback_year_last() if FallbackExamCatalog.has_method("current_fallback_year_last") else maxi(2026, int(Time.get_date_dict_from_system().get("year", 2026)))
		var min_year: int = FallbackExamCatalog.FALLBACK_YEAR_FIRST if "FALLBACK_YEAR_FIRST" in FallbackExamCatalog else 2000
		for y in range(max_year, min_year - 1, -1):
			years_list.append(str(y))
	else:
		# Sort newest years first (e.g. 2026, 2025, 2024...)
		years_list.sort_custom(func(a: String, b: String) -> bool: return a.to_int() > b.to_int())
	
	# Status description
	if modal_status_subtitle:
		if has_live_catalog and not is_using_fallback_display:
			modal_status_subtitle.text = "%d VERIFIED EXAM YEARS AVAILABLE" % years_list.size()
			modal_status_subtitle.add_theme_color_override("font_color", Color("#34D399"))
		elif has_live_catalog and is_using_fallback_display:
			modal_status_subtitle.text = "SELECT YEAR · LIVE AVAILABILITY CHECKED ON START"
			modal_status_subtitle.add_theme_color_override("font_color", Color("#FBBF24"))
		else:
			modal_status_subtitle.text = "%d EXAM YEARS · AVAILABILITY VERIFIED ON START" % years_list.size()
			modal_status_subtitle.add_theme_color_override("font_color", Color("#94A3B8"))
	
	for y_str in years_list:
		var btn := Button.new()
		btn.text = y_str
		btn.custom_minimum_size = Vector2(96, 40)
		btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		btn.focus_mode = Control.FOCUS_ALL
		_style_year_button(btn, false)
		btn.pressed.connect(_on_year_button_pressed.bind(y_str, btn))
		year_grid_container.add_child(btn)
		year_buttons[y_str] = btn

func _on_year_button_pressed(year_str: String, btn: Button) -> void:
	selected_year_value = year_str
	var exam_code := JourneyData.selected_exam if not JourneyData.selected_exam.is_empty() else "JAMB"
	var y_rec := JourneyData.year_record(exam_code, year_str)
	selected_year_id_value = str(y_rec.get("id", ""))
	
	_play_sound("res://assets/audio/ui/navigation_tick.wav", 1.15)
	
	# Highlight active button
	for y_key in year_buttons:
		_style_year_button(year_buttons[y_key], y_key == year_str)
	
	# If live catalog is active, proactively check if question set exists for this year
	var sub_name: String = selected_bubble.name
	var sub_rec := JourneyData.subject_record(exam_code, sub_name)
	var sub_id := str(sub_rec.get("id", selected_bubble.get("id", "")))
	var sub_ids: Array[String] = [sub_id] if not sub_id.is_empty() else []
	
	if JourneyData.has_real_catalog():
		var q_sets := JourneyData.question_sets_for(exam_code, year_str, sub_ids)
		if q_sets.is_empty():
			if modal_status_subtitle:
				modal_status_subtitle.text = "NO QUESTION SET FOR %s %s · SELECT ANOTHER YEAR" % [selected_bubble.name.to_upper(), year_str]
				modal_status_subtitle.add_theme_color_override("font_color", Color("#F87171"))
			modal_continue_btn.disabled = true
			modal_continue_btn.text = "UNAVAILABLE (%s)" % year_str
			return
		else:
			var q_count := int(q_sets[0].get("questionCount", 0))
			if modal_status_subtitle:
				modal_status_subtitle.text = "VERIFIED · %d QUESTIONS AVAILABLE" % q_count
				modal_status_subtitle.add_theme_color_override("font_color", Color("#34D399"))
			modal_continue_btn.disabled = false
			modal_continue_btn.text = "START %s %s  →" % [selected_bubble.name.to_upper(), year_str]
			return
	
	modal_continue_btn.disabled = false
	modal_continue_btn.text = "START %s %s  →" % [selected_bubble.name.to_upper(), year_str]

func _close_year_modal() -> void:
	modal_open = false
	year_modal.visible = false

func _on_continue_to_exam() -> void:
	if selected_year_value.is_empty() or selected_bubble.is_empty(): return
	
	var exam_code := JourneyData.selected_exam if not JourneyData.selected_exam.is_empty() else "JAMB"
	var sub_name: String = selected_bubble.name
	var sub_rec := JourneyData.subject_record(exam_code, sub_name)
	var sub_id := str(sub_rec.get("id", selected_bubble.get("id", "")))
	var sub_ids: Array[String] = [sub_id] if not sub_id.is_empty() else []
	
	# 1. If catalog is presentation-only fallback, attempt online verification first
	if JourneyData.is_presentation_fallback():
		modal_continue_btn.disabled = true
		modal_continue_btn.text = "VERIFYING AVAILABILITY…"
		if modal_status_subtitle:
			modal_status_subtitle.text = "CONNECTING TO VERIFY %s %s…" % [sub_name.to_upper(), selected_year_value]
			modal_status_subtitle.add_theme_color_override("font_color", Color("#38BDF8"))
		
		var loaded := await JourneyData.load_availability()
		# Re-query subject and year records if live catalog loaded
		sub_rec = JourneyData.subject_record(exam_code, sub_name)
		sub_id = str(sub_rec.get("id", selected_bubble.get("id", "")))
		sub_ids = [sub_id] if not sub_id.is_empty() else []
		
		if not loaded or not JourneyData.has_real_catalog():
			# Cannot enter exam without verified question set
			if modal_status_subtitle:
				modal_status_subtitle.text = "CANNOT START: QUESTION SET NOT VERIFIED ONLINE. SERVICE OFFLINE."
				modal_status_subtitle.add_theme_color_override("font_color", Color("#F87171"))
			modal_continue_btn.disabled = true
			modal_continue_btn.text = "EXAM UNAVAILABLE"
			_play_sound("res://assets/audio/ui/navigation_tick.wav", 0.7)
			return
	
	# 2. Verify that an actual question set exists for this subject and year
	var q_sets := JourneyData.question_sets_for(exam_code, selected_year_value, sub_ids)
	if q_sets.is_empty():
		# Never allow user to enter an empty/nonexistent exam
		if modal_status_subtitle:
			modal_status_subtitle.text = "NO QUESTION SET FOR %s %s. PLEASE CHOOSE ANOTHER YEAR." % [sub_name.to_upper(), selected_year_value]
			modal_status_subtitle.add_theme_color_override("font_color", Color("#F87171"))
		modal_continue_btn.disabled = true
		modal_continue_btn.text = "CHOOSE ANOTHER YEAR"
		_play_sound("res://assets/audio/ui/navigation_tick.wav", 0.7)
		return
	
	# 3. Save validated selection state to JourneyData
	var y_rec := JourneyData.year_record(exam_code, selected_year_value)
	selected_year_id_value = str(y_rec.get("id", ""))
	
	JourneyData.selected_subjects = [sub_name]
	JourneyData.selected_subject_ids = sub_ids
	JourneyData.selected_year = selected_year_value
	JourneyData.selected_year_id = selected_year_id_value
	JourneyData.selected_question_sets = q_sets
	JourneyData.selected_question_set_ids.clear()
	for qs in q_sets:
		JourneyData.selected_question_set_ids.append(str(qs.get("id", "")))
	
	_play_sound("res://assets/audio/ui/portal_open.wav", 1.0)
	
	# Transition to Hub / exam practice
	if SceneTransition:
		SceneTransition.transition_to(HUB_SCENE)
	else:
		get_tree().change_scene_to_file(HUB_SCENE)

# -----------------------------------------------------------------------------
# 7. PLAYER INPUT & LOCOMOTION
# -----------------------------------------------------------------------------
func _update_player_locomotion(delta: float) -> void:
	if not is_instance_valid(player): return
	
	var move_in := virtual_move
	if not modal_open:
		if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT): move_in.x -= 1.0
		if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT): move_in.x += 1.0
		if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP): move_in.y -= 1.0
		if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN): move_in.y += 1.0
	
	var is_sprinting := Input.is_key_pressed(KEY_SHIFT)
	
	if move_in.length_squared() > 0.0:
		var dir3 := Vector3(move_in.x, 0.0, move_in.y).normalized()
		if player.has_method("set_move_intent"):
			player.set_move_intent(dir3, is_sprinting)
		walk_target = player.global_position
	else:
		if player.has_method("set_move_intent") and not player.has_method("is_navigating"):
			player.set_move_intent(Vector3.ZERO, false)
	
	# Constrain player strictly inside rounded home plaza and 3 district paths
	player.position = _clamp_to_walkable_area(player.position)

func _clamp_to_walkable_area(pos: Vector3) -> Vector3:
	# 1. Spawn platform circle (Centered at SPAWN_ORIGIN, radius 3.5m)
	var d_spawn := Vector2(pos.x - SPAWN_ORIGIN.x, pos.z - SPAWN_ORIGIN.z).length()
	if d_spawn <= 3.5:
		return pos
	
	# 2. Shared main boulevard corridor (X in [-2.2, 2.2], Z in [-6.5, 3.8])
	if absf(pos.x) <= 2.2 and pos.z >= -6.5 and pos.z <= 3.8:
		return pos
	
	# 3. Fork junction plaza circle (Centered at FORK_ORIGIN, radius 4.1m)
	var d_fork := Vector2(pos.x - FORK_ORIGIN.x, pos.z - FORK_ORIGIN.z).length()
	if d_fork <= 4.1:
		return pos
	
	# 4. Check each of the 3 district paths extending from FORK_ORIGIN
	var best_pt := SPAWN_ORIGIN
	var best_dist_sq := 1e9
	
	# Candidate: closest point on spawn circle
	var spawn_dir := Vector2(pos.x - SPAWN_ORIGIN.x, pos.z - SPAWN_ORIGIN.z).normalized()
	var spawn_clamped := SPAWN_ORIGIN + Vector3(spawn_dir.x * 3.5, 0, spawn_dir.y * 3.5)
	var d_sq_spawn := pos.distance_squared_to(spawn_clamped)
	if d_sq_spawn < best_dist_sq:
		best_dist_sq = d_sq_spawn
		best_pt = spawn_clamped
	
	# Candidate: closest point on boulevard
	var bvd_clamped := Vector3(clampf(pos.x, -2.2, 2.2), pos.y, clampf(pos.z, -6.5, 3.8))
	var d_sq_bvd := pos.distance_squared_to(bvd_clamped)
	if d_sq_bvd < best_dist_sq:
		best_dist_sq = d_sq_bvd
		best_pt = bvd_clamped
	
	# Candidate: closest point on fork plaza
	var fork_dir := Vector2(pos.x - FORK_ORIGIN.x, pos.z - FORK_ORIGIN.z).normalized()
	var fork_clamped := FORK_ORIGIN + Vector3(fork_dir.x * 4.1, 0, fork_dir.y * 4.1)
	var d_sq_fork := pos.distance_squared_to(fork_clamped)
	if d_sq_fork < best_dist_sq:
		best_dist_sq = d_sq_fork
		best_pt = fork_clamped
	
	for key in DISTRICTS:
		var d: Dictionary = DISTRICTS[key]
		var angle_rad: float = deg_to_rad(d.angle_deg)
		var dir_vec := Vector3(sin(angle_rad), 0.0, -cos(angle_rad))
		var perp_vec := Vector3(-dir_vec.z, 0.0, dir_vec.x)
		
		var rel := pos - FORK_ORIGIN
		var t := rel.dot(dir_vec)
		var s := rel.dot(perp_vec)
		
		# If inside this district corridor
		if t >= 3.6 and t <= 28.5 and absf(s) <= 2.15:
			return pos
		
		# Compute closest point along this corridor
		var clamped_t := clampf(t, 3.6, 28.5)
		var clamped_s := clampf(s, -2.15, 2.15)
		var path_pt := FORK_ORIGIN + dir_vec * clamped_t + perp_vec * clamped_s + Vector3(0, pos.y, 0)
		var d_sq := pos.distance_squared_to(path_pt)
		
		if d_sq < best_dist_sq:
			best_dist_sq = d_sq
			best_pt = path_pt
	
	return Vector3(best_pt.x, pos.y, best_pt.z)

# -----------------------------------------------------------------------------
# 8. HUD & USER INTERFACE
# -----------------------------------------------------------------------------
func _build_hud() -> void:
	ui_layer = CanvasLayer.new()
	ui_layer.name = "Scene2HUDLayer"
	add_child(ui_layer)
	
	var hud_root := Control.new()
	hud_root.name = "HUD"
	hud_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui_layer.add_child(hud_root)
	
	# Top Navigation & Status Bar
	var top_bar := HBoxContainer.new()
	top_bar.set_anchors_preset(Control.PRESET_TOP_WIDE)
	top_bar.offset_left = 28
	top_bar.offset_top = 20
	top_bar.offset_right = -28
	top_bar.offset_bottom = 64
	top_bar.add_theme_constant_override("separation", 16)
	hud_root.add_child(top_bar)
	
	# Logo / Title
	var logo_label := Label.new()
	logo_label.text = "SWALLERN"
	logo_label.add_theme_font_size_override("font_size", 20)
	logo_label.add_theme_color_override("font_color", Color("#F8FAFC"))
	top_bar.add_child(logo_label)
	
	# Exam World Badge
	var exam_code := JourneyData.selected_exam if not JourneyData.selected_exam.is_empty() else "JAMB"
	exam_badge_label = Label.new()
	exam_badge_label.text = "[ %s EXAM WORLD ]" % exam_code
	exam_badge_label.add_theme_font_size_override("font_size", 14)
	exam_badge_label.add_theme_color_override("font_color", COLOR_SWALLERN_BLUE)
	top_bar.add_child(exam_badge_label)
	
	var top_spacer := Control.new()
	top_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top_bar.add_child(top_spacer)
	
	# Catalog Status notice
	status_notice_label = Label.new()
	status_notice_label.text = JourneyData.catalog_notice()
	status_notice_label.add_theme_font_size_override("font_size", 11)
	status_notice_label.add_theme_color_override("font_color", Color("#94A3B8"))
	top_bar.add_child(status_notice_label)
	
	# Home Button
	var home_btn := Button.new()
	home_btn.text = "⌂  EXAM HUB"
	home_btn.custom_minimum_size = Vector2(120, 38)
	home_btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	home_btn.focus_mode = Control.FOCUS_ALL
	home_btn.pressed.connect(_return_to_hub)
	_style_glass_button(home_btn, Color("#1E3A5F"))
	top_bar.add_child(home_btn)
	
	# Bottom Hint Bar
	hint_bar_label = Label.new()
	hint_bar_label.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	hint_bar_label.offset_left = 140
	hint_bar_label.offset_top = -52
	hint_bar_label.offset_right = -160
	hint_bar_label.offset_bottom = -24
	hint_bar_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint_bar_label.text = "W A S D / ARROWS MOVE  ·  CLICK SUBJECT BUBBLES TO EXPLORE"
	hint_bar_label.add_theme_font_size_override("font_size", 12)
	hint_bar_label.add_theme_color_override("font_color", Color("#CBD5E1"))
	hud_root.add_child(hint_bar_label)
	
	# Swallern Compass HUD (bottom-left)
	compass_hud = SWALLERN_COMPASS_SCRIPT.new()
	compass_hud.name = "SwallernCompass"
	compass_hud.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	compass_hud.offset_left = 28
	compass_hud.offset_top = -108
	compass_hud.offset_right = 108
	compass_hud.offset_bottom = -28
	compass_hud.player_node = player
	hud_root.add_child(compass_hud)
	
	# Movement Pad / Touch Controls (bottom-right)
	_build_touch_dpad(hud_root)

func _build_touch_dpad(parent: Control) -> void:
	dpad_root = Control.new()
	dpad_root.name = "MovementPad"
	dpad_root.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	dpad_root.offset_left = -148
	dpad_root.offset_top = -118
	dpad_root.offset_right = -24
	dpad_root.offset_bottom = -24
	parent.add_child(dpad_root)
	
	var dirs := [
		{"name": "Up", "text": "▲", "pos": Vector2(42, 0), "vec": Vector2(0, -1)},
		{"name": "Down", "text": "▼", "pos": Vector2(42, 54), "vec": Vector2(0, 1)},
		{"name": "Left", "text": "◀", "pos": Vector2(0, 27), "vec": Vector2(-1, 0)},
		{"name": "Right", "text": "▶", "pos": Vector2(84, 27), "vec": Vector2(1, 0)},
	]
	for d in dirs:
		var btn := Button.new()
		btn.text = d.text
		btn.position = d.pos
		btn.custom_minimum_size = Vector2(38, 38)
		btn.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		btn.focus_mode = Control.FOCUS_NONE
		_style_glass_button(btn, Color(0.04, 0.08, 0.16, 0.85))
		
		var v: Vector2 = d.vec
		btn.button_down.connect(func(): virtual_move += v)
		btn.button_up.connect(func(): virtual_move -= v)
		dpad_root.add_child(btn)

func _return_to_hub() -> void:
	if SceneTransition:
		SceneTransition.transition_to(HUB_SCENE)
	else:
		get_tree().change_scene_to_file(HUB_SCENE)

func _on_catalog_updated() -> void:
	if status_notice_label:
		status_notice_label.text = JourneyData.catalog_notice()
	_populate_world_subjects()

# -----------------------------------------------------------------------------
# 9. AUDIO & SOUND FX
# -----------------------------------------------------------------------------
func _setup_audio() -> void:
	ambient_player = AudioStreamPlayer.new()
	ambient_player.name = "AmbientStream"
	ambient_player.bus = "Master"
	var ambient_snd: AudioStream = load("res://assets/audio/ambience/exam_world_pad.wav")
	if ambient_snd:
		ambient_player.stream = ambient_snd
		ambient_player.volume_db = -12.0
		add_child(ambient_player)
		ambient_player.play()
	
	sfx_player = AudioStreamPlayer.new()
	sfx_player.name = "SFXStream"
	sfx_player.bus = "Master"
	add_child(sfx_player)

func _play_sound(path: String, pitch := 1.0) -> void:
	if not is_instance_valid(sfx_player): return
	var stream: AudioStream = load(path)
	if stream:
		sfx_player.stream = stream
		sfx_player.pitch_scale = pitch
		sfx_player.volume_db = -6.0
		sfx_player.play()

# -----------------------------------------------------------------------------
# 10. MATERIAL & UI STYLING HELPERS
# -----------------------------------------------------------------------------
func _create_mesh_instance(mesh: Mesh, pos: Vector3, scale: Vector3, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.position = pos
	mi.scale = scale
	mi.material_override = mat
	return mi

func _pbr_material(color_val: Color, rough := 0.3, metal := 0.1) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color_val
	mat.roughness = rough
	mat.metallic = metal
	return mat

func _emissive_material(color_val: Color, energy := 1.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color_val
	mat.emission_enabled = true
	mat.emission = color_val
	mat.emission_energy_multiplier = energy
	mat.roughness = 0.2
	return mat

func _style_glass_button(btn: Button, bg_col: Color) -> void:
	var norm := StyleBoxFlat.new()
	norm.bg_color = bg_col
	norm.border_color = Color(0.25, 0.45, 0.75, 0.45)
	norm.set_border_width_all(1)
	norm.set_corner_radius_all(10)
	
	var hov := norm.duplicate() as StyleBoxFlat
	hov.bg_color = bg_col.lightened(0.18)
	hov.border_color = Color("#38BDF8")
	
	btn.add_theme_stylebox_override("normal", norm)
	btn.add_theme_stylebox_override("hover", hov)
	btn.add_theme_stylebox_override("pressed", hov)
	btn.add_theme_color_override("font_color", Color("#F8FAFC"))
	btn.add_theme_font_size_override("font_size", 12)

func _style_primary_button(btn: Button, col: Color) -> void:
	var norm := StyleBoxFlat.new()
	norm.bg_color = col
	norm.set_corner_radius_all(12)
	norm.shadow_color = col * Color(1, 1, 1, 0.35)
	norm.shadow_size = 10
	
	var hov := norm.duplicate() as StyleBoxFlat
	hov.bg_color = col.lightened(0.15)
	
	btn.add_theme_stylebox_override("normal", norm)
	btn.add_theme_stylebox_override("hover", hov)
	btn.add_theme_stylebox_override("pressed", hov)
	btn.add_theme_color_override("font_color", Color("#FFFFFF"))
	btn.add_theme_font_size_override("font_size", 13)

func _style_year_button(btn: Button, is_selected: bool) -> void:
	var style := StyleBoxFlat.new()
	if is_selected:
		style.bg_color = Color(0.12, 0.45, 0.85, 0.95)
		style.border_color = Color("#38BDF8")
		style.set_border_width_all(2)
		style.shadow_color = Color(0.1, 0.6, 1.0, 0.35)
		style.shadow_size = 8
		btn.add_theme_color_override("font_color", Color("#FFFFFF"))
	else:
		style.bg_color = Color(0.04, 0.09, 0.18, 0.82)
		style.border_color = Color(0.2, 0.35, 0.55, 0.4)
		style.set_border_width_all(1)
		btn.add_theme_color_override("font_color", Color("#CBD5E1"))
	style.set_corner_radius_all(10)
	btn.add_theme_stylebox_override("normal", style)
	btn.add_theme_font_size_override("font_size", 13)
