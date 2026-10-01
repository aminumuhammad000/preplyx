extends CanvasLayer
"""
Cinematic soft-fade transition layer for Swallern.
Provides controlled, stable transitions between scenes without exposure spikes.
"""

var _cover: ColorRect
var _busy := false

func _ready() -> void:
	layer = 120
	_cover = ColorRect.new()
	_cover.name = "SceneFade"
	_cover.color = Color(0.024, 0.047, 0.094, 0.0) # Swallern deep midnight blue
	_cover.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_cover.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_cover)

func transition_to(scene_path: String, clear_journey := false) -> void:
	if _busy:
		return
	_busy = true
	_cover.mouse_filter = Control.MOUSE_FILTER_STOP
	
	# Smooth controlled fade to Swallern deep blue
	var fade_out := create_tween().set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	fade_out.tween_property(_cover, "color:a", 1.0, 0.32)
	await fade_out.finished
	
	if clear_journey and get_tree().root.has_node("JourneyData"):
		get_tree().root.get_node("JourneyData").select_exam("")
	
	var result := get_tree().change_scene_to_file(scene_path)
	if result != OK:
		push_error("Could not change scene to %s (error %d)." % [scene_path, result])
	
	# Brief buffer for new scene's lighting/models to settle
	await get_tree().process_frame
	await get_tree().process_frame
	
	# Soft reveal of the new scene
	var fade_in := create_tween().set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	fade_in.tween_property(_cover, "color:a", 0.0, 0.38)
	await fade_in.finished
	
	_cover.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_busy = false
