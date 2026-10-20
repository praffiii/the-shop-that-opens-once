using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Night 3, The Old Film Camera (the word: Remembering). Marlow's third box, carved THEO, holds Daniel's 8mm cine
    /// camera, the D he engraved on its brass plate, its crank jammed and its last reel still inside: Daniel handed it
    /// to Theo the night the estuary bridge fell, five years ago, when the river took him shoring up its posts. At the
    /// coffee stall the coast says Theo's door has been chained since the funeral; Valdo scorns the junk; Leo, after his
    /// beach run, says Theo opens to nobody who comes empty-handed, but Daniel's mint tea would open his vent; Arlo
    /// lends his rope for the bluff's rock face. At midday the wild mint is climbed for (minigame 3A), brewed at the
    /// stall and set on the vent's sill, the chain comes off, and in the darkroom the reel is developed (minigame 3B).
    /// At dusk Theo's projector shows Daniel's last film, and out on the bluff the camera goes back into Theo's hands.
    /// </summary>
    public sealed class Night3 : NightChapter
    {
        /// <summary>The studio's doorstep, where Theo comes out to the tea.</summary>
        static readonly Vector2 Doorstep = new(263, 214), AtVent = new(286, 216);
        /// <summary>On the bluff toward the bench, where the camera goes back to Theo with the last of the light.</summary>
        static readonly Vector2 Edge = new(560, 214);
        /// <summary>Mia and Pip's house on the square, its window lit tonight.</summary>
        static readonly Vector2 MiasWindow = new(950, 574);

        public Night3(Main main) : base(main) { }

        protected override int Night => 3;
        protected override string Title => "The Old Film Camera";
        protected override string Word => "Remembering";
        protected override string Page =>
            "In the city, forgetting is the quickest way to survive. We forget old friends, forget the promises we made as children, forget yesterday's failures, so we can keep up the pace at work today.\n\n" +
            "But tonight, watching Theo's projector and Father's smile on that white cloth, I understood that forgetting never heals grief. It only buries the wound alive.\n\n" +
            "Remembering takes a great deal of courage: the courage to look back at the faces of those who are gone without regret, and to be grateful they were here at all.";
        protected override string MorningLine => "Morning. Tea first. Then the coast, and a door that's been chained for five years.";
        protected override string DayErrand => "The coast, and a door that's been chained for five years.";
        protected override string Breakfast => "On the gatepost, wrapped in a cloth: half a carrot loaf from Mia. The knot is Pip's, and so is the rabbit drawn on the cloth.";

        /// <summary>The camera as the day leaves it: dusty and jammed, then its crank freed and its lens clean.</summary>
        protected override string Keepsake => Game.Bag.Contains("camera_clean") ? "camera_clean" : "camera";

        protected override string Asking => "This was Father's camera. Do you know how I'd get it to Theo?";

        // Asked round about the camera: the coast points to Leo, who still calls at Theo's door, and to Arlo, who knows its rocks.
        static readonly Dictionary<string, Reaction> Asked = new()
        {
            ["fisher"] = new("Daniel's camera... Theo was always at his elbow, holding the light. Leo still calls up at Theo's door on his morning run. Ask Leo.", "moved", "The fisher: Leo still calls at Theo's door on his morning run."),
            ["salter"] = new("Arlo was with Daniel the night the bridge went. He knows every rock and rope on this coast, that one.", "sad", "The salt worker: Arlo knows every rock on the coast."),
            ["arlo"] = new("Daniel's. I lent him my rope the night the bridge went, and never asked for it back... If you need anything climbed, lad, my rope's yours.", "sad", "Arlo: his rope is mine, if I need anything climbed."),
            ["mender"] = new("A jammed crank wants patience, not force. And it's not my bench that film needs, it's Theo's darkroom.", "neutral", "The Mender: the camera's film needs Theo's darkroom."),
            ["helen"] = new("Daniel never went anywhere without it. Theo hasn't come down off that bluff since the funeral.", "sad"),
            ["bram"] = new("Daniel filmed my last run on the line. I never saw the film. Nobody did.", "sad"),
            ["porter"] = new("Proper old kit. Theo up on the bluff would know it, if he'd open his door to anyone."),
            ["mia"] = new("Your father's! He filmed the whole market once, everybody pulling faces at him.", "smile"),
            ["pip"] = new("A real film camera! Can it film me? ...It's broken, isn't it.", "surprised"),
            ["sam"] = new("The hall has his photographs of the opening day. Theo printed them. That was a long time ago."),
            ["baker"] = new("Daniel's camera. He'd trade a reel of film for a sweet loaf, and I always let him.", "moved"),
            ["florist"] = new("Oh, Daniel used to film my mother's roses. Said colour was wasted on black and white, and filmed them anyway.", "smile"),
            ["shopper"] = new("Theo's door's been chained five years, love. You'll not get in with that alone."),
            ["nora"] = new("Theo blames himself, child. A door shut from the inside only opens from the inside.", "sad"),
            ["gardener"] = new("Mint. Daniel always had a sprig of wild mint behind his ear, from the bluff. Funny what you remember.", "smile"),
            ["farmhand"] = new("Heavy, that. My arm'd drop off filming the harvest."),
            ["herder"] = new("Never been filmed in my life. The aphids would hate it."),
        };
        protected override Dictionary<string, Reaction> Reactions => Asked;

        protected override async Awaitable AtShop()
        {
            var fetching = FetchBox(2);
            await Say("marlow", "The third bell. It carries a long way tonight, with the wind off the sea.");
            await fetching;
            await HandOver();
            await Say("courier", "THEO, on the lid.", "surprised");
            await Say("marlow", "Open it.");
        }

        // What Marlow says of Daniel's camera.
        protected override async Awaitable Opened()
        {
            await Say("courier", "This camera... it's Father's! Daniel's! He cut that D into the brass plate himself, with a nail, the winter I was born.", "surprised");
            await Say("marlow", "Things never forget the first hands that held them, Satria. It was your father's, but he put it into Theo's hands the night the estuary bridge fell.");
            await Say("courier", "Theo... Father's friend. The village photographer, who shuts himself away in his studio on the bluff?", "puzzled");
            await Say("marlow", "Some stop looking at the world not because their eyes have failed, Satria, but because they are afraid of seeing who is no longer beside them. Take it to him before the next dusk, before what he remembers rots in the dark.");
        }

        protected override async Awaitable ResumeDay(string checkpoint)
        {
            switch (checkpoint)
            {
                case "midday":
                    await Go("coast", "from_square");
                    Hint("Arlo's rope, the bluff's rock face, and the wild mint on its edge.");
                    break;
                case "dusk":
                    await Go("theo_studio", "door");
                    Hint("Theo is in his rocking chair, by the projector.");
                    break;
                default:
                    await Start();
                    break;
            }
        }

        public override string Closed(string id) =>
            id == "theo_studio_door" && !Game.Has("studio_open") ? "A ship's chain through the handles, padlocked from inside. Someone is home, and wants nobody to know it." : base.Closed(id);

        protected override async Awaitable Arrived(string place)
        {
            switch (place)
            {
                // on the way to the shop: since Mochi came home, a lamp burns low in Mia and Pip's window, and no crying
                case "square" when Game.Phase == Phase.Night && !Game.Has("boxed") && !Game.Has("saw_window"):
                    Game.Mark("saw_window");
                    await Scene(async () =>
                    {
                        await Look(MiasWindow);
                        await ShowText("In Mia and Pip's window a lamp is turned down low. Through the curtain, a small shape asleep with a long-eared rabbit in its arms.");
                        await Say("courier", "Not a sound from him tonight.", "smile");
                        await Look(null);
                    });
                    break;
                // out of the shop with Father's camera
                case "grove" when Game.Has("boxed") && !Game.Has("doubted"):
                    Game.Mark("doubted");
                    await Scene(async () =>
                    {
                        Actor("courier").FaceTo(0);
                        Sfx("waves");
                        await Wait(0.6f);
                        await Say("courier", "Father's camera... Eleven years in the city, and I tried so hard to forget him. To me he was a stubborn man who let the river drag him off, shoring up the posts of a bridge everyone else had given up on.");
                        await Say("courier", "So why has Theo shut himself up in that studio since the funeral? Why hasn't he photographed a single face in five years?");
                        await Say("courier", "If I go asking at the market tomorrow, I'll only open old grief, or they'll think I've gone mad, carrying an old camera about at midnight. Carefully, then. Keep it quiet, and find a way to make Theo open a door he keeps padlocked from inside.");
                    });
                    break;
                // the morning's rumour over coffee at the stall by the jetty
                case "coast" when Game.Phase == Phase.Morning && !Game.Has("rumour"):
                    Game.Mark("rumour");
                    await Say("salter", "Theo up in that studio, he's not come up to the village to buy so much as an onion in years... and his door's always padlocked with a ship's chain!");
                    await Say("fisher", "Back when Daniel was alive, the two of them filmed every cargo boat that tied up here. Every single one...");
                    Note("At the coffee stall: Theo's door has been chained with a ship's chain for years. He and Daniel used to film every boat that docked.");
                    Hint("Someone on the coast might know how to get Theo to open up. Show them Father's camera.");
                    break;
            }
        }

        protected override async Awaitable Day(string id)
        {
            switch (id)
            {
                case "valdo" when Game.Phase == Phase.Morning && !Game.Has("asked_valdo"):
                    Game.Mark("asked_valdo");
                    await Say("courier", "Mr Valdo, would an old camera like this be worth anything, to the village's history?");
                    await Say("valdo", "Its history?! Mr Satria, an old lens like that is full of glass fungus, and the cloth inside will have rotted. In the city's flea markets they sell cameras like that by the kilo, to hang in cafés!", "smile");
                    await Say("valdo", "We've little time left. The investors come on the morning of Day Eight. Don't waste your strength carting junk about.", "cross");
                    break;
                case "leo" when Game.Phase == Phase.Morning && !Game.Has("asked_leo"):
                    await Leo();
                    break;
                case "arlo" when Game.Phase == Phase.Morning && Game.Has("asked_leo") && !Game.Bag.Contains("rope"):
                    await Arlo();
                    break;
                case "mint_cliff" when Game.Bag.Contains("rope") && !Game.Has("climbed"):
                    await Climb();
                    break;
                case "mint_cliff" when Game.Has("asked_leo") && !Game.Has("climbed"):
                    await Say("courier", "Too slick to climb bare-handed. I need a rope, and someone who knows this coast.");
                    break;
                case "coffee_stall" when Game.Bag.Contains("mint"):
                    await Brew();
                    break;
                case "vent" when Game.Bag.Contains("mint_tea"):
                    await Vent();
                    break;
                case "vent" when Game.Has("asked_leo") && !Game.Has("studio_open"):
                    await Say("courier", "Leo said it: nobody gets in empty-handed. The mint tea, on this sill.");
                    break;
                case "theo" when Game.Phase == Phase.Dusk && Game.Bag.Contains("camera_clean") && !Game.Has("screened"):
                    await Screening();
                    break;
                default:
                    await base.Day(id);
                    break;
            }
        }

        // Leo on the stall's terrace, stretching after his beach run: the mint tea that opens Theo's vent.
        async Awaitable Leo()
        {
            Game.Mark("asked_leo");
            await Scene(async () =>
            {
                var leo = Actor("leo");
                await Say("courier", "Leo, do you know any way to see Theo in his studio?");
                leo.Pose = "idle";
                leo.FaceTo(Actor("courier").Feet.x);
                await Say("leo", "Theo never opens his door to anyone who comes empty-handed, Satria.", "sad");
                await Say("leo", "Since your father died he's blamed himself. He thinks he only lived because Daniel told him to run, and take the camera with him.", "sad");
                await Say("leo", "But bring him fresh sea mint from the rock face on the bluff, and he'll open his vent. Daniel always brewed him mint tea, to keep him company while he washed the film.", "smile");
                leo.Pose = "stretch";
                Note("Leo: Theo opens to nobody empty-handed. Daniel's mint tea, of wild mint from the bluff's rock face, set at his vent.", keep: true);
            });
            Hint("Wild mint grows on the bluff's edge, over the rock face. Too slick to climb without a rope.");
        }

        // In the salt store Arlo, mending his nets, lends his hemp rope for the rock face; the day moves to midday.
        async Awaitable Arlo()
        {
            await Scene(async () =>
            {
                var arlo = Actor("arlo");
                await Say("courier", "Arlo, how would someone climb the rock face on the bluff, to pick the wild mint?");
                arlo.Pose = "idle";
                arlo.FaceTo(Actor("courier").Feet.x);
                await Say("arlo", "That rock's slick with green moss from the spray, lad! But my hemp rope'll get you up the crack, so long as you keep your balance when the sea wind leans on you.");
                await Walk("arlo", Anchor("rope"));
                arlo.FaceAway();
                await Wait(0.5f);
                await Give("arlo", "rope");
                await Say("arlo", "I'll be out in the boat under the bluff. If you come off, you'll hear me shouting before you hear the sea.", "smile");
                Note("Arlo lent his hemp rope for the bluff's rock face.");
            });
            await MovePhase(Phase.Midday);
            Checkpoint("midday");
            Hint("The bluff's rock face, west along the beach street.");
        }

        // Up the rock face on Arlo's rope to the wild mint on the bluff's edge.
        async Awaitable Climb()
        {
            await Scene(async () =>
            {
                await Walk("courier", Main.Place.Find("mint_cliff").GlobalSpot);
                Actor("courier").FaceAway();
                await Say("courier", "Black rock, wet to the top. Rope round the shoulders. Don't look down.");
            });
            await Play(new CliffClimb());
            Game.Mark("climbed");
            await Scene(async () =>
            {
                Game.Bag.Remove("rope");
                await Receive("mint");
                await Say("courier", "Three bunches of wild mint. Sharp and cold, like the sea itself.", "smile");
                await ShowText("He coils Arlo's rope on the beach street's bench, where Arlo will see it.");
            });
            Hint("Mint tea wants hot water and a cup. The coffee stall by the jetty.");
        }

        // At the coffee stall the mint is steeped in a clay cup.
        async Awaitable Brew()
        {
            await Scene(async () =>
            {
                var courier = Actor("courier");
                await Walk("courier", Main.Place.Find("coffee_stall").GlobalSpot);
                courier.FaceAway();
                await ShowText("Water from the brass pot on the brazier, over the mint in a clay cup. The steam comes up green and sharp.");
                Sfx("tea");
                Game.Bag.Remove("mint");
                await Wait(1f);
                await Receive("mint_tea");
            });
            Hint("Up on the bluff: the vent beside Theo's door.");
        }

        // The tea on the vent's sill: the chain comes off from inside, Theo opens his door, and they go in to the
        // darkroom, where Daniel's last reel is developed; the day moves to dusk.
        async Awaitable Vent()
        {
            await Scene(async () =>
            {
                var courier = Actor("courier");
                await Walk("courier", AtVent);
                courier.FaceAway();
                courier.Pose = "give";
                await Wait(0.6f);
                courier.Pose = "idle";
                Game.Bag.Remove("mint_tea");
                Game.Mark("tea_set");
                Main.Place.FollowStory();
                await ShowText("He sets the clay cup on the vent's sill. The steam curls in through the louvres.");
                await Wait(1.2f);
                Sfx("chain");
                await Wait(1.2f);
                Game.Mark("studio_open");
                Main.Place.FollowStory();
                Sfx("door");
                var theo = Main.Place.Bring("theo", Doorstep);
                theo.FaceTo(courier.Feet.x);
                courier.FaceTo(theo.Feet.x);
                await ShowText("The door opens slowly on an old ant with a single glass over one eye, his vest spattered with developer.");
                await Say("theo", "Mint... Daniel's tea...", "moved");
                courier.Held = Keepsakes.Art("camera", "xs");
                courier.Pose = "give";
                await Wait(0.6f);
                await Say("theo", "Daniel's camera... Satria... you've brought it home...", "moved");
                courier.Held = null;
                courier.Pose = "idle";
                await Say("courier", "Mr Theo, Marlow asked me to bring it to you. The last reel is still inside, from before the bridge fell.");
                await Say("theo", "Then come in. Quickly, before the light gets at it.");
                Main.Place.Leave("theo");
            });
            await Go("theo_studio", "door");
            await Develop();
        }

        // In the darkroom under the safelight: the crank freed, the reel out of the camera and through the old developer.
        async Awaitable Develop()
        {
            await Scene(async () =>
            {
                var theo = Actor("theo");
                await Walk("courier", Anchor("tank") + Beside);
                theo.FaceTo(Actor("courier").Feet.x);
                Main.Safelight = true;
                Sfx("click");
                await Say("theo", "The crank's jammed, and the developer in this red basin is older than I'd like to say. Get the warmth or the time wrong and whatever's on this film burns away, for good.", "sad");
                await Say("theo", "Daniel's hands would have known. Yours will have to do. Gently, now.");
            });
            try
            {
                await Play(new Darkroom());
            }
            finally
            {
                Main.Safelight = false;
            }
            await Scene(async () =>
            {
                var theo = Actor("theo");
                theo.Pose = "look";
                await ShowText("The film comes up out of the fixer clear, sharp and alive: frame after frame of Daniel and the village, shoulder to shoulder, fitting timber to the bridge's posts, laughing in the rain.");
                await Say("theo", "There he is...", "moved");
                theo.Pose = "idle";
                Swap("camera", "camera_clean");
                await ShowText("While the reel dries, Theo frees the camera's crank with a drop of oil and breathes the dust off its lens.");
                await Say("theo", "Come back at dusk, Satria. I'll have the projector ready. Some things want to be seen in the dark.");
                Note("Daniel's last reel is developed: the village shoring up the bridge with him. Theo will show it at dusk.");
            });
            await MovePhase(Phase.Dusk);
            Checkpoint("dusk");
            Hint("Theo's studio, at dusk: the projector.");
        }

        // The reel running on the screen, four frames a second, until the film is over.
        async Awaitable Roll()
        {
            var start = Time.time;
            while (!Game.Has("screened") && Main.Place)
            {
                Main.Place.ShowFilm((int)((Time.time - start) * 4) % 8);
                await Main.Frame();
            }
            if (Main.Place) Main.Place.ShowFilm(-1);
        }

        // Dusk in the studio: Daniel's last film on the burlap screen, then out on the bluff the camera goes back into
        // Theo's hands as the light leaves the sea.
        async Awaitable Screening() => await Handover("theo", async () =>
        {
            var theo = Actor("theo");
            await Say("theo", "Daniel's camera. In my hands again.", "moved");
            await Say("theo", "I'll film again, Satria. Faces this time. Before there's nobody left to film.", "smile");
            theo.Pose = "idle";
            await Say("courier", "Father would have liked that.", "moved");
        }, async () =>
        {
            var courier = Actor("courier");
            var theo = Actor("theo");
            theo.Seat = 0;
            theo.Pose = "idle";
            var seating = Walk("courier", Anchor("screen_seat"));
            await Walk("theo", Anchor("projector"));
            theo.FaceTo(Main.Place.Find("projector").Position.x);
            theo.Pose = "crank";
            Sfx("click");
            await Wait(0.8f);
            Game.Mark("projecting");
            var rolling = Roll();
            Sfx("projector");
            await seating;
            courier.FaceAway();
            courier.Pose = "sit";
            await Look(Main.Place.Find("screen").Position + new Vector2(0, 14));
            await ShowText("The studio fills with the projector's beam and its soft rattle. On the burlap cloth, in flickering grey: Daniel, Ratih and Helen, and the whole village, laughing on the riverbank.");
            Sfx("projector");
            await Say("theo", "Daniel... Daniel never once blamed me, for leaving him in the river... Look at his smile there, Satria. He was happy. Proud to be keeping this land safe.", "moved");
            await Say("courier", "Eleven years I hated his choice to stay in this village, Mr Theo... I thought he'd thrown his future away.", "sad");
            await Say("theo", "The future isn't only where your feet take you, Satria. It's what you leave behind, in the hearts of the people you love.", "moved");
            Sfx("projector");
            await Wait(1.5f);
            Game.Mark("screened");
            await rolling;
            courier.Pose = "idle";
            theo.Pose = "idle";
            await Say("theo", "Come outside with me. The last of the light. Daniel always said it was the best for faces.");
            await Go("coast", "theo_studio_door");
            Main.Place.Bring("theo", Doorstep); // the coast was built before the film; he comes out after the courier
            await Meet("theo", Edge);
            await Look(Edge + new Vector2(20, 0));
        });
    }
}
