extends Node
## The story so far (autoload "Game"): the night, what the courier carries and has noticed, and saving.

signal noted(text: String)

const SAVE_PATH := "user://save.json"

var night := 1
var lanterns_out := 0                       ## Lanterns already out in Marlow's shop.
var flags: Dictionary[StringName, bool] = {} ## Set by the night scripts as the story moves on.
var bag: Array[String] = []                 ## Keepsakes the courier carries.
var notes: PackedStringArray = []           ## What the courier has noticed, oldest first.


func start_night(n: int) -> void:
	night = n
	lanterns_out = n - 1
	flags.clear()
	bag.clear()
	notes.clear()


func has(flag: StringName) -> bool:
	return flags.has(flag)


func mark(flag: StringName) -> void:
	flags[flag] = true


func note(text: String) -> void:
	if text in notes:
		return
	notes.append(text)
	noted.emit(text)


func save() -> void:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	file.store_string(JSON.stringify({"night": night}))


## The night a saved game continues from, or 0 when there is no save.
func saved_night() -> int:
	if not FileAccess.file_exists(SAVE_PATH):
		return 0
	var data: Variant = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	return int(data.get("night", 0)) if data is Dictionary else 0
