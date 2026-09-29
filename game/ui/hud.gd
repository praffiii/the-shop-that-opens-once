class_name Hud
extends Control
## What sits over the world while exploring: the bag button, the name of whatever is under the
## mouse, a bubble over whatever is close enough to use, short hints, and the pixel mouse cursor.

signal bag_pressed

const TOAST_SECONDS := 4.0

var place: Place ## Set by Main whenever the place changes.
var talk: Talk ## Set by Main: hints move below the talk box when it sits at the top.

var _bag := TextureButton.new()
var _hover_tag := Look.panel("name")
var _hover := Look.label("", Rect2(), Color(Look.ui().name.text))
var _prompt := TextureRect.new()
var _toast_box := Look.panel("panel")
var _toast := Look.label()
var _toast_left := 0.0
var _cursor := TextureRect.new()
var _clock := 0.0


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	_bag.texture_normal = load("res://art/icons/bag.png")
	_bag.pressed.connect(bag_pressed.emit)
	_hover_tag.add_child(_hover)
	_toast_box.add_child(_toast)
	for node: Control in [_bag, _hover_tag, _prompt]:
		add_child(node)
	# Hints and the cursor sit above every panel. The cursor is drawn inside the pixel canvas,
	# so it scales with the art.
	var top := CanvasLayer.new()
	top.layer = 10
	add_child(top)
	top.add_child(_toast_box)
	_toast_box.theme = Look.theme()
	top.add_child(_cursor)
	_cursor.mouse_filter = MOUSE_FILTER_IGNORE
	Input.mouse_mode = Input.MOUSE_MODE_HIDDEN
	_toast_box.hide()


func toast(text: String) -> void:
	_toast.text = text
	_toast.position = Vector2(8, 4)
	_toast_box.size = Vector2(_toast.get_minimum_size().x + 16, Look.LINE + 9)
	_toast_box.position = Vector2(roundf((get_viewport_rect().size.x - _toast_box.size.x) / 2), 6)
	_toast_box.show()
	_toast_left = TOAST_SECONDS


func _process(delta: float) -> void:
	_clock += delta
	var exploring := place != null and place.player != null and place.controls
	var mouse := get_viewport().get_mouse_position()
	var hovered := get_viewport().gui_get_hovered_control()
	var pointing := (exploring and place.hover != null) or (hovered != null and hovered.mouse_filter == MOUSE_FILTER_STOP)
	var piece := "cursor_hand" if pointing else "cursor"
	var hotspot: Array = Look.ui()[piece].hotspot
	_cursor.texture = load("res://art/ui/%s.png" % piece)
	_cursor.position = (mouse - Vector2(hotspot[0], hotspot[1])).round()

	_bag.visible = exploring
	_bag.position = Vector2(get_viewport_rect().size.x - 24, 8)
	_hover_tag.visible = exploring and place.hover != null
	if _hover_tag.visible:
		_hover.text = place.hover.label
		_hover.position = Vector2(5, 1)
		_hover_tag.size = Vector2(_hover.get_minimum_size().x + 10, 14)
		_hover_tag.position = (mouse + Vector2(10, 8)).clamp(Vector2.ZERO, get_viewport_rect().size - _hover_tag.size).round()

	_prompt.visible = exploring and place.near != null and place.near != place.hover
	if _prompt.visible:
		_prompt.texture = Look.frame("prompt", int(_clock * 3))
		_prompt.scale = Vector2.ONE * Main.ZOOM # the bubble belongs to the world: world-sized pixels
		var area := place.near.global_area()
		var top := get_viewport().get_canvas_transform() * Vector2(area.get_center().x, area.position.y)
		_prompt.position = (top - Vector2(_prompt.texture.get_width() / 2.0, _prompt.texture.get_height() + 1) * Main.ZOOM).round()

	if _toast_left > 0:
		_toast_left -= delta
		_toast_box.visible = _toast_left > 0
		var box := talk.box_rect() if talk else Rect2()
		_toast_box.position.y = box.end.y + 4 if box.has_area() and box.position.y < 40 else 6.0
