class_name Night
extends RefCounted
## One night's story, written as plain code. A night script overrides start(), entered() and
## interact(), and uses the helpers below. Every helper that shows something must be awaited.

var main: Main
## Speaker names for the talk box. The courier's lines show only his portrait.
var names: Dictionary[String, String] = {}


func _init(game_main: Main) -> void:
	main = game_main


## Runs once when the night begins.
func start() -> void:
	pass


## Runs every time the courier arrives in a place, before he can move.
func entered(_place: String) -> void:
	pass


## Runs when the courier uses a hotspot or talks to someone; `id` is the hotspot's node name.
func interact(_id: String) -> void:
	pass


func say(who: String, text: String, mood := "neutral") -> void:
	await main.talk.say(names.get(who, ""), who, text, mood, actor(who))


## Words with no speaker: what the courier sees or reads.
func show_text(text: String) -> void:
	await main.talk.say("", "", text)


func choose(options: PackedStringArray) -> int:
	return await main.talk.choose(options)


func note(text: String) -> void:
	Game.note(text)


func sfx(sound_name: String) -> void:
	Sound.play(sound_name)


## Changes the music: dusk, shop, memory or resolved.
func music(mood: String) -> void:
	Sound.mood(mood, main.place.indoors)


func hint(text: String) -> void:
	main.hud.toast(text)


func actor(char_id: String) -> Ant:
	return main.place.actor(char_id) if main.place else null


func anchor(anchor_name: String) -> Vector2:
	return main.place.world.anchor(anchor_name)


## Walks someone to a point along the place's walkable ground.
func walk(char_id: String, to: Vector2) -> void:
	var who := actor(char_id)
	await who.walk_to(main.place.walk_map.path(who.position, to))


func go(place_name: String, spawn: String) -> void:
	await main.go(place_name, spawn)


func wait(seconds: float) -> void:
	await main.get_tree().create_timer(seconds).timeout


func card(lines: PackedStringArray) -> void:
	await main.card(lines)
