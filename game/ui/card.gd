class_name Card
extends Control
## A full-screen card of a few centred lines, such as a night's title. Await show_lines().

signal _next

var _lines := VBoxContainer.new()


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	var paper := ColorRect.new()
	paper.color = Color("#fff1d2") # dirt0: the same warm cream as the curtain
	paper.size = Vector2(480, 270)
	paper.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(paper)
	_lines.position = Vector2(40, 0)
	_lines.size = Vector2(400, 270)
	_lines.alignment = BoxContainer.ALIGNMENT_CENTER
	_lines.add_theme_constant_override("separation", 6)
	add_child(_lines)
	hide()


func show_lines(lines: PackedStringArray) -> void:
	for child in _lines.get_children():
		child.free()
	var lantern := TextureRect.new()
	lantern.texture = load("res://art/icons/lantern.png")
	lantern.size_flags_horizontal = SIZE_SHRINK_CENTER
	_lines.add_child(lantern)
	for i in lines.size():
		var l := Look.label(lines[i], Rect2(), Look.INK if i == 0 else Look.SOFT)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_lines.add_child(l)
	show()
	await _next
	hide()


func _unhandled_input(event: InputEvent) -> void:
	if visible and (event.is_action_pressed("interact") or Talk._is_click(event)):
		get_viewport().set_input_as_handled()
		_next.emit()
