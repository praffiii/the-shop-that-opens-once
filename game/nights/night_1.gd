extends Night
## Night 1: the stopped watch. Marlow hands the courier a wristwatch stopped at 18:17 and
## engraved "A.T.". The station's plaque and timetable and the clock mender lead to Helen, who has
## waited on the platform bench for twenty years. A traveller with the same initials is a false lead.
## This clue chain is the presentation's draft, adopted for the first playable night (2026-09-28).


func _init(game_main: Main) -> void:
	super(game_main)
	names = {
		"marlow": "Marlow", "helen": "Woman on the bench", "mender": "Clock mender", "traveller": "Traveller",
		"baker": "Baker", "gardener": "Gardener", "kid": "Village kid",
	}


func start() -> void:
	await go("village", "start")
	await say("courier", "Bellwood. It still smells of bread and river water.")
	await say("courier", "Mom's house can wait until morning. Just one walk first.")
	hint("Walk with WASD or the arrow keys, or click where you want to go.")


func entered(place: String) -> void:
	if place == "shop" and not Game.has(&"met_marlow"):
		await _meet_marlow()
	elif place == "station" and Game.has(&"knows_helen"):
		actor("helen").get_node("helen").label = "Helen"
	if place == "station" and not Game.has(&"saw_station"):
		Game.mark(&"saw_station")
		await say("courier", "The old station. I haven't been here since the day I left.")


func interact(id: String) -> void:
	match id:
		"marlow": await _marlow()
		"lanterns": await show_text("Seven lanterns, each glowing over an empty cushion or a small keepsake.")
		"clock": await show_text("The clock says 18:17. The second hand doesn't move.")
		"baker": await _baker()
		"gardener": await _gardener()
		"kid": await _kid()
		"signpost": await show_text("The signpost says BELLWOOD. Behind it, the old road runs back toward the station.")
		"notice_board": await show_text("A faded notice: \"The evening line is closed. Thank you for twenty years of travel.\" Someone has pinned a pressed flower beside it.")
		"plaque": await _plaque()
		"timetable": await _timetable()
		"mender": await _mender()
		"traveller": await _traveller()
		"helen": await _helen()


# --- Marlow's shop ---

func _meet_marlow() -> void:
	await walk("courier", anchor("customer"))
	actor("courier").facing = 1
	await say("marlow", "Ah, there you are. Come in, come in. Mind the step.")
	await say("courier", "Sorry. I didn't know there was a shop here.")
	await say("marlow", "Nobody does. It opens once, for seven nights, and then it's gone again.")
	await say("marlow", "Each lantern up there keeps a keepsake that never found its way home.")
	await say("marlow", "I look after them. You, I think, can carry them.")
	if (await choose(["Why me?", "What do I have to do?"])) == 0:
		await say("marlow", "The shop chose you. It usually knows what it's doing. More than I do, some nights.")
	else:
		await say("marlow", "Take tonight's keepsake to the one it belongs to. I can't give you a map. Listen to the town.")
	await _hand_over()
	await say("marlow", "A wristwatch. Stopped, and never wound again. Someone has waited a long time for it.")
	await say("marlow", "Turn it over in your hands. Things remember more than people think.")
	Game.mark(&"met_marlow")
	hint("Press E or click the bag to look at what you carry.")


func _hand_over() -> void:
	var marlow := actor("marlow")
	var courier := actor("courier")
	var watch := Bag.item_art("watch", "xs", "front")
	main.place.world.show_item("keepsake_0", false)
	Game.mark(&"keepsake_taken")
	marlow.held = watch
	marlow.pose = "give"
	await wait(0.7)
	marlow.held = null
	marlow.pose = "idle"
	courier.held = watch
	courier.pose = "receive"
	await wait(0.7)
	courier.held = null
	courier.pose = "idle"
	Game.bag.append("watch")
	sfx("motif")


func _marlow() -> void:
	if Game.has(&"marlow_hint"):
		await say("marlow", "Take your time. The clock won't move until the watch is home.")
	else:
		Game.mark(&"marlow_hint")
		await say("marlow", "Whose is it? That isn't mine to tell. But the town remembers. Ask it.")


# --- Bellwood ---

func _baker() -> void:
	await say("baker", "Evening! The last loaves are gone, I'm afraid. Come back at dawn.")
	if await _show_watch():
		await say("baker", "A.T.? Can't say I know. The only one in town who cared about the time was the old station keeper.")
		await say("baker", "Used to say the evening train was never once late.")


func _gardener() -> void:
	await say("gardener", "Dusk already? Funny. It's felt like the same dusk for weeks.")
	if await _show_watch():
		await say("gardener", "18:17... The evening train came in at 18:17, back when the line was open.")
		await say("gardener", "You could set your watch by it. Well, not that one, clearly.")


func _kid() -> void:
	if not Game.has(&"met_marlow"):
		await say("kid", "Did you see? There's a shop at the top of the stairs! It wasn't there yesterday. I checked!")
		return
	await say("kid", "You went in the new shop? Lucky! What did the old man give you?")
	if await _show_watch():
		await say("kid", "It's stopped. My gran says the station clock stopped too, the year the trains did.")


## Offers "Show the watch" while the courier carries it. True if he shows it.
func _show_watch() -> bool:
	if "watch" not in Game.bag:
		return false
	return (await choose(["Show the watch", "Goodbye"])) == 0


# --- The old station ---

func _plaque() -> void:
	await show_text("An enamel plaque by the door: KEEPER A. TATE.")
	note("The station plaque reads KEEPER A. TATE.")
	if Game.has(&"seen_watch_back"):
		await say("courier", "A. Tate... A.T.?")


func _timetable() -> void:
	await show_text("The old timetable is still up. EVENING TRAIN: 18:17.")
	note("The station timetable: the evening train was due at 18:17.")


func _mender() -> void:
	await say("mender", "Clocks, watches, music boxes. If it ticks, I can mend it.")
	var options: PackedStringArray = ["Ask about the woman on the bench"]
	if "watch" in Game.bag:
		options.append("Show the watch")
	options.append("Goodbye")
	match options[(await choose(options))]:
		"Ask about the woman on the bench":
			await say("mender", "That's Helen. She sits on that bench every evening before 18:17. Twenty years now.")
			await say("mender", "Someone promised to meet her off the evening train.")
			names["helen"] = "Helen"
			actor("helen").get_node("helen").label = "Helen"
			Game.mark(&"knows_helen")
			note("The clock mender: Helen has waited on the bench every evening before 18:17, for twenty years.")
		"Show the watch":
			sfx("wrong")
			await say("mender", "Let me see... Nothing's broken. Someone let it stop at 18:17 and never wound it again.")
			await say("mender", "That isn't a repair. That's a promise.")
			note("The clock mender: the watch isn't broken. Stopping it at 18:17 was a promise.")


func _traveller() -> void:
	await say("traveller", "Just passing through. Trains don't stop here anymore, did you know? I walked from the junction.")
	if await _show_watch():
		sfx("wrong")
		await say("traveller", "A.T.? Those are my initials too, funnily enough. See, on my case.")
		await say("traveller", "But that isn't my watch. Ask someone who's waited here longer than me.")
		note("The traveller's case is marked A.T., but the watch isn't his.")


func _helen() -> void:
	await say("helen", "Oh. Good evening. The train will be here soon. 18:17. It's never late.")
	var options: PackedStringArray = ["Who are you waiting for?"]
	if "watch" in Game.bag:
		options.append("Show her the watch")
	options.append("Goodbye")
	match options[(await choose(options))]:
		"Who are you waiting for?":
			await say("helen", "Someone who promised. He always kept his promises.")
			await say("helen", "I'll know him the moment he steps down from the carriage.")
		"Show her the watch":
			await _return_watch()


func _return_watch() -> void:
	var helen := actor("helen")
	var courier := actor("courier")
	var watch := Bag.item_art("watch", "xs", "front")
	await say("courier", "I think this belongs to you. Or it was always meant to.")
	helen.position = anchor("helenStand")
	helen.pose = "idle"
	helen.face_to(courier.position.x)
	courier.held = watch
	courier.pose = "give"
	await wait(0.7)
	courier.held = null
	courier.pose = "idle"
	helen.held = watch
	helen.pose = "receive"
	Game.bag.erase("watch")
	sfx("right")
	music("memory")
	await say("helen", "...Arthur's watch.", "moved")
	await say("helen", "He promised he'd be on the 18:17. He stopped his watch the evening he left, so our time would wait for him.", "moved")
	await say("helen", "The trains stopped, and I kept coming anyway. I thought if I stopped waiting, I'd lose him.", "moved")
	helen.held = null
	helen.pose = "moved"
	await say("helen", "But he never let go of our evening, did he? Not for a single minute.", "moved")
	await say("helen", "I think I can stop waiting now. Thank you, dear.", "moved")
	await wait(0.8)
	await _lantern_goes_out()


func _lantern_goes_out() -> void:
	await go("shop", "counter")
	music("resolved")
	var world := main.place.world
	await wait(0.8)
	world.show_item("clock_1817", false)
	world.show_item("clock_1818", true)
	sfx("tick")
	await wait(0.6)
	world.show_item("lantern_0", false)
	sfx("chime")
	Game.lanterns_out = 1
	await wait(0.8)
	await say("marlow", "There. Did you hear it? The clock moved.")
	await say("marlow", "One lantern out. Six keepsakes still waiting.")
	await say("marlow", "Go home and rest. The shop will be here tomorrow, at dusk.")
	await card(["Night 1", "The Stopped Watch", "One lantern has gone out."])
	Game.night = 2
	Game.save()
	await card(["Thank you for playing the first night.", "Night 2 is still being made."])
	main.finish()
