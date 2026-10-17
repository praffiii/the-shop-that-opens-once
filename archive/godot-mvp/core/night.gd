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


## Learns someone's name: the talk box and their hotspot use it from now on.
func known(char_id: String, display_name: String) -> void:
	names[char_id] = display_name
	relabel()


## Gives the people in the current place the names learned so far (Main calls it on arrival).
func relabel() -> void:
	for char_id in names:
		var who := actor(char_id)
		if who and who.has_node(char_id):
			(who.get_node(char_id) as Hotspot).label = names[char_id]


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


## Glides the camera to show a point (such as an anchor), or back to the courier with null.
func look(at: Variant) -> void:
	await main.look(at)


func go(place_name: String, spawn: String) -> void:
	await main.go(place_name, spawn)


## Marlow takes tonight's keepsake from its shelf and hands it to the courier.
func hand_over(keepsake: String) -> void:
	var marlow := actor("marlow")
	var courier := actor("courier")
	var art := Bag.item_art(keepsake, "xs", Keepsakes.ALL[keepsake].sides[0][0])
	main.place.world.show_item("keepsake_%d" % (Game.night - 1), false)
	Game.mark(&"keepsake_taken")
	marlow.held = art
	marlow.pose = "give"
	await wait(0.7)
	marlow.held = null
	marlow.pose = "idle"
	courier.held = art
	courier.pose = "receive"
	await wait(0.7)
	courier.held = null
	courier.pose = "idle"
	Game.bag.append(keepsake)
	sfx("motif")


## The courier gives a keepsake to its owner, who takes it and keeps holding it.
func give_keepsake(char_id: String, keepsake: String) -> void:
	var owner := actor(char_id)
	var courier := actor("courier")
	var art := Bag.item_art(keepsake, "xs", Keepsakes.ALL[keepsake].sides[0][0])
	owner.face_to(courier.position.x)
	courier.face_to(owner.position.x)
	courier.held = art
	courier.pose = "give"
	await wait(0.7)
	courier.held = null
	courier.pose = "idle"
	owner.held = art
	owner.pose = "receive"
	Game.bag.erase(keepsake)
	sfx("right")


## The keepsake is home: in Marlow's shop the clock moves on a minute and the night's lantern goes out.
func lantern_goes_out() -> void:
	await go("shop", "counter")
	music("resolved")
	await look(anchor("clock"))
	var world := main.place.world
	var out := Game.lanterns_out
	await wait(0.8)
	world.show_item("clock_%d" % (1817 + out), false)
	world.show_item("clock_%d" % (1818 + out), true)
	sfx("tick")
	await wait(0.6)
	world.show_item("lantern_%d" % out, false)
	sfx("chime")
	Game.lanterns_out = out + 1
	await wait(0.8)


func wait(seconds: float) -> void:
	await main.get_tree().create_timer(seconds).timeout


func card(lines: PackedStringArray) -> void:
	await main.card(lines)
