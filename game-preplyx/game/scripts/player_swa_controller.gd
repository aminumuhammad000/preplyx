class_name PlayerSwaController
extends SwaCharacter
"""
Intelligent companion locomotion controller for Swa.
Implements the Swallern companion movement cycle:
  Idle -> Notice -> Anticipation -> Walk/Run with secondary bob -> Deceleration -> Settling bounce -> React
"""

signal companion_arrived(destination_name: String)

@export var walk_speed := 3.8
@export var run_speed := 6.2
@export var acceleration := 26.0
@export var deceleration := 30.0
@export var turn_speed := 12.0
@export var bob_frequency := 8.5
@export var bob_amplitude := 0.045

enum CompanionState {
	IDLE,
	MOVING,
	DECELERATING,
	SETTLING
}

var current_state: CompanionState = CompanionState.IDLE
var move_direction := Vector3.ZERO
var current_velocity := Vector3.ZERO
var wants_to_run := false

var _settle_timer := 0.0
const SETTLE_DURATION := 0.14

# Secondary motion tracking
var _bob_phase := 0.0
var _base_y := 0.0
var _has_base_y := false
var _antenna_inertial_pitch := 0.0

# Destination awareness
var _active_destination := Vector3.ZERO
var _has_active_destination := false
var _destination_tag := ""
var _noticed_destination := false

func _ready() -> void:
	super._ready()
	_base_y = position.y
	_has_base_y = true

func set_move_intent(direction: Vector3, running := false) -> void:
	move_direction = direction.normalized() if direction.length_squared() > 1.0 else direction
	wants_to_run = running

func navigate_to(target_pos: Vector3, tag := "destination") -> void:
	_active_destination = target_pos
	_has_active_destination = true
	_destination_tag = tag
	_noticed_destination = false

func clear_destination() -> void:
	_has_active_destination = false
	_destination_tag = ""
	_noticed_destination = false

func _physics_process(delta: float) -> void:
	if not _has_base_y:
		_base_y = position.y
		_has_base_y = true

	var input_active := move_direction.length_squared() > 0.001
	
	match current_state:
		CompanionState.IDLE:
			current_velocity = current_velocity.move_toward(Vector3.ZERO, deceleration * delta)
			if input_active:
				# Immediate responsive start: tap gives an instant mini-step, hold sustains walk
				current_state = CompanionState.MOVING
				var target_speed := run_speed if wants_to_run else walk_speed
				current_velocity = move_direction * (target_speed * 0.4)
				set_expression("happy" if not wants_to_run else "excited", 0.4)
				var wanted_yaw := atan2(move_direction.x, move_direction.z)
				rotation.y = wanted_yaw
				_look_in_move_direction(move_direction, 0.8)
				if wants_to_run: run()
				else: walk()
			else:
				idle()

		CompanionState.MOVING:
			if not input_active:
				# Immediately transition to stopping when input stops
				current_state = CompanionState.DECELERATING
			else:
				var target_speed := run_speed if wants_to_run else walk_speed
				var target_vel := move_direction * target_speed
				current_velocity = current_velocity.move_toward(target_vel, acceleration * delta)
				
				# Head & eyes lead body rotation
				var wanted_yaw := atan2(move_direction.x, move_direction.z)
				rotation.y = lerp_angle(rotation.y, wanted_yaw, delta * turn_speed)
				_look_in_move_direction(move_direction, 0.75)
				
				# Play appropriate locomotion animation
				if wants_to_run: run()
				else: walk()
				
				# Secondary body bob and weight transfer
				_update_locomotion_bounce(delta)
				_check_destination_proximity()

		CompanionState.DECELERATING:
			current_velocity = current_velocity.move_toward(Vector3.ZERO, deceleration * delta)
			_update_locomotion_bounce(delta)
			
			if input_active:
				current_state = CompanionState.MOVING
			elif current_velocity.length_squared() < 0.02:
				current_state = CompanionState.SETTLING
				_settle_timer = SETTLE_DURATION
				position.y = _base_y
				_trigger_settle_reaction()

		CompanionState.SETTLING:
			_settle_timer -= delta
			current_velocity = Vector3.ZERO
			var settle_progress := 1.0 - (_settle_timer / SETTLE_DURATION)
			var settle_offset := sin(settle_progress * PI * 2.0) * (1.0 - settle_progress) * 0.015
			position.y = _base_y + settle_offset
			
			if _settle_timer <= 0.0:
				position.y = _base_y
				current_state = CompanionState.IDLE
				idle()
				if _has_active_destination:
					companion_arrived.emit(_destination_tag)
					clear_destination()

	# Apply horizontal velocity
	position.x += current_velocity.x * delta
	position.z += current_velocity.z * delta

func _update_locomotion_bounce(delta: float) -> void:
	var speed := current_velocity.length()
	if speed > 0.1:
		var speed_ratio := speed / walk_speed
		_bob_phase += delta * bob_frequency * speed_ratio
		var bob: float = absf(sin(_bob_phase)) * bob_amplitude * minf(speed_ratio, 1.2)
		position.y = _base_y + bob
		# Inertial antenna tilt lag
		_antenna_inertial_pitch = lerpf(_antenna_inertial_pitch, deg_to_rad(-8.0 * speed_ratio), delta * 6.0)
		_wanted_ant_rot.x = _antenna_inertial_pitch
	else:
		position.y = lerpf(position.y, _base_y, delta * 12.0)
		_wanted_ant_rot.x = lerpf(_wanted_ant_rot.x, 0.0, delta * 6.0)

func _look_in_move_direction(dir: Vector3, weight: float) -> void:
	var look_pos := global_position + dir * 4.0 + Vector3(0.0, 1.4, 0.0)
	look_at_target(look_pos, weight)

func _check_destination_proximity() -> void:
	if not _has_active_destination: return
	var dist := global_position.distance_to(_active_destination)
	if dist < 1.8 and not _noticed_destination:
		_noticed_destination = true
		# 1-2 meters away: Swa notices the ring/target!
		set_expression("excited", 1.2)
		look_at_target(_active_destination + Vector3(0.0, 0.2, 0.0), 0.95)
		_wanted_ant_rot.x = deg_to_rad(-16.0) # Perk antenna high

func _trigger_settle_reaction() -> void:
	if _noticed_destination or _has_active_destination:
		set_expression("happy", 1.5)
	else:
		set_expression("neutral", 0.5)

