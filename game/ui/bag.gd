class_name Bag
extends Control
## The courier's bag: the keepsakes he carries and his notes. A keepsake can be turned over to
## look at each side, and noticing something adds it to the notes. Await open().

signal _closed

const PANEL := Rect2(40, 20, 400, 230)

var _panel := Look.panel("panel", PANEL)
var _list := Control.new()   # the bag's contents and the notes
var _look := Control.new()   # one keepsake up close
var _slots := HBoxContainer.new()
var _item_name := Look.label("", Rect2(52, 82, 130, 30))
var _notes := VBoxContainer.new()
var _big := TextureRect.new()
var _side_text := Look.label("", Rect2(70, 176, 340, 30))
var _looking := ""           # the keepsake being looked at, or ""
var _side := 0


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	add_child(_panel)
	for node: Control in [_list, _look]:
		node.mouse_filter = MOUSE_FILTER_IGNORE
		add_child(node)
	_list.add_child(Look.label("Bag", Rect2(52, 30, 100, 12)))
	_slots.position = Vector2(52, 48)
	_slots.add_theme_constant_override("separation", 4)
	_list.add_child(_slots)
	_list.add_child(_item_name)
	_list.add_child(Look.label("Notes", Rect2(196, 30, 100, 12)))
	_notes.position = Vector2(196, 48)
	_notes.size = Vector2(232, 180)
	_notes.add_theme_constant_override("separation", 5)
	_list.add_child(_notes)
	_list.add_child(Look.label("E or Esc to close", Rect2(52, 228, 150, 12), Look.SOFT))
	_big.scale = Vector2(2, 2)
	_side_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_look.add_child(_big)
	_look.add_child(_side_text)
	for i in 2:
		var arrow := Look.label("<" if i == 0 else ">", Rect2(150 + i * 170, 104, 12, 12))
		arrow.mouse_filter = MOUSE_FILTER_STOP
		arrow.gui_input.connect(_on_arrow.bind(-1 if i == 0 else 1))
		_look.add_child(arrow)
	_look.add_child(Look.label("A / D to turn it over. Esc to put it back.", Rect2(52, 228, 300, 12), Look.SOFT))
	hide()


func open() -> void:
	_looking = ""
	_refresh()
	show()
	await _closed
	hide()


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if event.is_action_pressed("cancel") or event.is_action_pressed("bag"):
		if _looking != "":
			_looking = ""
			_refresh()
		else:
			_closed.emit()
	elif _looking == "" and (event.is_action_pressed("inspect") or event.is_action_pressed("interact")) and not Game.bag.is_empty():
		_look_at(Game.bag[0])
	elif _looking != "" and event.is_action_pressed("move_left"):
		_turn(-1)
	elif _looking != "" and event.is_action_pressed("move_right"):
		_turn(1)
	else:
		return
	get_viewport().set_input_as_handled()


func _refresh() -> void:
	_list.visible = _looking == ""
	_look.visible = _looking != ""
	if _looking != "":
		var side: Array = Keepsakes.ALL[_looking].sides[_side]
		_big.texture = item_art(_looking, "lg", side[0])
		_big.position = (Vector2(240, 100) - _big.texture.get_size()).round()
		_side_text.text = side[1]
		Game.note(side[2])
		Game.mark(StringName("seen_%s_%s" % [_looking, side[0]]))
		return
	for child in _slots.get_children():
		child.free()
	for id in Game.bag:
		var slot := TextureButton.new()
		slot.texture_normal = load("res://art/ui/slot.png")
		var art := TextureRect.new()
		art.texture = item_art(id, "sm", Keepsakes.ALL[id].sides[0][0])
		art.position = ((slot.texture_normal.get_size() - art.texture.get_size()) / 2).round()
		art.mouse_filter = MOUSE_FILTER_IGNORE
		slot.add_child(art)
		slot.pressed.connect(_look_at.bind(id))
		_slots.add_child(slot)
	_item_name.text = "Nothing yet." if Game.bag.is_empty() else "%s\nClick it or press I to look closer." % Keepsakes.ALL[Game.bag[0]].name
	for child in _notes.get_children():
		child.free()
	for text in Game.notes:
		var l := Look.label(text, Rect2(0, 0, 232, 0))
		l.custom_minimum_size.x = 232
		_notes.add_child(l)
	if Game.notes.is_empty():
		_notes.add_child(Look.label("Nothing noted yet.", Rect2(), Look.SOFT))


func _look_at(id: String) -> void:
	_looking = id
	_side = 0
	_refresh()


func _on_arrow(event: InputEvent, step: int) -> void:
	if Talk._is_click(event):
		_turn(step)


func _turn(step: int) -> void:
	_side = posmod(_side + step, Keepsakes.ALL[_looking].sides.size())
	_refresh()


## A keepsake's art: items/<id>_<size>_<variant>.png, or items/<id>_<size>.png when it has no variants.
static func item_art(id: String, size: String, variant := "") -> Texture2D:
	var path := "res://art/items/%s_%s_%s.png" % [id, size, variant]
	return load(path if variant != "" and ResourceLoader.exists(path) else "res://art/items/%s_%s.png" % [id, size])
