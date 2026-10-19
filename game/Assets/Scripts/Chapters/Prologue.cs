using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// The Prologue, The Boy Who Left (Day 0): Satria comes home to Bellwood at dusk with the agent's sale contract.
    /// So far its first part: off the bus at the stop on the road in, through the East past a glimpse of home and over
    /// the bridge, and the village's welcome in the square. Day 0 keeps to the story's path: the ways off it are shut,
    /// each with its reason.
    /// </summary>
    public sealed class Prologue : Chapter
    {
        public Prologue(Main main) : base(main) { }

        public override async Awaitable Start()
        {
            Game.Phase = Phase.Dusk;
            // Satria knows everyone here: he grew up with them
            foreach (var (id, name) in new[] { ("helen", "Helen"), ("baker", "Baker"), ("leo", "Leo"), ("theo", "Theo"), ("nora", "Nenek Nora"), ("gardener", "Gardener"), ("mia", "Mia"), ("pip", "Pip"), ("sam", "Sam"),
                         ("shopper", "Shopper"), ("florist", "Flower seller"), ("farmhand", "Farmhand"), ("herder", "Aphid herder") })
                Known(id, name);
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
            Hint("Click to walk, or use WASD (hold Shift to run). Space uses what is close. E opens your bag.");
        }

        public override async Awaitable Entered(string place)
        {
            if (place == "square" && !Game.Has("welcomed")) await Welcome();
        }

        public override string Closed(string id) => id switch
        {
            "to_road" => "The last bus has gone.",
            "home_door" when !Game.Has("welcomed") => "Not yet.",
            "home_door" when !Game.Bag.Contains("homekey") => "Locked. Bu Helen said the key is under Mother's old geranium pot.",
            "to_station" or "to_coast" => "It's getting dark. I should get home first.",
            _ => null,
        };

        public override async Awaitable Stepped(string id)
        {
            switch (id)
            {
                // halfway across the East: Satria looks back at the house at the road's end, and is not ready for it
                case "glimpse":
                    Actor("courier").FaceTo(Anchor("home").x);
                    await Look(Anchor("home"));
                    await Wait(1.2f);
                    await Say("courier", "...Not yet.");
                    await Look(null);
                    break;
                // onto the bridge, Theo at its rail waving him in
                case "bridge":
                    await ShowText("Bellwood. It still smells of bread and river water.");
                    await Say("theo", "Welcome back to Bellwood, Satria. The sea wind here never changes.");
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
                case "bus_bin":
                    await ShowText("A wooden bin, clean but for a few pine cuttings. The ants out here still sort their dry leaves with care.");
                    break;
                // the villagers Satria passes on Day 0 have a word for him, not their everyday talk
                case "nora":
                    await Say("nora", "Is that... Ratih's boy? Goodness. You went away a sapling and came back a tree.", "moved");
                    break;
                case "gardener":
                    await Say("gardener", "Satria? Your mother's beds are all weeds now. I couldn't bring myself to touch them.");
                    break;
                case "farmhand":
                    await Say("farmhand", "Evening, stranger. Oh! Not a stranger at all, are you.");
                    break;
                case "herder":
                    await Say("herder", "Mind the little ones on the lane. They wander out at dusk.");
                    break;
                case "mia":
                    await Say("mia", "Welcome home, Satria. Don't mind the talk. It's only talk.");
                    break;
                case "pip":
                    await Say("pip", "Are you the city courier? A real one? With a real bag?");
                    break;
                case "sam":
                    await Say("sam", "Doors locked, lamps out. Welcome back, Satria.");
                    break;
                case "florist":
                    await Say("florist", "Ratih's boy! She'd have been glad to see you home.");
                    break;
                case "shopper":
                    await Say("shopper", "So you're back. That house will be glad of someone in it.");
                    break;
                default:
                    await Chat(id);
                    break;
            }
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
            await Say("mia", "They say that land agent from the city's been out to Bu Ratih's house again and again. They'll pour concrete over that yard for a sugar mill, you'll see.");
            await Say("shopper", "Such a shame if it's sold. Bu Ratih planted the chamomile there with her own hands...");
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
            await Say("courier", "Evening, Bu Helen. Yes... just for a little while.");
            // the Baker comes down from his door with a tray from the oven, and Leo gets up from the bench under the
            // oak to see what the fuss is, while Helen hurries over
            baker.Carrying = true;
            var bakerComing = Walk("baker", middle + new Vector2(28, 6));
            var leoComing = Walk("leo", middle + new Vector2(54, -2));
            var framing = Look(middle + new Vector2(12, 0));
            await Walk("helen", middle + new Vector2(-28, 0));
            helen.FaceTo(middle.x);
            await Say("helen", "A little while? Eleven years you've been off in the city! Eleven years! The last letter you sent was for your mother's funeral, two years ago... ah, never mind that.", "moved");
            await Say("helen", "Look at you, thin as a twig in the wind. Racing parcels about from dawn to midnight and forgetting to eat, I'll bet.");
            await framing;
            await bakerComing;
            baker.FaceTo(middle.x);
            await Say("baker", "Who's making all the fuss this late, Helen? Well, look! Satria?! The village's little runner, all grown into a city ant!");
            await leoComing;
            Actor("leo").FaceTo(middle.x);
            await Say("leo", "Heard you're the fastest express courier in the city, Satria? Careful, or an old crock like me will outrun you yet!");
            if (await Choose("The city's too noisy, Pak Baker. Bellwood's air is far cleaner.", "None of you have changed. Still turning out for whoever steps off the bus.") == 0)
            {
                await Say("courier", "The city's too noisy, Pak Baker. Bellwood's air is far cleaner.");
                await Say("baker", "Ha! That's my boy. Here, still warm. Ginger and palm sugar, same as ever.");
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
            await Say("courier", "Thank you so much, Bu Helen. I'll get along home, then.");
            Note("The key to Mother's house is under her old geranium pot.");
            // Helen goes back for her basket
            await Walk("helen", stood);
            helen.PickUp(basket);
            await Cinema(false);
            await Look(null);
        }
    }
}
