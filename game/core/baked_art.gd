@tool
class_name BakedArt
extends Node2D
## Draws a place exported by tools/export-art from the presentation's code-drawn art.
## The ground is drawn under everyone. Each item is a sprite depth-sorted by its feet line with
## this node's other children (the characters). The air (smoke, leaves, birds) is drawn over all.
## Everything plays one shared loop, so the whole place stays in step.

## Folder holding place.json, below.png, above.png and atlas.png.
@export_dir var art_dir := "":
	set(value):
		art_dir = value
		if is_node_ready():
			_build()

var size := Vector2i.ZERO
var bg := Color.WHITE
var data: Dictionary = {}               ## The whole place.json (anchors, paths, hotspots, extras).
var _items: Dictionary[String, Layer] = {}


func _ready() -> void:
	y_sort_enabled = true
	_build()


## A point named in the exported scene (feet positions and points of interest).
func anchor(anchor_name: String) -> Vector2:
	var a: Array = data.anchors[anchor_name]
	return Vector2(a[0], a[1])


func show_item(item_name: String, visible_now: bool) -> void:
	_items[item_name].visible = visible_now


## Like show_item(), for items only some places have.
func show_item_if_any(item_name: String, visible_now: bool) -> void:
	if _items.has(item_name):
		show_item(item_name, visible_now)


func _build() -> void:
	for child in get_children(true):
		if child is Layer:
			child.free()
	_items.clear()
	if art_dir.is_empty():
		return
	data = JSON.parse_string(FileAccess.get_file_as_string(art_dir.path_join("place.json")))
	size = Vector2i(data.size[0], data.size[1])
	bg = Color(data.bg)
	var atlas: Texture2D = load(art_dir.path_join("atlas.png"))
	var fps: float = data.fps
	var loop: int = data.loop
	_add(Layer.new(atlas, fps, loop, data.below.tiles, Vector2.ZERO, load(art_dir.path_join(data.below.image))), -1)
	for it: Dictionary in data.items:
		var layer := Layer.new(atlas, fps, loop, [it], Vector2(0, it.y))
		layer.name = it.name
		_items[it.name] = layer
		_add(layer, 0)
	if data.above:
		_add(Layer.new(atlas, fps, loop, data.above.tiles, Vector2.ZERO, load(art_dir.path_join(data.above.image))), 1)


func _add(layer: Layer, z: int) -> void:
	layer.z_index = z
	add_child(layer, false, Node.INTERNAL_MODE_FRONT)


## A still image plus animated pieces, each playing its own run of frames through the loop.
class Layer extends Node2D:
	var _atlas: Texture2D
	var _image: Texture2D
	var _fps: float
	var _loop: int
	var _rects: Array[Rect2] = []                 # where each piece draws, relative to this node
	var _frames: Array[PackedVector2Array] = []   # atlas positions of each piece's frames
	var _seqs: Array[PackedInt32Array] = []       # frame index of each piece at every loop sample
	var _sample := 0

	func _init(atlas: Texture2D, fps: float, loop: int, pieces: Array, origin: Vector2, image: Texture2D = null) -> void:
		_atlas = atlas
		_image = image
		_fps = fps
		_loop = loop
		position = origin
		var moving := false
		for p: Dictionary in pieces:
			_rects.append(Rect2(Vector2(p.at[0], p.at[1]) - origin, Vector2(p.size[0], p.size[1])))
			var frames := PackedVector2Array()
			for f: Array in p.frames:
				frames.append(Vector2(f[0], f[1]))
			_frames.append(frames)
			var seq := PackedInt32Array()
			for run: Array in p.seq:
				for i in int(run[1]):
					seq.append(int(run[0]))
			_seqs.append(seq)
			moving = moving or frames.size() > 1
		set_process(moving and not Engine.is_editor_hint())

	func _process(_delta: float) -> void:
		var s := int(Time.get_ticks_msec() * _fps / 1000.0) % _loop
		if s == _sample:
			return
		for seq in _seqs:
			if seq[s % seq.size()] != seq[_sample % seq.size()]:
				queue_redraw()
				break
		_sample = s

	func _draw() -> void:
		if _image:
			draw_texture(_image, -position)
		for i in _rects.size():
			var seq := _seqs[i]
			draw_texture_rect_region(_atlas, _rects[i], Rect2(_frames[i][seq[_sample % seq.size()]], _rects[i].size))
