class_name Keepsakes
## Each keepsake's name and what the courier notices on each side when turning it over in the bag.
## A side is [art variant, what he sees, what goes into his notes]. The art is items/<id>_lg_<variant>.png.

const ALL := {
	"watch": {
		"name": "Old wristwatch",
		"sides": [
			["front", "The hands stopped at 18:17. Nobody ever wound it again.", "The watch stopped at 18:17 and was never wound again."],
			["back", "Two letters are engraved on the back: A.T.", "The watch is engraved on the back: A.T."],
			["side", "The crown is pulled out, as if someone stopped it on purpose.", "The watch's crown is pulled out. Someone stopped it on purpose."],
		],
	},
	"doll": {
		"name": "Rabbit doll",
		"sides": [
			["front", "A small rabbit doll, loved nearly bald. One ear was sewn back on with bright blue thread, in tiny, even stitches.", "The rabbit doll's ear was mended with blue thread, in tiny, even stitches."],
			["foot", "A tiny letter is stitched on the bottom of its foot: N.", "The rabbit doll has an N stitched on its foot."],
		],
	},
}
