class_name WalkMap
extends RefCounted
## Where feet may stand in a place (the white pixels of its walk.png), and walking paths across it.
## Paths are found on a coarse grid, then straightened wherever a direct line stays walkable.

const CELL := 4
const HALF := Vector2(CELL / 2.0, CELL / 2.0)

var _mask: Image
var _bounds: Rect2i
var _grid := AStarGrid2D.new()


## `mask` is a walk.png imported as an Image (see its .import file), so it loads without a GPU.
func _init(mask: Image) -> void:
	_mask = mask
	_bounds = Rect2i(Vector2i.ZERO, _mask.get_size())
	_grid.region = Rect2i(Vector2i.ZERO, (_bounds.size + Vector2i(CELL - 1, CELL - 1)) / CELL)
	_grid.cell_size = Vector2(CELL, CELL)
	_grid.offset = HALF
	_grid.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	_grid.update()
	for y in _grid.region.size.y:
		for x in _grid.region.size.x:
			if not walkable(Vector2(x * CELL, y * CELL) + HALF):
				_grid.set_point_solid(Vector2i(x, y))


func walkable(p: Vector2) -> bool:
	var i := Vector2i(p.floor())
	return _bounds.has_point(i) and _mask.get_pixelv(i).r > 0.5


## Where feet moving from `from` by `motion` end up: the full move, or a slide along a wall.
func slide(from: Vector2, motion: Vector2) -> Vector2:
	for m in [motion, Vector2(motion.x, 0), Vector2(0, motion.y)]:
		if m != Vector2.ZERO and walkable(from + m):
			return from + m
	return from


## Points to walk through from `from` towards `to`, ending on the walkable point nearest to `to`.
## Empty when there is no way there.
func path(from: Vector2, to: Vector2) -> PackedVector2Array:
	var goal := _nearest_cell(to)
	var start := _nearest_cell(from)
	if goal.x < 0 or start.x < 0:
		return PackedVector2Array()
	var cells := _grid.get_id_path(start, goal)
	if cells.is_empty():
		return PackedVector2Array()
	var points := PackedVector2Array([from])
	for c in cells:
		points.append(_grid.get_point_position(c))
	points.append(to if walkable(to) and _clear(points[-1], to) else points[-1])
	return _straighten(points)


func _nearest_cell(p: Vector2) -> Vector2i:
	var c := Vector2i((p / CELL).floor())
	for r in 13:
		for dy in range(-r, r + 1):
			for dx in range(-r, r + 1):
				if maxi(absi(dx), absi(dy)) != r:
					continue
				var n := c + Vector2i(dx, dy)
				if _grid.is_in_boundsv(n) and not _grid.is_point_solid(n):
					return n
	return Vector2i(-1, -1)


func _straighten(points: PackedVector2Array) -> PackedVector2Array:
	var out := PackedVector2Array([points[0]])
	var i := 0
	while i < points.size() - 1:
		var j := points.size() - 1
		while j > i + 1 and not _clear(points[i], points[j]):
			j -= 1
		out.append(points[j])
		i = j
	return out


func _clear(a: Vector2, b: Vector2) -> bool:
	var steps := ceili(a.distance_to(b))
	for s in range(1, steps + 1):
		if not walkable(a.lerp(b, float(s) / steps)):
			return false
	return true
