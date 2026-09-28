@tool
class_name Ant
extends Sprite2D
## An ant drawn from its exported sheet (art/chars/<id>.png). The node's position is the feet point.
## Plays a pose, faces left or right, can hold a small item, and walks through a list of points.

signal arrived
## A foot touched the ground while walking.
signal stepped

const SPEED := 56.0 ## Walking pace in art px per second.
const WALKS := ["walk", "carryWalk", "run"] ## Poses whose frames advance with distance, not time.

static var _cast: Dictionary = {}

@export var id := "courier":
	set(value):
		id = value
		if is_node_ready():
			_refresh()
@export var pose := "idle":
	set(value):
		if value != pose:
			pose = value
			_time = 0.0
			_step = 0.0
			_frame = 0
			if is_node_ready():
				_refresh()
@export_enum("Right:1", "Left:-1") var facing := 1:
	set(value):
		facing = value
		if is_node_ready():
			_refresh()

## A small item shown in the hand, or null.
var held: Texture2D:
	set(value):
		held = value
		if is_node_ready():
			_hand.texture = value
			_hand.visible = value != null

var _info: Dictionary = {}
var _hand: Sprite2D # made in _ready, so an ant freed before it enters the tree leaks nothing
var _time := 0.0
var _step := 0.0
var _frame := 0
var _path := PackedVector2Array()
var _walk_id := 0
var _exact := Vector2.ZERO # where the ant really is while walking; it stands on the nearest whole pixel


## chars.json: every character's poses, frame counts, speeds and hand positions.
static func cast() -> Dictionary:
	if _cast.is_empty():
		_cast = JSON.parse_string(FileAccess.get_file_as_string("res://art/chars/chars.json"))
	return _cast


## A 48x48 portrait frame of a character in a mood (falls back to neutral).
static func portrait(char_id: String, mood := "neutral", frame := 0) -> AtlasTexture:
	var moods: Array = cast().chars[char_id].moods
	var tex := AtlasTexture.new()
	tex.atlas = load("res://art/chars/portraits/%s.png" % char_id)
	tex.region = Rect2(frame * 48, maxi(moods.find(mood), 0) * 48, 48, 48)
	return tex


func _ready() -> void:
	centered = false
	_hand = Sprite2D.new()
	_hand.visible = false
	add_child(_hand, false, Node.INTERNAL_MODE_FRONT)
	_hand.texture = held
	_refresh()


func _process(delta: float) -> void:
	if Engine.is_editor_hint() or _info.is_empty():
		return
	if not _path.is_empty():
		var to := _path[0]
		move_by((to - _here()).limit_length(SPEED * delta))
		if _exact.is_equal_approx(to):
			_path.remove_at(0)
			if _path.is_empty():
				_arrive()
	elif pose not in WALKS:
		_time += delta
		_show(int(_time * _pose().fps))


## Walks through `points`. Returns true on arrival, false if another walk or stop() took over.
func walk_to(points: PackedVector2Array) -> bool:
	_walk_id += 1
	var mine := _walk_id
	if points.is_empty():
		return true
	_path = points
	pose = "walk"
	await arrived
	return mine == _walk_id


## Stops walking, stands still, and releases anyone awaiting walk_to() with false.
func stop() -> void:
	_walk_id += 1
	_path.clear()
	_arrive()


func _arrive() -> void:
	if pose in WALKS:
		pose = "idle"
	arrived.emit()


## Steps by `motion` (keyboard walking): faces the way it goes and moves the legs by distance.
func move_by(motion: Vector2) -> void:
	if absf(motion.x) > 0.01:
		facing = 1 if motion.x > 0 else -1
	_exact = _here() + motion
	position = _exact.round() # whole pixels, so the ant's pixels line up with the zoomed scene's
	if pose not in WALKS:
		pose = "walk"
	_step += motion.length()
	var stride: float = _pose().stride
	while _step >= stride:
		_step -= stride
		_show(_frame + 1)
		if _frame % (int(_pose().frames) / 2) == 0:
			stepped.emit()


## Where the ant really is: its exact walking position, unless something has moved it since.
func _here() -> Vector2:
	return _exact if _exact.round() == position else position


func face_to(x: float) -> void:
	if absf(x - position.x) > 1.0:
		facing = 1 if x > position.x else -1


func _pose() -> Dictionary:
	return _info.poses.get(pose, _info.poses.idle)


func _show(frame: int) -> void:
	var p := _pose()
	_frame = frame % int(p.frames)
	frame_coords = Vector2i(_frame, int(p.row))
	var hand: Array = p.hand[_frame]
	_hand.position = Vector2(hand[0] * facing, hand[1])
	_hand.visible = held != null


func _refresh() -> void:
	var all := cast()
	_info = all.chars.get(id, {})
	if _info.is_empty():
		texture = null
		return
	texture = load("res://art/chars/%s.png" % id)
	hframes = texture.get_width() / int(all.cell[0])
	vframes = texture.get_height() / int(all.cell[1])
	flip_h = facing < 0
	offset = Vector2(-(all.flippedFeetX if facing < 0 else all.feet[0]), -all.feet[1])
	_show(_frame)
