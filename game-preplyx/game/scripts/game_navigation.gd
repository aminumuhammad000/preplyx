extends Node
"""Shared home navigation widget for all playable stages."""

const HOME_SCENE := "res://scenes/exam_hub.tscn"

func add_home_button(parent: Control) -> Button:
	var button := Button.new()
	button.name = "HomeNavigationButton"
	button.text = "⌂  HOME"
	button.tooltip_text = "Return to the exam hub"
	button.focus_mode = Control.FOCUS_ALL
	button.custom_minimum_size = Vector2(116, 42)
	button.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	button.offset_left = -140
	button.offset_top = 24
	button.offset_right = -24
	button.offset_bottom = 66
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(0.035, 0.065, 0.11, 0.88)
	normal.border_color = Color("#35577d")
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(13)
	var hover := normal.duplicate() as StyleBoxFlat
	hover.bg_color = Color("#173355")
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", hover)
	button.add_theme_color_override("font_color", Color("#e8f3ff"))
	button.add_theme_font_size_override("font_size", 12)
	button.pressed.connect(go_home)
	parent.add_child(button)
	return button

func go_home() -> void:
	if get_tree().root.has_node("SceneTransition"):
		get_tree().root.get_node("SceneTransition").transition_to(HOME_SCENE, true)
	else:
		get_tree().root.get_node("JourneyData").select_exam("")
		get_tree().change_scene_to_file(HOME_SCENE)
