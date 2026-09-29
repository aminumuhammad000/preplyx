extends Node3D
"""Smooth, bounded third-person camera shared by compact game scenes."""

@export var follow_target: Node3D
@export var follow_height := 1.25
@export var look_ahead := -2.4
@export var follow_distance := 13.2
@export_range(35.0, 75.0) var field_of_view := 50.0
@export var position_smoothing := 5.5
@export var rotation_smoothing := 7.0
@export var orbit_sensitivity := 0.003
@export var minimum_pitch := 0.06
@export var maximum_pitch := 0.58
@export var minimum_distance := 10.5
@export var maximum_distance := 16.0
@export var scene_minimum := Vector3(-10.0, 2.0, 2.8)
@export var scene_maximum := Vector3(10.0, 11.0, 22.0)

var camera: Camera3D
var focus_target: Node3D
var yaw := 0.0
var pitch := 0.23
var _focus_weight := 0.0
var _distance_offset := 0.0
var _orbiting := false

func _ready() -> void:
	camera = Camera3D.new()
	camera.name = "Camera3D"
	camera.fov = field_of_view
	camera.current = true
	camera.near = 0.08
	camera.far = 90.0
	add_child(camera)
	if follow_target:
		var initial_aim := _base_aim()
		camera.global_position = _desired_position(initial_aim, follow_distance)
		camera.look_at(initial_aim, Vector3.UP)

func _process(delta: float) -> void:
	if not is_instance_valid(follow_target) or camera == null:
		return
	var smoothing := 1.0 - exp(-position_smoothing * delta)
	var rotation_weight := 1.0 - exp(-rotation_smoothing * delta)
	_focus_weight = move_toward(_focus_weight, 1.0 if is_instance_valid(focus_target) else 0.0, delta * 1.7)
	var aim := _base_aim()
	if is_instance_valid(focus_target):
		var focus_point := focus_target.global_position + Vector3.UP * 1.75
		aim = aim.lerp(focus_point, 0.26 * _focus_weight)
	var wanted_distance := clampf(follow_distance + _distance_offset - 1.0 * _focus_weight, minimum_distance, maximum_distance)
	var wanted_position := _desired_position(aim, wanted_distance)
	wanted_position = _avoid_geometry(aim, wanted_position)
	wanted_position.x = clampf(wanted_position.x, scene_minimum.x, scene_maximum.x)
	wanted_position.y = clampf(wanted_position.y, scene_minimum.y, scene_maximum.y)
	wanted_position.z = clampf(wanted_position.z, scene_minimum.z, scene_maximum.z)
	camera.global_position = camera.global_position.lerp(wanted_position, smoothing)
	var wanted_basis := Basis.looking_at((aim - camera.global_position).normalized(), Vector3.UP)
	camera.global_basis = camera.global_basis.slerp(wanted_basis, rotation_weight).orthonormalized()
	camera.fov = lerpf(camera.fov, field_of_view - 1.8 * _focus_weight, smoothing)

func handle_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_RIGHT:
		_orbiting = event.pressed
	elif event is InputEventMouseMotion and _orbiting:
		yaw = wrapf(yaw - event.relative.x * orbit_sensitivity, -PI, PI)
		pitch = clampf(pitch - event.relative.y * orbit_sensitivity, minimum_pitch, maximum_pitch)

func set_focus_target(target: Node3D) -> void:
	focus_target = target

func movement_direction(input: Vector2) -> Vector3:
	if camera == null or input.length_squared() < 0.001:
		return Vector3.ZERO
	var forward := -camera.global_basis.z
	var right := camera.global_basis.x
	forward.y = 0.0
	right.y = 0.0
	return (right.normalized() * input.x + forward.normalized() * -input.y).normalized()

func _base_aim() -> Vector3:
	return follow_target.global_position + Vector3(0.0, follow_height, look_ahead)

func _desired_position(aim: Vector3, distance: float) -> Vector3:
	var horizontal := cos(pitch) * distance
	return aim + Vector3(sin(yaw) * horizontal, sin(pitch) * distance, cos(yaw) * horizontal)

func _avoid_geometry(aim: Vector3, wanted: Vector3) -> Vector3:
	if not is_inside_tree():
		return wanted
	var query := PhysicsRayQueryParameters3D.create(aim, wanted)
	query.collide_with_areas = false
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return wanted
	return hit.position + hit.normal * 0.35
