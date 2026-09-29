extends Night
## Night 2: the stitched rabbit. Marlow hands over a rabbit doll whose ear was mended with blue thread,
## with an "N" stitched on its foot. Nora the toymaker knows her own stitching, the baker tells of her
## quarrel with her daughter Mia, and the washing line by Nora's shop is full of tiny clothes. The
## rabbit belongs to Pip, Mia's child: the grandchild Nora has never met.
## This clue chain was drafted for the game and adopted by the user (2026-09-29).


func _init(game_main: Main) -> void:
	super(game_main)
	names = {
		"marlow": "Marlow", "nora": "Toymaker", "mia": "Woman in the garden", "grandkid": "Little one",
		"baker": "Baker", "kid": "Village kid",
	}


func start() -> void:
	await card(["Night 2", "The next evening"])
	await go("village", "start")
	await say("courier", "Dusk again. I only meant to stay one night.")
	await say("courier", "The shop is still there. I can see its lanterns from here.")


func entered(place: String) -> void:
	if place == "shop" and not Game.has(&"keepsake_taken"):
		await _meet_marlow()
	elif place == "toyshop" and not Game.has(&"met_nora"):
		await _meet_nora()


func interact(id: String) -> void:
	match id:
		"marlow": await _marlow()
		"lanterns": await show_text("Seven lanterns. The first one is dark now.")
		"clock": await show_text("The clock says 18:18. One minute further than last night.")
		"baker": await _baker()
		"kid": await _kid()
		"signpost": await show_text("The signpost says BELLWOOD. Someone has hung a paper lantern on it since last night.")
		"notice_board": await show_text("Beside the old notice, a new one: \"Lost: one sock. Blue. Answers to Button.\"")
		"washing_line": await _washing_line()
		"nora": await _nora()
		"spool": await _spool()
		"frame": await show_text("A small photo frame lies face down on the shelf. You leave it the way she left it.")
		"rabbits": await _rabbits()
		"shirt": await show_text("A little shirt, half finished. Far too small for anyone who comes into a toy shop alone.")
		"mia": await _mia()
		"grandkid": await _pip()


# --- Marlow's shop ---

func _meet_marlow() -> void:
	await walk("courier", anchor("customer"))
	actor("courier").facing = 1
	await say("marlow", "Back again. Good. The shop hoped you would be.")
	await look(anchor("lantern3"))
	await say("marlow", "One lantern out. The clock noticed too: it's 18:18 now.")
	await look(null)
	await hand_over("doll")
	await say("marlow", "Tonight, a rabbit. Well loved, carefully mended... and never given away.")
	await say("marlow", "Stitches are a kind of handwriting. See whose hand this is.")


func _marlow() -> void:
	if Game.has(&"marlow_hint"):
		await say("marlow", "Take your time. The lanterns aren't going anywhere. Well, one at a time.")
	else:
		Game.mark(&"marlow_hint")
		await say("marlow", "A toy that was never played with is a lonely thing. Find the child it was made for.")


# --- Bellwood ---

func _baker() -> void:
	await say("baker", "Evening! The bread's gone, but the gossip is still warm.")
	if await _show_rabbit():
		await say("baker", "That's one of Nora's, sure as sugar. The toymaker, behind the scissors sign on the square.")
		await say("baker", "She had a daughter, Mia. They fell out years ago, the week Mia told her she was expecting.")
		await say("baker", "Mia lives in the cottage with the green shutters now, down by the vegetable garden. With her little one.")
		known("nora", "Nora")
		known("mia", "Mia")
		Game.mark(&"knows_mia")
		note("The baker: Nora the toymaker and her daughter Mia fell out years ago, the week Mia told her she was expecting.")
		note("The baker: Mia lives in the green-shuttered cottage by the vegetable garden, with her little one.")


func _kid() -> void:
	await say("kid", "Hey, you came back! Did the old man give you another thing?")
	if await _show_rabbit():
		sfx("wrong")
		await say("kid", "Ooh, it's so soft! But it's not mine. It smells like someone else's house.")
		await say("kid", "The little one by the green cottage has a rabbit made out of a sock. Maybe they need a real one.")
		note("The village kid: the little one by the green cottage has a rabbit made out of a sock.")


func _washing_line() -> void:
	await show_text("Tiny clothes hang on the line beside the toy shop: a little blue shirt, a pink dress. Every hem is stitched with the same blue thread.")
	note("The washing line by Nora's shop holds tiny children's clothes, hemmed with blue thread.")
	await say("courier", "Small clothes, and no small child at the toy shop.")


## Offers "Show the rabbit" while the courier carries it. True if he shows it.
func _show_rabbit() -> bool:
	if "doll" not in Game.bag:
		return false
	return (await choose(["Show the rabbit", "Goodbye"])) == 0


# --- Nora's toy shop ---

func _meet_nora() -> void:
	Game.mark(&"met_nora")
	await walk("courier", anchor("customer"))
	await say("nora", "Mind the rocking horse, dear, it's older than both of us. Welcome.")
	await say("nora", "I'm Nora. Toys, mending, and the occasional miracle with a button.")
	known("nora", "Nora")


func _nora() -> void:
	var options: PackedStringArray = []
	if "doll" in Game.bag:
		options.append("Show her the rabbit")
	if Game.has(&"knows_mia"):
		options.append("Ask about Mia")
	if options.is_empty():
		await say("nora", "Something in need of mending? Bring it by any time.")
		return
	options.append("Goodbye")
	await say("nora", "Something in need of mending?")
	match options[(await choose(options))]:
		"Show her the rabbit":
			sfx("wrong")
			await say("nora", "...That's my stitching. I'd know it anywhere.", "moved")
			await say("nora", "I made that rabbit a long time ago. For someone who never came to collect it.")
			await say("nora", "It isn't mine to keep, dear. Please take it to whoever it was meant for.")
			note("Nora made the rabbit a long time ago, for someone who never came to collect it.")
		"Ask about Mia":
			await say("nora", "Mia is my daughter. We don't speak.")
			await say("nora", "Pride is a very strong thread. It holds even when you wish it wouldn't.", "moved")
			note("Nora: she and her daughter Mia don't speak. \"Pride is a very strong thread.\"")


func _spool() -> void:
	await show_text("A spool of bright blue thread, half used.")
	if "doll" in Game.bag:
		await say("courier", "The same blue as the rabbit's ear.")
		note("Nora's bench has a spool of the same blue thread as the rabbit's ear.")


func _rabbits() -> void:
	await show_text("A shelf of plush rabbits, each finished with the same tiny, even stitches.")
	note("Nora's rabbits are all sewn with the same tiny, even stitches as the doll.")


# --- Mia's cottage ---

func _mia() -> void:
	await say("mia", "Evening. Mind the beans, they're shy.")
	var options: PackedStringArray = []
	if "doll" in Game.bag:
		options.append("Show her the rabbit")
	if Game.has(&"knows_mia"):
		options.append("Ask about her mother")
	if options.is_empty():
		return
	options.append("Goodbye")
	match options[(await choose(options))]:
		"Show her the rabbit":
			sfx("wrong")
			await say("mia", "Where did you get that?", "moved")
			await say("mia", "Mom made it. For the baby. I never let her give it.", "moved")
			await say("mia", "It was never meant for me.")
			known("mia", "Mia")
			note("Mia: her mother made the rabbit for the baby, and Mia never let her give it.")
		"Ask about her mother":
			await say("mia", "We haven't spoken in years. Every week I think: this week. And then I don't.")


func _pip() -> void:
	if not Game.has(&"met_pip"):
		Game.mark(&"met_pip")
		await say("grandkid", "Shh. I'm making a rabbit. Out of a sock. His name is Button.")
		await say("grandkid", "I'm Pip. I don't have a grandma. Mom says it's complicated.")
		known("grandkid", "Pip")
		note("Pip, Mia's child, is making a rabbit out of an old sock. Pip has no grandma: \"Mom says it's complicated.\"")
	else:
		await say("grandkid", "Button needs ears. Socks are bad at ears.")
	if "doll" in Game.bag and (await choose(["Give Pip the rabbit", "Goodbye"])) == 0:
		await _rabbit_home()


func _rabbit_home() -> void:
	await say("courier", "I think this rabbit has been waiting for you.")
	await give_keepsake("grandkid", "doll")
	music("memory")
	await say("grandkid", "He has a blue ear! Mom, look! Somebody fixed him!", "smile")
	await walk("mia", actor("grandkid").position + Vector2(24, 0))
	actor("mia").face_to(actor("grandkid").position.x)
	await say("mia", "...That's your grandmother's stitching.", "moved")
	await say("grandkid", "I have a grandma?", "smile")
	await say("mia", "You do. She lives on the square. She makes toys.", "moved")
	await say("mia", "I think it's time you met her.")
	await _mending()


## On the square: Mia and Pip at Nora's door. Then the second lantern goes out.
func _mending() -> void:
	var doll := actor("grandkid").held
	await go("village", "meet")
	music("memory")
	var nora := actor("nora")
	var mia := actor("mia")
	var pip := actor("grandkid")
	mia.position = anchor("tailorDoor") + Vector2(-26, 11)
	pip.position = anchor("tailorDoor") + Vector2(-14, 17)
	pip.held = doll
	pip.pose = "receive"
	nora.position = anchor("tailorDoor") + Vector2(2, 5)
	nora.show()
	for who in [mia, pip]:
		who.face_to(nora.position.x)
	nora.face_to(mia.position.x)
	await wait(0.6)
	await say("nora", "Mia.", "moved")
	await say("mia", "Hello, Mom.")
	await say("mia", "The ear came loose, Mom.", "moved")
	await say("nora", "I can mend it. If you'll let me.", "moved")
	await say("grandkid", "Are you my grandma? Do you make ALL the toys?", "smile")
	await say("nora", "Every single one. Come inside, both of you. The kettle's on.", "smile")
	var door := anchor("tailorDoor")
	nora.walk_to(main.place.walk_map.path(nora.position, door))
	mia.walk_to(main.place.walk_map.path(mia.position, door))
	await pip.walk_to(main.place.walk_map.path(pip.position, door))
	for who in [nora, mia, pip]:
		who.hide()
	await wait(0.8)
	await lantern_goes_out()
	await say("marlow", "Two lanterns now. The shop feels lighter for it.")
	await say("marlow", "Mending takes two, you know. One to hold the cloth, one to hold the needle.")
	await say("marlow", "Rest now. The shop will be here tomorrow, at dusk.")
	await card(["Night 2", "The Stitched Rabbit", "A second lantern has gone out."])
	await main.end_night()
