class_name Main
extends Node2D
## Runs the game: the title, the current night's story, moving between places, and the screen UI.
## While any story step runs, the courier can't move; he gets the controls back when all are done.

const NIGHTS := {1: preload("res://nights/night_1.gd"), 2: preload("res://nights/night_2.gd")}
const TITLE_VIEW := Vector2(360, 220) ## Where the title screen looks: the shop at the top of the lane.
const ZOOM := 2 ## Each world pixel covers this many screen-canvas pixels; the UI keeps the finer ones.
const BASE := Vector2(640, 360) ## The least canvas the screen shows (the world is BASE / ZOOM).
const GLIDE := 220.0 ## How fast the camera glides to what it is asked to look at, in world px per second.

var place: Place
var night: Night
var courier := Ant.new()
var _held := 0
var _look: Variant = null # a world point the camera shows instead of the courier
var _gliding := false
var _cam := Vector2.ZERO

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
	camera.zoom = Vector2.ONE * ZOOM
	$UI/Screen.theme = Look.theme()
	courier.name = "courier"
	talk.courier = courier
	hud.talk = talk
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
	logo.scale = Vector2.ONE * ZOOM # the title is world art: draw it at the world's pixel size
	logo.position = Vector2(roundf((view.x - logo.texture.get_width() * ZOOM) / 2), 24)
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


## Saves the next night and starts it, or thanks the player if it isn't built yet.
func end_night() -> void:
	Game.night += 1
	Game.save()
	night = null
	if NIGHTS.has(Game.night):
		_begin.call_deferred(Game.night)
	else:
		await card(["Thank you for playing.", "Night %d is still being made." % Game.night])
		finish()


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
		night.relabel()
		await night.entered(place_name)


## Glides the camera to show a world point, or back to the courier with null. Returns once it is there.
func look(at: Variant) -> void:
	_look = at
	talk.courier = null if at != null else courier
	_gliding = true
	while _gliding and place:
		await get_tree().process_frame


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
	_look = null
	_gliding = false
	_frame_camera(0.0)


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


func _process(delta: float) -> void:
	if place:
		_frame_camera(delta)


## Scales the art by the largest whole number that still shows BASE, and lets the view grow to
## fill the rest of the window, so pixels stay square and crisp with no bars around the game.
func _fit_window() -> void:
	var window := Vector2(get_tree().root.size)
	var factor := maxf(1.0, floorf(minf(window.x / BASE.x, window.y / BASE.y)))
	get_tree().root.content_scale_size = Vector2i((window / factor).floor())


## Follows the courier (or looks where it was asked, or at the title view), kept inside the place.
## A place smaller than the screen is centred. The camera stays on whole world pixels.
func _frame_camera(delta: float) -> void:
	var view := get_viewport_rect().size / ZOOM
	var size := Vector2(place.world.size)
	var target: Vector2 = _look if _look != null else (courier.position if place.player else TITLE_VIEW)
	var c := target.round()
	for axis in 2:
		if size[axis] <= view[axis]:
			c[axis] = roundf(size[axis] / 2)
		else:
			c[axis] = clampf(c[axis], roundf(view[axis] / 2), size[axis] - roundf(view[axis] / 2))
	if _gliding:
		_cam = _cam.move_toward(c, GLIDE * delta)
		_gliding = _cam != c
	else:
		_cam = c
	camera.position = _cam.round()


## Covers the screen in warm cream (or uncovers it) in four soft steps.
func _fade(cover: bool) -> void:
	curtain.show()
	var tween := create_tween()
	tween.tween_method(func(v: float) -> void: curtain.color.a = roundf(v * 4) / 4, 0.0 if cover else 1.0, 1.0 if cover else 0.0, 0.4)
	await tween.finished
	curtain.visible = cover
