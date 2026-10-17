class_name Look
## The UI's shared look: colours from the art palette, the pixel font, and the pieces in art/ui.

const INK := Color("#2a1b22")
const SOFT := Color("#7a452e")  # wood4, for quieter text
const PAPER := Color("#fffaf0") # cream0
const FONT_SIZE := 13 ## Pixelify Sans spaces its letters evenly here (at 12 the "a" runs wide).
const LINE := 14 ## Line pitch of text, in art px.

static var _ui: Dictionary = {}


## art/ui/ui.json: sizes, 9-slice margins, frame counts and cursor hotspots of the UI pieces.
static func ui() -> Dictionary:
	if _ui.is_empty():
		_ui = JSON.parse_string(FileAccess.get_file_as_string("res://art/ui/ui.json"))
	return _ui


static func theme() -> Theme:
	var t := Theme.new()
	var font: FontFile = load("res://fonts/pixelify-latin.woff2")
	t.default_font = font
	t.default_font_size = FONT_SIZE
	t.set_color("font_color", "Label", INK)
	t.set_constant("line_spacing", "Label", LINE - int(font.get_height(FONT_SIZE)))
	return t


## A 9-slice panel from art/ui/<piece>.png, covering `rect`.
static func panel(piece: String, rect := Rect2()) -> NinePatchRect:
	var n := NinePatchRect.new()
	n.texture = load("res://art/ui/%s.png" % piece)
	var m: Array = ui()[piece].margins
	n.patch_margin_left = m[0]
	n.patch_margin_top = m[1]
	n.patch_margin_right = m[2]
	n.patch_margin_bottom = m[3]
	n.position = rect.position
	n.size = rect.size
	n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return n


## Frame `i` of a horizontal strip in art/ui/<piece>.png.
static func frame(piece: String, i: int) -> AtlasTexture:
	var tex := AtlasTexture.new()
	tex.atlas = load("res://art/ui/%s.png" % piece)
	var w := tex.atlas.get_width() / int(ui()[piece].frames)
	tex.region = Rect2(w * (i % int(ui()[piece].frames)), 0, w, tex.atlas.get_height())
	return tex


static func label(text := "", rect := Rect2(), color := INK) -> Label:
	var l := Label.new()
	l.text = text
	l.position = rect.position
	l.size = rect.size
	l.add_theme_color_override("font_color", color)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if rect.size.x > 0:
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return l
