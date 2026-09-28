class_name Place
extends Node2D
## A location to explore: its baked art (the World child), where feet can go, and its hotspots.
## Walks the courier by keys or clicks and reports when a hotspot is used.

signal used(hotspot: Hotspot)

const REACH := 20.0 ## How close the courier must be to use a hotspot with the interact key.

@export var mood := "dusk" ## The music here: dusk, shop, memory or resolved.
@export var indoors := false ## Indoors, the evening wind is quiet.
@export var wood_floor := false ## Footsteps sound on wood rather than ground.
@export var door_bell := false ## A bell rings when the courier comes in or goes out.

## Off while a talk, the bag or a transition has the screen.
var controls := false:
	set(value):
		controls = value
		if not value and player:
			player.stop()
var player: Ant
var walk_map: WalkMap
var hover: Hotspot ## Under the mouse, or null.
var near: Hotspot ## Close enough for the interact key, or null.

var _keys := false

@onready var world: BakedArt = $World


func _ready() -> void:
	walk_map = WalkMap.new(load(world.art_dir.get_base_dir().path_join("walk.png")))
	# The shop follows the story: a lantern goes out and the clock moves a minute per night,
	# and each night's keepsake stays on its shelf until Marlow hands it over.
	for i in 7:
		world.show_item_if_any("lantern_%d" % i, i >= Game.lanterns_out)
		world.show_item_if_any("shop_lantern_%d" % i, i >= Game.lanterns_out)
		world.show_item_if_any("keepsake_%d" % i, i >= Game.night or (i == Game.night - 1 and not Game.has(&"keepsake_taken")))
	for m in 8:
		world.show_item_if_any("clock_%d" % (1817 + m), m == Game.lanterns_out)


## Puts the courier at a spawn point: a Marker2D under Spawns, or else an exported anchor.
func enter(courier: Ant, spawn: String) -> void:
	player = courier
	world.add_child(courier)
	var marker := get_node_or_null("Spawns/" + spawn) as Marker2D
	courier.position = marker.position if marker else world.anchor(spawn)


func actor(char_id: String) -> Ant:
	return world.get_node_or_null(char_id) as Ant


func hotspots() -> Array[Hotspot]:
	var out: Array[Hotspot] = []
	for node in find_children("*", "Hotspot", true, false):
		if node.is_visible_in_tree() and node.label != "":
			out.append(node)
	return out


func _unhandled_input(event: InputEvent) -> void:
	if not controls or not player:
		return
	var click: bool = event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT
	if click or (event.is_action_pressed("interact") and near):
		get_viewport().set_input_as_handled()
		var h := hover if click else near
		_walk_to(h, h.global_spot() if h else get_global_mouse_position())


func _process(delta: float) -> void:
	if not player:
		return
	hover = _hotspot_at(get_global_mouse_position()) if controls else null
	near = _nearest() if controls else null
	if not controls:
		return
	var dir := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if dir != Vector2.ZERO:
		if not _keys:
			player.stop()
			_keys = true
		player.move_by(walk_map.slide(player.position, dir * Ant.SPEED * delta) - player.position)
	elif _keys:
		_keys = false
		player.stop()
	for h in hotspots():
		if h.exit_to != "" and h.global_area().has_point(player.position):
			_use(h)
			return


func _walk_to(h: Hotspot, point: Vector2) -> void:
	var points := walk_map.path(player.position, point)
	if points.is_empty():
		return
	var arrived: bool = await player.walk_to(points)
	if arrived and h and controls:
		_use(h)


func _use(h: Hotspot) -> void:
	controls = false
	player.face_to(h.global_area().get_center().x)
	used.emit(h)


func _hotspot_at(p: Vector2) -> Hotspot:
	var best: Hotspot = null
	for h in hotspots():
		if h.global_area().has_point(p) and (not best or h.global_position.y > best.global_position.y):
			best = h
	return best


func _nearest() -> Hotspot:
	var best: Hotspot = null
	var best_d := REACH
	for h in hotspots():
		var d := h.global_spot().distance_to(player.position)
		if h.global_area().grow(4).has_point(player.position):
			d = 0.0
		if d <= best_d:
			best = h
			best_d = d
	return best
