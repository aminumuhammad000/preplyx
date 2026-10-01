extends Node
"""Live exam availability and journey selection shared across the exam scenes."""

const REAL_CATALOG_CACHE_PATH := "user://exam_availability_cache.json"

signal availability_changed

var availability: Dictionary = {}
var catalog_source := "fallback" # api, cache, or fallback; fallback is presentation-only.
var api_state := "idle" # idle, loading, available, offline.
var selected_exam := ""
var selected_exam_id := ""
var selected_subjects: Array[String] = []
var selected_subject_ids: Array[String] = []
var selected_year := ""
var selected_year_id := ""
var selected_question_set_ids: Array[String] = []
var selected_question_sets: Array[Dictionary] = []
var question_set_cache: Dictionary = {}
var last_error := ""
var loading := false

func _init() -> void:
	availability = _normalize_availability(FallbackExamCatalog.presentation_catalog())
	catalog_source = "fallback"
	_load_cached_catalog()

func api_base_url() -> String:
	var configured := str(ProjectSettings.get_setting("swallern/content_api_base_url", "")).strip_edges()
	if configured.is_empty():
		configured = OS.get_environment("SWALLERN_API_BASE_URL").strip_edges()
	return configured.trim_suffix("/")

func load_availability() -> bool:
	if loading:
		while loading:
			await get_tree().process_frame
		return api_state == "available"
	loading = true
	api_state = "loading"
	last_error = ""
	availability_changed.emit()
	var base := api_base_url()
	if base.is_empty():
		_finish_availability_failure("Exam API base URL is not configured.")
		return false
	var request := HTTPRequest.new()
	request.timeout = 12.0
	add_child(request)
	var result := request.request(base + "/exams/availability", ["Accept: application/json"])
	if result != OK:
		request.queue_free()
		_finish_availability_failure("Availability request could not be started (error %d)." % result)
		return false
	var response: Array = await request.request_completed
	request.queue_free()
	if response.size() < 4 or int(response[1]) < 200 or int(response[1]) >= 300:
		_finish_availability_failure("Availability request returned HTTP %d." % (int(response[1]) if response.size() > 1 else 0))
		return false
	var parsed: Variant = JSON.parse_string((response[3] as PackedByteArray).get_string_from_utf8())
	if not parsed is Dictionary:
		_finish_availability_failure("Availability response was not a JSON object.")
		return false
	var fresh_catalog := _normalize_availability(parsed)
	if fresh_catalog.is_empty() or not _catalog_has_database_ids(fresh_catalog):
		_finish_availability_failure("Availability response contained no real exam records.")
		return false
	availability = fresh_catalog
	catalog_source = "api"
	api_state = "available"
	if not selected_exam.is_empty():
		selected_exam_id = str(exam_data(selected_exam).get("id", ""))
	loading = false
	last_error = ""
	_store_cached_catalog(parsed)
	availability_changed.emit()
	return true

func _finish_availability_failure(diagnostic: String) -> void:
	loading = false
	api_state = "offline"
	if catalog_source == "api":
		catalog_source = "cache"
	last_error = diagnostic
	availability_changed.emit()

func _load_cached_catalog() -> void:
	if not FileAccess.file_exists(REAL_CATALOG_CACHE_PATH):
		return
	var file := FileAccess.open(REAL_CATALOG_CACHE_PATH, FileAccess.READ)
	if file == null:
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	file.close()
	if not parsed is Dictionary:
		return
	var cached := _normalize_availability(parsed)
	if cached.is_empty() or not _catalog_has_database_ids(cached):
		return
	availability = cached
	catalog_source = "cache"
	if not selected_exam.is_empty():
		selected_exam_id = str(exam_data(selected_exam).get("id", ""))

func _store_cached_catalog(payload: Dictionary) -> void:
	var file := FileAccess.open(REAL_CATALOG_CACHE_PATH, FileAccess.WRITE)
	if file == null:
		return
	file.store_string(JSON.stringify(payload))
	file.close()

func _catalog_has_database_ids(catalog: Dictionary) -> bool:
	for exam in catalog.values():
		if str(exam.get("id", "")).is_empty() or bool(exam.get("presentationOnly", false)):
			return false
	return not catalog.is_empty()

func has_real_catalog() -> bool:
	return catalog_source == "api" or catalog_source == "cache"

func is_presentation_fallback() -> bool:
	return catalog_source == "fallback"

func catalog_notice() -> String:
	if api_state == "loading": return "UPDATING EXAM DATA…"
	if catalog_source == "fallback": return "OFFLINE CATALOG · AVAILABILITY CHECKED BEFORE START"
	if catalog_source == "cache" and api_state == "offline": return "SAVED CATALOG · AVAILABILITY CHECKED BEFORE START"
	if catalog_source == "cache": return "SAVED CATALOG"
	return ""

func exam_ids() -> Array[String]:
	var ids: Array[String] = []
	for key in availability: ids.append(str(key))
	ids.sort_custom(func(a: String, b: String) -> bool:
		var order_a := int(exam_data(a).get("displayOrder", 0))
		var order_b := int(exam_data(b).get("displayOrder", 0))
		return order_a < order_b if order_a != order_b else a < b)
	return ids

func exam_data(exam_id: String) -> Dictionary:
	return availability.get(exam_id, {})

func select_exam(exam_code: String) -> void:
	selected_exam = exam_code.to_upper()
	selected_exam_id = "" if bool(exam_data(selected_exam).get("presentationOnly", false)) else str(exam_data(selected_exam).get("id", ""))
	selected_subjects.clear()
	selected_subject_ids.clear()
	selected_year = ""
	selected_year_id = ""
	selected_question_set_ids.clear()
	selected_question_sets.clear()

func subject_record(exam_id: String, subject_name: String) -> Dictionary:
	for item in exam_data(exam_id).get("subjectDetails", []):
		if str(item.get("name", "")).to_lower() == subject_name.to_lower(): return item
	return {}

func year_record(exam_id: String, year_value: String) -> Dictionary:
	for item in exam_data(exam_id).get("yearDetails", []):
		if str(item.get("year", "")) == year_value: return item
	return {}

func question_sets_for(exam_id: String, year_value: String, subject_ids: Array[String]) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for record in exam_data(exam_id).get("questionSets", []):
		if str(record.get("year", "")) != year_value: continue
		if not subject_ids.has(str(record.get("subjectId", ""))): continue
		if int(record.get("questionCount", 0)) <= 0: continue
		result.append(record)
	return result

func load_question_set(question_set_id: String, force_refresh := false) -> Dictionary:
	if question_set_id.is_empty(): return {"error": "Question set is not verified by the exam service."}
	if not has_real_catalog(): return {"error": "Question availability has not been verified by the exam service."}
	if force_refresh: question_set_cache.erase(question_set_id)
	if question_set_cache.has(question_set_id): return question_set_cache[question_set_id]
	var base := api_base_url()
	if base.is_empty(): return {"error": "Exam API URL is not configured."}
	var request := HTTPRequest.new()
	request.timeout = 15.0
	add_child(request)
	var request_result := request.request(base + "/exams/question-sets/" + question_set_id, ["Accept: application/json"])
	if request_result != OK:
		request.queue_free()
		return {"error": "Could not request the question set."}
	var response: Array = await request.request_completed
	request.queue_free()
	if response.size() < 4 or int(response[1]) < 200 or int(response[1]) >= 300:
		return {"error": "Question set request failed (HTTP %d)." % (int(response[1]) if response.size() > 1 else 0)}
	var parsed: Variant = JSON.parse_string((response[3] as PackedByteArray).get_string_from_utf8())
	if not parsed is Dictionary: return {"error": "Unexpected question set response."}
	question_set_cache[question_set_id] = parsed
	return parsed

func validate_question_sets(question_set_ids: Array[String]) -> Dictionary:
	if question_set_ids.is_empty() or not has_real_catalog():
		return {"valid":false, "error":"Question availability must be confirmed online before starting."}
	var validated: Array[Dictionary] = []
	for question_set_id in question_set_ids:
		var payload: Dictionary = await load_question_set(question_set_id, true)
		if payload.has("error"):
			var diagnostic := str(payload.get("error", ""))
			if diagnostic.contains("HTTP 404") or diagnostic.contains("HTTP 400"):
				return {"valid":false, "error":"Question set unavailable for this combination. Choose another year or subject."}
			return {"valid":false, "error":"We couldn't confirm question availability. Retry when exam data is available."}
		if int(payload.get("questionCount", 0)) < 1:
			return {"valid":false, "error":"Question set unavailable for this combination. Choose another year or subject."}
		validated.append(payload)
	return {"valid":true, "questionSets":validated}

func subject_names(exam_id: String) -> Array[String]:
	var result: Array[String] = []
	var values: Variant = exam_data(exam_id).get("subjects", [])
	if values is Array:
		for value in values:
			var name := str(value).strip_edges()
			if not name.is_empty(): result.append(name)
	result.sort()
	return result

func years_for(exam_id: String, subjects: Array[String] = []) -> Array[String]:
	var data := exam_data(exam_id)
	var years: Array[String] = []
	if subjects.is_empty():
		for year in data.get("years", []): years.append(str(year))
	else:
		var map: Dictionary = data.get("subjectYears", {})
		var intersection: Dictionary = {}
		for index in subjects.size():
			var subject := subjects[index]
			var found: Array = []
			for key in map:
				if str(key).to_lower() == subject.to_lower(): found = map[key]; break
			var set: Dictionary = {}
			for year in found: set[str(year)] = true
			if index == 0: intersection = set
			else:
				for value in intersection.keys():
					if not set.has(value): intersection.erase(value)
		for value in intersection: years.append(str(value))
	for idx in range(years.size() - 1, -1, -1):
		if not years[idx].is_valid_int(): years.remove_at(idx)
	years.sort()
	return years

func subjects_with_questions(exam_id: String, year: String, subjects: Array[String]) -> Array[String]:
	var map: Dictionary = exam_data(exam_id).get("subjectYears", {})
	var available: Array[String] = []
	for subject in subjects:
		for key in map:
			if str(key).to_lower() == subject.to_lower() and map[key] is Array and map[key].has(year):
				available.append(subject)
				break
	return available

func _normalize_availability(source: Dictionary) -> Dictionary:
	var output: Dictionary = {}
	var raw: Variant = source.get("exams", source)
	if raw is Array:
		for item in raw:
			if item is Dictionary:
				var code := str(item.get("code", item.get("name", ""))).strip_edges().to_upper()
				if not code.is_empty(): output[code] = _normalize_exam(item)
	elif raw is Dictionary:
		for raw_key in raw:
			var value: Variant = raw[raw_key]
			if value is Dictionary:
				var id := str(value.get("id", raw_key)).strip_edges().to_upper()
				if not id.is_empty() and bool(value.get("hasQuestions", true)):
					output[id] = _normalize_exam(value)
	return output

func _normalize_exam(value: Dictionary) -> Dictionary:
	var subjects: Array = value.get("subjects", []) if value.get("subjects", []) is Array else []
	var years: Array = value.get("years", []) if value.get("years", []) is Array else []
	var subject_details: Array = value.get("subjectDetails", []) if value.get("subjectDetails", []) is Array else []
	var year_details: Array = value.get("yearDetails", []) if value.get("yearDetails", []) is Array else []
	var question_sets: Array = value.get("questionSets", []) if value.get("questionSets", []) is Array else []
	var subject_years: Variant = value.get("subjectYears", value.get("subject_years", {}))
	if not subject_years is Dictionary: subject_years = {}
	return {"id": str(value.get("id", "")), "code": str(value.get("code", "")), "name": str(value.get("name", "")),
		"displayOrder": int(value.get("displayOrder", 0)),
		"subjects": subjects.duplicate(), "years": years.duplicate(),
		"subjectDetails": subject_details.duplicate(true),
		"yearDetails": year_details.duplicate(true),
		"questionSets": question_sets.duplicate(true),
		"subjectYears": subject_years.duplicate(true), "totalCount": int(value.get("totalCount", value.get("question_count", 0))),
		"hasQuestions": bool(value.get("hasQuestions", false)), "visualMetadata": value.get("visualMetadata", {}),
		"presentationOnly": bool(value.get("presentationOnly", false))}
