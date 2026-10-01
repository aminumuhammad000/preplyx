extends Node
"""Presentation-only fallback catalog. It contains no database IDs or playable sets."""

const FALLBACK_YEAR_FIRST := 2000
const FALLBACK_YEAR_LAST := 2026

func current_fallback_year_last() -> int:
	var system_year := int(Time.get_date_dict_from_system().get("year", 2026))
	return maxi(FALLBACK_YEAR_LAST, system_year)

const SUBJECT_CATALOG := [
	{"code":"MATH", "name":"Mathematics", "description":"Number, algebra, geometry and quantitative reasoning.", "icon":"mathematics", "accent":"#36adff"},
	{"code":"ENG", "name":"English Language", "description":"Grammar, vocabulary, comprehension and communication.", "icon":"english", "accent":"#a887ff"},
	{"code":"BIO", "name":"Biology", "description":"Living things, cells, ecology and human biology.", "icon":"biology", "accent":"#36d6a4"},
	{"code":"CHEM", "name":"Chemistry", "description":"Matter, atoms, reactions and chemical properties.", "icon":"chemistry", "accent":"#ffad64"},
	{"code":"PHY", "name":"Physics", "description":"Motion, forces, energy, light and electricity.", "icon":"physics", "accent":"#48c5e8"},
	{"code":"ECON", "name":"Economics", "description":"Choices, markets, production and economic systems.", "icon":"economics", "accent":"#f2c95d"},
	{"code":"GOVT", "name":"Government", "description":"Constitutions, institutions, citizenship and public authority.", "icon":"government", "accent":"#64c7a2"},
	{"code":"LIT", "name":"Literature in English", "description":"Literary forms, language, narrative and dramatic technique.", "icon":"literature", "accent":"#d28be8"}
]
const EXAM_CATALOG := [
	{"code":"NECO", "name":"NECO", "description":"Explore your NECO examination journey.", "accent":"#36d6a4", "display_order":1},
	{"code":"WAEC", "name":"WAEC", "description":"Explore your WAEC examination journey.", "accent":"#a887ff", "display_order":2},
	{"code":"JAMB", "name":"JAMB", "description":"Explore your JAMB examination journey.", "accent":"#36adff", "display_order":3}
]

func presentation_catalog() -> Dictionary:
	var years: Array[String] = []
	var year_details: Array[Dictionary] = []
	var last_year := current_fallback_year_last()
	for year in range(FALLBACK_YEAR_FIRST, last_year + 1):
		years.append(str(year))
		# Deliberately blank: fallback years are not database records.
		year_details.append({"id":"", "year":str(year)})
	var exams: Array[Dictionary] = []
	for exam in EXAM_CATALOG:
		var exam_subjects: Array[Dictionary] = []
		for subject in SUBJECT_CATALOG:
			if exam.code == "JAMB" and subject.code == "LIT":
				continue
			exam_subjects.append({"id":"", "code":subject.code, "name":subject.name, "description":subject.description,
				"visualMetadata":{"icon":subject.icon, "accent":subject.accent}})
		var names: Array[String] = []
		for subject in exam_subjects:
			names.append(subject.name)
		exams.append({
			"id":"", "code":exam.code, "name":exam.name, "description":exam.description,
			"displayOrder":exam.display_order, "visualMetadata":{"accent":exam.accent},
			"subjects":names, "subjectDetails":exam_subjects,
			"years":years.duplicate(), "yearDetails":year_details.duplicate(true),
			"subjectYears":{}, "questionSets":[], "totalCount":0, "hasQuestions":false,
			"presentationOnly":true
		})
	return {"exams":exams}
