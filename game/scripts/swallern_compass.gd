extends Control
class_name SwallernCompass
"""
Circular frosted-glass navigation instrument for Swallern.
Smoothly displays player orientation and active portal targets.
"""

var heading: float = 0.0
var target_heading: float = 0.0
var player_node: Node3D = null
var target_node: Node3D = null

func _ready() -> void:
	custom_minimum_size = Vector2(80, 80)
	size = Vector2(80, 80)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _process(delta: float) -> void:
	if is_instance_valid(target_node) and is_instance_valid(player_node):
		var diff := target_node.global_position - player_node.global_position
		target_heading = atan2(diff.x, -diff.z)
	elif is_instance_valid(player_node):
		target_heading = -player_node.rotation.y
	else:
		target_heading = 0.0
	
	heading = lerp_angle(heading, target_heading, delta * 8.0)
	queue_redraw()

func _draw() -> void:
	var center := size * 0.5
	var radius := minf(center.x, center.y) - 4.0
	
	# 1. Subtle drop shadow
	draw_circle(center + Vector2(0, 3), radius + 1.0, Color(0.0, 0.015, 0.04, 0.45))
	
	# 2. Dark high-contrast frosted glass disc
	draw_circle(center, radius, Color(0.015, 0.035, 0.075, 0.88))
	
	# 3. Outer refined cyan/silver bezel
	draw_arc(center, radius, 0.0, TAU, 56, Color(0.28, 0.72, 1.0, 0.60), 1.5, true)
	
	# 4. Inner concentric track
	draw_arc(center, radius * 0.72, 0.0, TAU, 40, Color(0.35, 0.65, 0.95, 0.22), 1.0, true)
	
	# 5. Cardinal ticks and markers (N / E / S / W)
	var font := ThemeDB.fallback_font
	var font_size := 10
	var cardinals := [
		{"text": "N", "angle": -PI * 0.5, "color": Color("#38d6ff")},
		{"text": "E", "angle": 0.0, "color": Color("#c4daf5")},
		{"text": "S", "angle": PI * 0.5, "color": Color("#c4daf5")},
		{"text": "W", "angle": PI, "color": Color("#c4daf5")},
	]
	
	for card in cardinals:
		var a: float = card.angle
		var tick_start := center + Vector2(cos(a), sin(a)) * (radius - 2.5)
		var tick_end := center + Vector2(cos(a), sin(a)) * (radius - 7.0)
		draw_line(tick_start, tick_end, card.color * Color(1, 1, 1, 0.7), 1.2, true)
		
		var label_pos := center + Vector2(cos(a), sin(a)) * (radius - 14.0)
		var str_size := font.get_string_size(card.text, HORIZONTAL_ALIGNMENT_CENTER, -1, font_size)
		draw_string(font, label_pos + Vector2(-str_size.x * 0.5, str_size.y * 0.36), card.text, HORIZONTAL_ALIGNMENT_CENTER, -1, font_size, card.color)
	
	# 6. Central Swallern navigation needle
	var needle_len := radius * 0.54
	var needle_w := 4.2
	var dir := Vector2(sin(heading), -cos(heading))
	var ortho := Vector2(-dir.y, dir.x)
	
	var north_tip := center + dir * needle_len
	var south_tip := center - dir * (needle_len * 0.58)
	var left_pt := center - ortho * needle_w
	var right_pt := center + ortho * needle_w
	
	# North half (bright cyan / deep azure dual-tone)
	draw_colored_polygon(PackedVector2Array([center, north_tip, right_pt]), Color("#3cd4ff"))
	draw_colored_polygon(PackedVector2Array([center, north_tip, left_pt]), Color("#147ecd"))
	
	# South half (slate / dark slate)
	draw_colored_polygon(PackedVector2Array([center, south_tip, right_pt]), Color("#385372"))
	draw_colored_polygon(PackedVector2Array([center, south_tip, left_pt]), Color("#223548"))
	
	# Center metallic pivot bead
	draw_circle(center, 2.8, Color("#eff6ff"))
	draw_circle(center, 1.3, Color("#0c1b2c"))
