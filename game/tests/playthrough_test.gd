extends Node
## Plays Nights 1 and 2 from start to finish with no one at the keyboard. It walks every step of each
## clue trail on the real walk masks, offers each keepsake to the wrong people first, and checks that
## each night ends with its lantern out and the game saved at the next night.
## Run: Godot --headless --path game res://tests/playthrough_test.tscn   (exit code 0 means it passed)

const NOTES_1 := [
	"The watch is engraved on the back: A.T.",
	"The station plaque reads KEEPER A. TATE.",
	"The station timetable: the evening train was due at 18:17.",
	"The traveller's case is marked A.T., but the watch isn't his.",
	"The clock mender: the watch isn't broken. Stopping it at 18:17 was a promise.",
	"The clock mender: Helen has waited on the bench every evening before 18:17, for twenty years.",
]
const NOTES_2 := [
	"The rabbit doll has an N stitched on its foot.",
	"The baker: Mia lives in the green-shuttered cottage by the vegetable garden, with her little one.",
	"The washing line by Nora's shop holds tiny children's clothes, hemmed with blue thread.",
	"Nora made the rabbit a long time ago, for someone who never came to collect it.",
	"Nora's bench has a spool of the same blue thread as the rabbit's ear.",
	"The village kid: the little one by the green cottage has a rabbit made out of a sock.",
	"Mia: her mother made the rabbit for the baby, and Mia never let her give it.",
]

var main: Main
var _picks: PackedStringArray = [] # options to choose next, in order; otherwise the first one
var _auto := true
var _failed := false


func _ready() -> void:
	Engine.time_scale = 8.0
	var had_save := FileAccess.file_exists(Game.SAVE_PATH)
	var save := FileAccess.get_file_as_string(Game.SAVE_PATH) if had_save else ""
	get_tree().create_timer(240.0, true, false, true).timeout.connect(_fail.bind("timed out"))
	main = load("res://main.tscn").instantiate()
	add_child(main)
	await _play()
	if _failed:
		return
	if had_save:
		FileAccess.open(Game.SAVE_PATH, FileAccess.WRITE).store_string(save)
	else:
		DirAccess.remove_absolute(ProjectSettings.globalize_path(Game.SAVE_PATH))
	print("PASS: Nights 1 and 2 play from start to finish")
	main.queue_free()
	Sound.stop_all()
	await get_tree().create_timer(0.3, true, false, true).timeout
	get_tree().quit(0)


func _play() -> void:
	await _until(_exploring)
	_expect(_in("village"), "the night starts in Bellwood")
	await _use("shop_door")
	_expect("watch" in Game.bag, "Marlow hands over the watch")
	await _look_at("watch", 2)
	_expect(Game.has(&"seen_watch_back"), "turning the watch over shows its back")
	await _use("door")
	await _use("station_road")
	_expect(_in("station"), "the road leads to the old station")
	await _use("plaque")
	await _use("timetable")
	_picks = ["Show the watch"]
	await _use("traveller")
	_picks = ["Show the watch"]
	await _use("mender")
	_picks = ["Ask about the woman on the bench"]
	await _use("mender")
	for n: String in NOTES_1:
		_expect(n in Game.notes, "noted: " + n)
	_picks = ["Show her the watch"]
	await _use("helen")
	# Night 1 ends and Night 2 begins in Bellwood.
	_expect(Game.night == 2 and Game.saved_night() == 2, "the game is saved at Night 2")
	_expect(Game.lanterns_out == 1, "the first lantern is out")
	_expect(_in("village"), "Night 2 starts in Bellwood")
	await _use("shop_door")
	_expect("doll" in Game.bag, "Marlow hands over the rabbit")
	await _look_at("doll", 1)
	await _use("door")
	_picks = ["Show the rabbit"]
	await _use("baker")
	await _use("washing_line")
	await _use("toyshop_door")
	_expect(_in("toyshop"), "the scissors-sign door leads into Nora's toy shop")
	_picks = ["Show her the rabbit"]
	await _use("nora")
	await _use("spool")
	await _use("rabbits")
	await _use("door")
	_picks = ["Show the rabbit"]
	await _use("kid")
	_picks = ["Show her the rabbit"]
	await _use("mia")
	for n: String in NOTES_2:
		_expect(n in Game.notes, "noted: " + n)
	_picks = ["Give Pip the rabbit"]
	_walk_and_use("grandkid")
	await _until(func() -> bool: return main.night == null and Game.night == 3)
	_auto = false
	_expect(Game.saved_night() == 3, "the game is saved at Night 3")
	_expect(Game.lanterns_out == 2, "the second lantern is out")
	_expect("doll" not in Game.bag, "Pip keeps the rabbit")


func _process(_delta: float) -> void:
	if not _auto or not main:
		return
	var talk := main.talk
	if talk._list.visible:
		var options: Array = talk._choices.map(func(l: Label) -> String: return l.text)
		var i := 0
		if not _picks.is_empty():
			i = options.find(_picks[0])
			_expect(i >= 0, "option \"%s\" is offered (got %s)" % [_picks[0], options])
			_picks.remove_at(0)
		talk._picked.emit(i)
	elif talk._root.visible:
		talk._next.emit()
	elif main.cards.visible:
		main.cards._next.emit()


## Opens the bag and turns a keepsake over `turns` times.
func _look_at(keepsake: String, turns: int) -> void:
	await _until(_exploring)
	main._open_bag()
	main.bag._look_at(keepsake)
	for i in turns:
		main.bag._turn(1)
	main.bag._closed.emit()


## Walks to a hotspot and uses it, then waits until the courier can move again.
func _use(hotspot_name: String) -> void:
	await _until(_exploring)
	print("  use ", hotspot_name)
	var before := main.place
	_walk_and_use(hotspot_name)
	await _until(func() -> bool: return main.place != before or not main.place.controls)
	await _until(_exploring)


func _walk_and_use(hotspot_name: String) -> void:
	var found := main.place.find_children(hotspot_name, "Hotspot", true, false)
	_expect(not found.is_empty(), "%s has a hotspot \"%s\"" % [main.place.name, hotspot_name])
	var h: Hotspot = found[0]
	var path := main.place.walk_map.path(main.place.player.position, h.global_spot())
	_expect(not path.is_empty() and path[-1].distance_to(h.global_spot()) < 3, "the courier can reach \"%s\" in %s" % [hotspot_name, main.place.name])
	main.place._walk_to(h, h.global_spot())


func _in(place_name: String) -> bool:
	return main.place.scene_file_path == "res://places/%s.tscn" % place_name


func _exploring() -> bool:
	return main.place != null and main.place.player != null and main.place.controls


func _until(done: Callable) -> void:
	while not done.call():
		await get_tree().process_frame


func _expect(ok: bool, what: String) -> void:
	if not ok:
		_fail(what)


func _fail(what: String) -> void:
	if not _failed:
		_failed = true
		printerr("FAIL: ", what)
		if main and main.place:
			printerr("  in %s, courier at %s, controls %s, talk box %s, list %s, night %s" % [main.place.scene_file_path, main.courier.position, main.place.controls, main.talk._root.visible, main.talk._list.visible, main.night])
		get_tree().quit(1)
