using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// The Prologue, The Boy Who Left (Day 0): Satria comes home to Bellwood at dusk with the agent's sale contract.
    /// Off the bus at the stop on the road in, through the East past a glimpse of home and over the bridge, the
    /// village's welcome in the square, Valdo waiting at the road's turn into the East, and home: the gate, the key,
    /// what is left of his family in the house, and his first night there. Day 0 keeps to the story's path: the ways
    /// off it are shut, each with its reason.
    /// </summary>
    public sealed class Prologue : Chapter
    {
        public Prologue(Main main) : base(main) { }

        public override Phase StartPhase => Phase.Dusk;

        public override async Awaitable Start()
        {
            KnowVillage();
            Game.Bag.AddRange(new[] { "shirt", "purse", "contract" });
            await Card("Prologue: The Boy Who Left", "16:30, the bus stop on the road into Bellwood");
            // the empty stop at dusk; the bus is heard pulling up out of sight round the bend, and Satria walks out of
            // the trees with his bag, stops at the stop, watches the bus drive off up the road, and turns to the village
            await Go("eastroad", "off_bus");
            await Cinema(true);
            await Look(Anchor("arrive") + new Vector2(-40, 0));
            Sfx("bus_stop");
            await Wait(2.8f);
            var courier = Actor("courier");
            await courier.Walk(new List<Vector2> { new(1030, 238), Anchor("arrive") });
            Sfx("bus_far");
            courier.FaceTo(700);
            await Wait(2.4f);
            await Say("courier", "Eleven years...");
            courier.FaceTo(0);
            await Wait(0.6f);
            await Look(null);
            await Cinema(false);
            Tip("Click to walk, or use WASD (Shift to run or walk). Space uses what is close. E opens your bag.");
        }

        public override async Awaitable Entered(string place)
        {
            if (place == "square" && !Game.Has("welcomed")) await Welcome();
            if (place == "east" && Main.Place.Actor("valdo") is { } valdo)
            {
                valdo.Held = Keepsakes.Art("briefcase", "xs", "");
                if (!Game.Has("met_valdo")) await MeetValdo();
            }
            // through the door for the first time
            if (place == "satria_home" && !Game.Has("home"))
            {
                Game.Mark("home");
                Sfx("door");
                await Wait(0.6f);
                await ShowText("The key turns in the lock: click. The teak door gives inward with a heavy creak, and the room's still, stale air meets him, smelling of old paper.");
                Hint("Look round the house.");
            }
        }

        public override string Closed(string id) => id switch
        {
            "to_road" => "The last bus has gone.",
            "home_door" when !Game.Has("welcomed") => "Not yet.",
            "home_door" when !Game.Bag.Contains("homekey") => "Locked. Aunt Helen said the key is under Mother's old geranium pot.",
            "to_station" or "to_coast" => "It's getting dark. I should get home first.",
            _ => base.Closed(id),
        };

        public override async Awaitable Stepped(string id)
        {
            switch (id)
            {
                // halfway across the East: Satria looks back at the house at the road's end, and is not ready for it
                case "glimpse":
                    await Scene(async () =>
                    {
                        Actor("courier").FaceTo(Anchor("home").x);
                        await Look(Anchor("home"));
                        await Wait(1.2f);
                        await Say("courier", "...Not yet.", "sad");
                        await Look(null);
                    });
                    break;
                // the yard gate shrieks open on its rusty hinges, into a yard gone wild
                case "gate":
                    await Scene(async () =>
                    {
                        Actor("courier").FaceAway();
                        Sfx("gate");
                        await Wait(0.5f);
                        Main.Place.World.ShowItemIfAny("satria_gate", false);
                        Main.Place.World.ShowItemIfAny("satria_gate_open", true);
                        await Wait(0.6f);
                        await ShowText("The rusty iron gate shrieks as he pushes it: creak, clack. Wild grass has crept right up to the porch's wooden steps.");
                        await ShowText("The dusk wind blows cold, carrying the smell of wet earth and a childhood that aches to remember.");
                    });
                    break;
                // onto the bridge, Theo at its rail waving him in
                case "bridge":
                    await Scene(async () =>
                    {
                        await ShowText("Bellwood. It still smells of bread and river water.");
                        await Say("theo", "Welcome back to Bellwood, Satria. The sea wind here never changes.", "smile");
                    });
                    break;
            }
        }

        public override async Awaitable Interact(string id)
        {
            switch (id)
            {
                case "bus_bench":
                    await ShowText("A long twig bench, worn smooth by years of waiting. Carved into its back by some village children long ago: S + L.");
                    break;
                case "bus_poster":
                    await ShowText("A faded poster for the Honey Flower Harvest Festival, ten years gone. Its corners are torn and wrinkled from the dew.");
                    break;
                // the key where it always was
                case "geranium" when Game.Has("welcomed") && !Game.Bag.Contains("homekey"):
                    Actor("courier").Pose = "inspect";
                    await Wait(0.5f);
                    Actor("courier").Pose = "idle";
                    Sfx("right");
                    Game.Bag.Add("homekey");
                    await ShowText("Under the cracked clay pot lies an old brass key, green with moss. The house key.");
                    break;
                case "geranium":
                    await ShowText(Game.Bag.Contains("homekey") ? "Mother's geranium. Still flowering, somehow, with no one to water it." : "Mother's old geranium in its cracked clay pot. Still flowering, somehow.");
                    break;
                // the house as his family left it
                case "photo":
                    Actor("courier").FaceAway();
                    await ShowText("A family photo behind dusty glass: Father smiling proudly in his mechanic's cap, Mother with her arm round little Satria's shoulders, still in his school uniform.");
                    if (!Game.Has("monologue")) await Monologue();
                    break;
                case "radio":
                    await ShowText("Father's old wooden valve radio on its little corner table. Its knobs are thick with dust, its copper aerial folded stiff.");
                    break;
                case "sewing":
                    await ShowText("Mother's treadle sewing machine. Beside it, her tin of red thread, a small gold needle and her cloth scissors, laid out as neatly as if she had stepped out five minutes ago.");
                    break;
                case "water_jar":
                    await ShowText("The clay water jar and its coconut-shell dipper, set neatly in the corner. The little stove wears a fine blanket of dust.");
                    break;
                case "bed" when !Game.Has("monologue"):
                    await Say("courier", "Not yet. I've hardly looked round.");
                    break;
                case "bed":
                    await FirstNight();
                    break;
                case "bus_bin":
                    await ShowText("A wooden bin, clean but for a few pine cuttings. The ants out here still sort their dry leaves with care.");
                    break;
                // the villagers Satria passes on Day 0 have a word for him, not their everyday talk: a short exchange
                // the first time, and something else if he comes back to them
                case "nora" when Again("nora"):
                    await Say("nora", "Go on home, child. The house has waited long enough. So have its ghosts, I'd say... the kind ones.", "smile");
                    break;
                case "nora":
                    await Say("nora", "Is that... Ratih's boy? Goodness *gracious*. You went away a sapling and came back a tree.", "surprised");
                    await Say("courier", "Evening, Grandma Nora. You're still weaving, I see.");
                    await Say("nora", "Every day the light lets me. Your mother sat on this very deck and threaded my shuttles when her eyes were better than mine.", "moved");
                    if (await Choose("I remember. She'd come home with wool in her hair.", "I can't stay long, I'm afraid.") == 0)
                    {
                        await Say("courier", "I remember. She'd come home with wool in her hair.", "smile");
                        await Say("nora", "Ha! She would. Plum wool, mostly. She said it suited the dusk.", "smile");
                    }
                    else
                    {
                        await Say("courier", "I can't stay long, I'm afraid.");
                        await Say("nora", "Nobody ever means to. Then the river gets into their bones.", "sad");
                    }
                    break;
                case "gardener" when Again("gardener"):
                    await Say("gardener", "Chamomile wants a light hand and a lot of patience. Like most things worth keeping.");
                    break;
                case "gardener":
                    await Say("gardener", "Satria? Well, I'll be. Your mother's beds are all weeds now. I couldn't bring myself to touch them.", "sad");
                    await Say("courier", "You looked after the field, though. It smells like it used to.");
                    await Say("gardener", "The chamomile was her idea, you know. *Plant something that calms people*, she said. So I did, and I kept on.", "smile");
                    break;
                case "farmhand" when Again("farmhand"):
                    await Say("farmhand", "If you're after work while you're here, the aphids always need herding. Ha! Only joking. Mostly.", "smile");
                    break;
                case "farmhand":
                    await Say("farmhand", "Evening, stranger. Oh! Not a stranger at all, are you. Ratih's lad, from the end of the road!", "surprised");
                    await Say("courier", "Guilty. Long day on the bus.");
                    await Say("farmhand", "Then sit a minute before that hill road. My legs always thank me for it.", "smile");
                    break;
                case "herder" when Again("herder"):
                    await Say("herder", "There, they've settled. Aphids are easy, really. They only want to know where home is.");
                    break;
                case "herder":
                    await Say("herder", "Mind the little ones on the lane! They wander out at dusk and sit right where you'd tread.", "surprised");
                    await Say("courier", "I'll watch my feet.");
                    await Say("herder", "Good lad. Half the village has stepped in honeydew this week. The other half lies about it.", "smile");
                    break;
                case "mia" when Again("mia"):
                    await Say("mia", "Pip's been at the window all week, watching for the bus. He'll have a hundred questions for you.", "smile");
                    break;
                case "mia":
                    await Say("mia", "Welcome home, Satria. Don't mind the talk. It's only talk.");
                    if (await Choose("What are they saying?", "Thank you, Mia.") == 0)
                    {
                        await Say("courier", "What are they saying?", "puzzled");
                        await Say("mia", "That a man in a grey suit keeps measuring your mother's fence with a tape. That you've come to sell. That you'll be gone by the festival.", "sad");
                        await Say("mia", "I told them a boy who grew up on Ratih's ginger tea knows what he's doing. Don't make me a liar.", "smile");
                    }
                    else await Say("mia", "Mm. Get some rest. You look like a parcel left out in the rain.", "smile");
                    break;
                case "pip" when Again("pip"):
                    await Say("pip", "When you go back to the city can I have your cap? Not now. Later. When you're old.", "smile");
                    break;
                case "pip":
                    await Say("pip", "Are you the city courier? A *real* one? With a real bag?!", "surprised");
                    await Say("courier", "A real one. The bag's real too. Mostly it's full of shirts.");
                    await Say("pip", "Shirts?! Couriers carry *treasure*. Or secret letters. Or at least sweets.", "cross");
                    if (await Choose("Secret letters. Don't tell anyone.", "Just shirts, sorry.") == 0)
                    {
                        await Say("courier", "Secret letters. Don't tell anyone.");
                        await Say("pip", "...I won't. I'm very good at secrets. I've only told Mochi two.", "smile");
                    }
                    else await Say("pip", "Boring. You need a better job.", "sad");
                    break;
                case "sam" when Again("sam"):
                    await Say("sam", "The archive keeps the village's paper. Somebody has to remember what everyone else would rather forget.");
                    break;
                case "sam":
                    await Say("sam", "Satria. Doors locked, lamps out, ledgers shut. And now the courier comes home. Welcome back.");
                    await Say("courier", "You haven't changed, Sam. Still closing up the hall at dusk.");
                    await Say("sam", "Someone has to. The hall remembers everything, and it does not like to be left open after dark.");
                    break;
                case "florist" when Again("florist"):
                    await Say("florist", "Take a sprig of chamomile for the house. Your mother always kept a cup of it on the sill.", "smile");
                    break;
                case "florist":
                    await Say("florist", "Ratih's boy! Oh, she'd have been *so* glad to see you home.", "moved");
                    await Say("courier", "I wish I'd come sooner.");
                    await Say("florist", "Well. You've come now. That's the part the flowers care about.", "smile");
                    break;
                case "shopper" when Again("shopper"):
                    await Say("shopper", "I'd best get these loaves home before they go cold. Mind the agent, Satria. He smiles with his teeth.");
                    break;
                case "shopper":
                    await Say("shopper", "So you're back. That house will be glad of someone in it.");
                    await Say("courier", "For a little while, at least.");
                    await Say("shopper", "Little whiles have a way of stretching, here.", "smile");
                    break;
                default:
                    await Chat(id);
                    break;
            }
        }

        // True when Satria has already talked with someone today; marks that he has.
        static bool Again(string id)
        {
            if (Game.Has("talked_" + id)) return true;
            Game.Mark("talked_" + id);
            return false;
        }

        // 17:15, at the road's turn into the East: Valdo has waited by the waymark since the bus, and steps into
        // Satria's way as he comes home from the square.
        async Awaitable MeetValdo()
        {
            Game.Mark("met_valdo");
            await Cinema(true);
            var courier = Actor("courier");
            var valdo = Actor("valdo");
            var walking = Walk("courier", new Vector2(110, 470));
            await Wait(0.8f);
            await Say("valdo", "Ah, Mr Satria! Right on time. I've been waiting for your bus since three o'clock.", "smile");
            await walking;
            var stepping = Walk("valdo", new Vector2(80, 468));
            await Look(new Vector2(95, 466));
            await stepping;
            valdo.FaceTo(courier.Feet.x);
            courier.FaceTo(valdo.Feet.x);
            await Say("courier", "Mr Valdo... I've barely set foot in the village.", "surprised");
            await Say("valdo", "I understand, I understand. Homesick, of course. But business can't wait for *nostalgia*, Mr Satria.", "smile");
            await Say("valdo", "The sugar mill's investors in the capital have the money ready. They need your late parents' land settled before the week is out: by the morning of Day Eight, to be exact.");
            await Say("valdo", "The draft agreement is already in your bag. Sign the stamped page, and the transfer clears every instalment on your courier's motorbike in the city. Clear out the house, pack what matters, and we sign the day after tomorrow. Agreed?", "smile");
            await Say("courier", "Give me a few days to put my mother's things in order, Mr Valdo.");
            await Say("valdo", "Of course. But remember the deadline: the morning of Day Eight. Don't let a *golden chance* slip away because the country air has lulled you.", "cross");
            Note("Valdo wants the sale contract signed by the morning of Day Eight.", keep: true);
            await Cinema(false);
            await Look(null);
        }

        // At the family photo: what Satria came home for, and what he will not let the house do to him.
        async Awaitable Monologue()
        {
            Game.Mark("monologue");
            await Cinema(true);
            await Say("courier", "The old green velvet sofa... Father's valve radio... the walnut table where the three of us ate boiled sweet potatoes every night of the rainy season...");
            await Say("courier", "Everything is just as it was eleven years ago, when I walked out with my worn canvas rucksack for the city bus.");
            await Say("courier", "The dust comes away thick on my fingers when I touch the glass. Father... Mother... I'm sorry.", "moved");
            await Say("courier", "I didn't come back to Bellwood for old times' sake. I came back to settle the deed with that land agent, clear what's left of my debts in the city, and go again, as far away as I can.");
            await Say("courier", "This village is too quiet, and thinking of the two of you in this empty house only makes my chest tighter.", "sad");
            await Say("courier", "Three days. Just *three days*, and it's all over.", "sad");
            await Cinema(false);
            Hint("Rest when you're ready: the bed is in the bedroom, by the west wall.");
        }

        // His first night home: onto the old kapok bed, the lamp blown out, the crickets outside, and the dark.
        async Awaitable FirstNight()
        {
            await Cinema(true);
            var courier = Actor("courier");
            courier.Feet = new Vector2(795, 366); // on the middle of the bed
            courier.Seat = 12;
            courier.Pose = "sit";
            courier.FaceTo(809); // to the lamp on the desk by the bed
            Sfx("bed");
            await Wait(0.8f);
            await ShowText("The old kapok mattress creaks under his tired body. It smells of old kapok and faded sheets.");
            Sfx("blow");
            Main.Place.World.ShowItemIfAny("lamp_lit", false);
            await Wait(0.8f);
            await ShowText("He blows out the lamp. A thin wisp of smoke curls up, smelling of warm paraffin.");
            // the crickets outside carry on into the dark, over the chapter's last card
            Main.Talk.Close();
            Sfx("crickets");
            await Wait(1.5f);
            await Main.EndChapter();
        }

        // Into the square, the village's talk carries on the evening air, and Helen, at the bread stall, sees who has come
        // home: she drops her basket, the Baker brings out a tray from his oven, Leo comes over from the bench under the oak.
        async Awaitable Welcome()
        {
            Game.Mark("welcomed");
            await Cinema(true);
            var courier = Actor("courier");
            var helen = Actor("helen");
            var baker = Actor("baker");
            helen.Held = Keepsakes.Art("basket", "xs", "");
            var walking = Walk("courier", new Vector2(1080, 650));
            await Say("mia", "They say that land agent from the city's been out to Ratih's house again and again. They'll pour concrete over that yard for a sugar mill, you'll see.");
            await Say("shopper", "Such a shame if it's sold. Ratih planted the chamomile there with her own hands...");
            await walking;
            // they gather by the bread stall as people do to talk, all turned to Satria in the middle: Helen on his
            // left, the Baker and Leo on his right, a step apart and clear of the lamp, and the shot takes in the four of them
            var stood = helen.Feet;
            var middle = stood + new Vector2(10, -12);
            await Walk("courier", middle);
            await Look(middle);
            helen.FaceTo(middle.x);
            await Wait(0.5f);
            var basket = await helen.Drop();
            Sfx("drop");
            await Say("helen", "Satria?! Oh, good heavens... Satria! Have you really come home?!", "moved");
            await Say("courier", "Evening, Aunt Helen. Yes... just for a little while.");
            // the Baker comes down from his door with a tray from the oven, and Leo gets up from the bench under the
            // oak to see what the fuss is, while Helen hurries over
            baker.Carrying = true;
            var bakerComing = Walk("baker", middle + new Vector2(28, 6));
            var leoComing = Walk("leo", middle + new Vector2(54, -2));
            var framing = Look(middle + new Vector2(12, 0));
            await Walk("helen", middle + new Vector2(-28, 0));
            helen.FaceTo(middle.x);
            await Say("helen", "A little while? *Eleven years* you've been off in the city! Eleven years! The last letter you sent was for your mother's funeral, two years ago... ah, never mind that.", "moved");
            await Say("helen", "Look at you, thin as a twig in the wind. Racing parcels about from dawn to midnight and forgetting to eat, I'll bet.", "cross");
            await framing;
            await bakerComing;
            baker.FaceTo(middle.x);
            await Say("baker", "Who's making all the fuss this late, Helen? Well, look! Satria?! The village's little runner, all grown into a city ant!", "surprised");
            await leoComing;
            Actor("leo").FaceTo(middle.x);
            await Say("leo", "Heard you're the fastest express courier in the city, Satria? Careful, or an old crock like me will outrun you yet!", "smile");
            if (await Choose("The city's too noisy, Mr Baker. Bellwood's air is far cleaner.", "None of you have changed. Still turning out for whoever steps off the bus.") == 0)
            {
                await Say("courier", "The city's too noisy, Mr Baker. Bellwood's air is far cleaner.");
                await Say("baker", "Ha! That's my boy. Here, still warm. Ginger and palm sugar, same as ever.", "smile");
                courier.FaceTo(baker.Feet.x);
                courier.Held = Keepsakes.Art("biscuit", "xs");
                courier.Pose = "receive";
                Sfx("pop");
                await Wait(0.7f);
                courier.Held = null;
                courier.Pose = "idle";
                Game.Bag.Add("biscuit");
            }
            else await Say("courier", "None of you have changed. Still turning out for whoever steps off the bus.");
            await Say("helen", "Your family's house at the end of the east road still stands, Satria. Though the grass in the front yard is up to your waist by now.");
            await Say("helen", "The key's where it always was, under your mother's old geranium pot. Go and rest, dust yourself off. If you need hot water or some supper tonight, come by my stall on the platform.");
            await Say("courier", "Thank you so much, Aunt Helen. I'll get along home, then.", "smile");
            Note("The key to Mother's house is under her old geranium pot.");
            // Helen goes back for her basket
            await Walk("helen", stood);
            helen.PickUp(basket);
            await Cinema(false);
            await Look(null);
        }
    }
}
