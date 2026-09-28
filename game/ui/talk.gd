class_name Talk
extends Control
## The talk box: a portrait, the speaker's name, words typed out, and choices.
## Await say() and choose(). Click, Space or Enter shows the whole line, then moves on.

signal _next
signal _picked(index: int)

const SPEED := 50.0 ## Characters typed per second.
const SIZE := Vector2(464, 62)
const MARGIN := 6.0 ## Gap between the box and the bottom of the screen.

## Set by Main: the box moves to the top of the screen rather than hide him.
var courier: Ant

var _root := Control.new() # the box and everything on it, placed at the box's top-left
var _box := Look.panel("panel", Rect2(Vector2.ZERO, SIZE))
var _tag := Look.panel("name")
var _name := Look.label("", Rect2(), Color(Look.ui().name.text))
var _text := Look.label("", Rect2(0, 6, 1, 50))
var _frame := Look.panel("slot", Rect2(5, 5, 52, 52))
var _face := TextureRect.new()
var _arrow := TextureRect.new()
var _list := Look.panel("panel")
var _mark := Look.panel("choice")
var _choices: Array[Label] = []
var _sel := 0
var _typed := 0.0
var _speaker: Ant
var _clock := 0.0


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	_root.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(_root)
	add_child(_list)
	for node: Control in [_box, _tag, _text, _frame, _face, _arrow]:
		_root.add_child(node)
	_tag.add_child(_name)
	_list.add_child(_mark)
	_face.position = Vector2(7, 7)
	_arrow.position = SIZE - Vector2(16, 13)
	close()


func close() -> void:
	_root.hide()
	_list.hide()
	_stop_speaker()


## Shows one line and returns when the player moves on. `who` is a character id for the
## portrait ("" for none); `speaker` is the name shown ("" for none).
func say(speaker: String, who: String, text: String, mood := "neutral", actor: Ant = null) -> void:
	_list.hide()
	var view := get_viewport_rect().size
	var bottom := view.y - SIZE.y - MARGIN
	var top := _hides(actor, bottom) or _hides(courier, bottom)
	_root.position = Vector2(roundf((view.x - SIZE.x) / 2), MARGIN + 10 if top else bottom)
	_root.show()
	_face.visible = who != ""
	_frame.visible = who != ""
	if who != "":
		_face.texture = Ant.portrait(who, mood)
	var left := 62.0 if who != "" else 10.0
	_text.position.x = left
	_text.size.x = SIZE.x - left - 10
	_text.text = text
	_text.visible_characters = 0
	_typed = 0.0
	_tag.visible = speaker != ""
	_name.text = speaker
	_name.position = Vector2(5, 1)
	_tag.position = Vector2(left - 4, -10)
	_tag.size = Vector2(_name.get_minimum_size().x + 10, 14)
	_stop_speaker()
	if actor and actor.pose == "idle":
		_speaker = actor
		actor.pose = "talk"
	await _next


## Lists `options` and returns the index picked. The list sits by the talk box's right end,
## or centred under `top_center` when given.
func choose(options: PackedStringArray, top_center := Vector2(-1, -1)) -> int:
	for c in _choices:
		c.free()
	_choices.clear()
	var width := 0.0
	for i in options.size():
		var l := Look.label(options[i])
		l.mouse_filter = MOUSE_FILTER_STOP
		l.mouse_entered.connect(_select.bind(i))
		l.gui_input.connect(_on_choice_input.bind(i))
		_list.add_child(l)
		_choices.append(l)
		width = maxf(width, l.get_minimum_size().x)
	_list.size = Vector2(width + 22, options.size() * Look.LINE + 10)
	if top_center.x >= 0:
		_list.position = Vector2(roundf(top_center.x - _list.size.x / 2), top_center.y)
	else:
		var box := _root.position
		var below := box.y < get_viewport_rect().size.y / 2
		_list.position = Vector2(box.x + SIZE.x - _list.size.x, box.y + SIZE.y + 3 if below else box.y - _list.size.y - 3)
	for i in _choices.size():
		_choices[i].position = Vector2(12, 4 + i * Look.LINE)
	_arrow.hide()
	_select(0)
	_list.show()
	var picked: int = await _picked
	Sound.play("pop")
	_list.hide()
	return picked


func _process(delta: float) -> void:
	_clock += delta
	if not _root.visible:
		return
	var total := _text.get_total_character_count()
	if _text.visible_characters >= 0 and _text.visible_characters < total:
		_typed += SPEED * delta
		_text.visible_characters = mini(int(_typed), total)
	else:
		_stop_speaker()
	_arrow.visible = not _list.visible and not _typing()
	# Portrait frames: 0 rests, 1 has the mouth open, 2 blinks.
	if _face.visible:
		var mouth := _typing() and int(_clock * 8) % 2 == 1
		var blink := not _typing() and fmod(_clock, 3.5) < 0.15
		(_face.texture as AtlasTexture).region.position.x = 48 * (1 if mouth else 2 if blink else 0)
	if _arrow.visible:
		_arrow.texture = Look.frame("next", int(_clock * 6))


func _unhandled_input(event: InputEvent) -> void:
	if _list.visible:
		if event.is_action_pressed("move_up"):
			_select(posmod(_sel - 1, _choices.size()))
		elif event.is_action_pressed("move_down"):
			_select(posmod(_sel + 1, _choices.size()))
		elif event.is_action_pressed("interact"):
			_picked.emit(_sel)
		else:
			return
		get_viewport().set_input_as_handled()
	elif _root.visible and (event.is_action_pressed("interact") or _is_click(event)):
		get_viewport().set_input_as_handled()
		if _typing():
			_text.visible_characters = -1
		else:
			_next.emit()


## True when a box at `box_y` would cover most of someone.
func _hides(someone: Ant, box_y: float) -> bool:
	return someone != null and someone.is_inside_tree() and (get_viewport().get_canvas_transform() * someone.global_position).y > box_y + 6


func _typing() -> bool:
	return _text.visible_characters >= 0 and _text.visible_characters < _text.get_total_character_count()


func _select(i: int) -> void:
	_sel = i
	_mark.position = Vector2(5, 3 + i * Look.LINE)
	_mark.size = Vector2(_list.size.x - 10, Look.LINE + 2)
	_mark.show()


func _on_choice_input(event: InputEvent, i: int) -> void:
	if _is_click(event):
		accept_event()
		_picked.emit(i)


func _stop_speaker() -> void:
	if _speaker and _speaker.pose == "talk":
		_speaker.pose = "idle"
	_speaker = null


static func _is_click(event: InputEvent) -> bool:
	return event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT
