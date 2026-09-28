@tool
class_name Hotspot
extends Node2D
## Something the courier can click or walk up to: a person, a sign, a door.
## Its node name is the id the night script receives. With `exit_to` set, stepping into
## its area takes the courier to another place instead.

## Shown next to the mouse. Night scripts may change it (a stranger's name, once learned).
@export var label := ""
## Clickable area, relative to this node.
@export var area := Rect2(-8, -16, 16, 16):
	set(value):
		area = value
		queue_redraw()
## Where the courier stands to use it, relative to this node.
@export var spot := Vector2(0, 8):
	set(value):
		spot = value
		queue_redraw()
## "place/spawn": stepping into the area goes to that place, arriving at that spawn point.
@export var exit_to := ""


func global_area() -> Rect2:
	return Rect2(global_position + area.position, area.size)


func global_spot() -> Vector2:
	return global_position + spot


func _draw() -> void:
	if Engine.is_editor_hint():
		draw_rect(area, Color(1, 0.8, 0.2, 0.25))
		draw_rect(area, Color(1, 0.6, 0.1), false)
		draw_rect(Rect2(spot - Vector2.ONE, Vector2(3, 3)), Color(0.2, 0.6, 1))
