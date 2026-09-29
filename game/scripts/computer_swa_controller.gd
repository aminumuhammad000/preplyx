class_name ComputerSwaController
extends SwaCharacter

@export var move_speed := 3.2
@export var arrival_distance := 0.12
var destination := Vector3.ZERO
var has_destination := false

func navigate_to(world_position: Vector3) -> void:
	destination = world_position
	has_destination = true

func stop_navigation() -> void:
	has_destination = false
	idle()

func _physics_process(delta: float) -> void:
	if not has_destination: return
	var offset := destination - global_position
	offset.y = 0.0
	if offset.length() <= arrival_distance:
		has_destination = false
		idle()
		return
	var direction := offset.normalized()
	var yaw := atan2(direction.x, direction.z)
	rotation.y = lerp_angle(rotation.y, yaw, delta * 3.5)
	position += direction * move_speed * delta
	walk()
