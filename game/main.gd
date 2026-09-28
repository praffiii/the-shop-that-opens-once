class_name Main
extends Node2D
## Runs the game: the title, the current night's story, moving between places, and the screen UI.
## While any story step runs, the courier can't move; he gets the controls back when all are done.

const NIGHTS := {1: preload("res://nights/night_1.gd")}
const TITLE_VIEW := Vector2(360, 220) ## Where the title screen looks: the shop at the top of the lane.
const BASE := Vector2(480, 270) ## The least art the screen shows; the UI is laid out for it.

var place: Place
var night: Night
var courier := Ant.new()
var _held := 0

@onready var camera: Camera2D = $Camera
@onready var talk: Talk = $UI/Screen/Talk
@onready var hud: Hud = $UI/Screen/Hud
@onready var bag: Bag = $UI/Screen/Bag
@onready var cards: Card = $UI/Screen/Card
@onready var logo: TextureRect = $UI/Screen/Logo
@onready var curtain: ColorRect = $Curtain/Rect


func _ready() -> void:
	get_tree().root.size_changed.connect(_fit_window)
	_fit_window()
	$UI/Screen.theme = Look.theme()
	courier.name = "courier"
	talk.courier = courier
	Game.noted.connect(_on_noted)
	courier.stepped.connect(func() -> void: Sound.step(place.wood_floor))
	hud.bag_pressed.connect(_open_bag)
	title()


func _notification(what: int) -> void:
	# The courier is kept between places. On the title screen no place holds him, so free him here.
	if what == NOTIFICATION_PREDELETE and courier.get_parent() == null:
		courier.free()


func title() -> void:
	night = null
	_held = 0
	talk.close()
	if place:
		await _fade(true)
	_swap("village", "")
	await _fade(false)
	logo.texture = load("res://art/ui/title.png")
	var view := get_viewport_rect().size
	logo.position = Vector2(roundf((view.x - logo.texture.get_width()) / 2), 36)
	logo.show()
	var options: PackedStringArray = ["Begin"]
	if Game.saved_night() > 1 and NIGHTS.has(Game.saved_night()):
		options.append("Continue")
	if not OS.has_feature("web"):
		options.append("Quit")
	var pick := options[(await talk.choose(options, Vector2(view.x / 2, view.y - 74)))]
	logo.hide()
	match pick:
		"Begin": _begin(1)
		"Continue": _begin(Game.saved_night())
		"Quit":
			Sound.stop_all()
			await get_tree().create_timer(0.3).timeout
			get_tree().quit()


## Ends the night's story and returns to the title once the current step is over.
func finish() -> void:
	night = null
	title.call_deferred()


func go(place_name: String, spawn: String) -> void:
	talk.close()
	var bell := place != null and place.door_bell
	await _fade(true)
	_swap(place_name, spawn)
	if bell or place.door_bell:
		Sound.play("bell")
	await _fade(false)
	if night:
		await night.entered(place_name)


func card(lines: PackedStringArray) -> void:
	talk.close()
	await cards.show_lines(lines)


func _begin(n: int) -> void:
	Game.start_night(n)
	night = NIGHTS[n].new(self)
	_hold()
	await night.start()
	_release()


func _swap(place_name: String, spawn: String) -> void:
	if courier.get_parent():
		courier.get_parent().remove_child(courier)
	if place:
		remove_child(place)
		place.queue_free()
	place = load("res://places/%s.tscn" % place_name).instantiate()
	add_child(place)
	place.used.connect(_on_used)
	if spawn != "":
		courier.id = "courier"
		courier.pose = "idle"
		courier.held = null
		place.enter(courier, spawn)
	hud.place = place
	Sound.mood(place.mood, place.indoors)
	RenderingServer.set_default_clear_color(place.world.bg)
	_frame_camera()


func _on_used(h: Hotspot) -> void:
	_hold()
	if h.exit_to != "":
		var to := h.exit_to.split("/")
		await go(to[0], to[1])
	elif night:
		var npc := h.get_parent() as Ant
		if npc and npc.pose == "idle":
			npc.face_to(courier.position.x)
		await night.interact(h.name)
	_release()


func _open_bag() -> void:
	if place and place.controls:
		_hold()
		await bag.open()
		_release()


func _pause() -> void:
	_hold()
	var options: PackedStringArray = ["Keep playing", "Sound on" if Sound.muted else "Sound off", "Back to the title"]
	match (await talk.choose(options, get_viewport_rect().size / 2 - Vector2(0, 32))):
		1: Sound.muted = not Sound.muted
		2: finish()
	_release()


func _on_noted(_text: String) -> void:
	hud.toast("Added to your notes.")
	Sound.play("page")


func _unhandled_input(event: InputEvent) -> void:
	if not (place and place.controls):
		return
	if event.is_action_pressed("bag"):
		get_viewport().set_input_as_handled()
		_open_bag()
	elif event.is_action_pressed("cancel"):
		get_viewport().set_input_as_handled()
		_pause()


func _hold() -> void:
	_held += 1
	if place:
		place.controls = false


func _release() -> void:
	_held = maxi(_held - 1, 0)
	if _held == 0:
		talk.close()
		if night and place and place.player:
			place.controls = true


func _process(_delta: float) -> void:
	if place:
		_frame_camera()


## Scales the art by the largest whole number that still shows BASE, and lets the view grow to
## fill the rest of the window, so pixels stay square and crisp with no bars around the game.
func _fit_window() -> void:
	var window := Vector2(get_tree().root.size)
	var factor := maxf(1.0, floorf(minf(window.x / BASE.x, window.y / BASE.y)))
	get_tree().root.content_scale_size = Vector2i((window / factor).floor())


## Follows the courier (or looks at the title view), kept inside the place. A place smaller than
## the screen is centred.
func _frame_camera() -> void:
	var view := get_viewport_rect().size
	var size := Vector2(place.world.size)
	var target := courier.position if place.player else TITLE_VIEW
	var c := target.round()
	for axis in 2:
		if size[axis] <= view[axis]:
			c[axis] = roundf(size[axis] / 2)
		else:
			c[axis] = clampf(c[axis], roundf(view[axis] / 2), size[axis] - roundf(view[axis] / 2))
	camera.position = c


## Covers the screen in warm cream (or uncovers it) in four soft steps.
func _fade(cover: bool) -> void:
	curtain.show()
	var tween := create_tween()
	tween.tween_method(func(v: float) -> void: curtain.color.a = roundf(v * 4) / 4, 0.0 if cover else 1.0, 1.0 if cover else 0.0, 0.4)
	await tween.finished
	curtain.visible = cover
