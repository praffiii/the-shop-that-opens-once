using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Night 1, The Stopped Watch (the word: Waiting). Marlow's first box holds a railway watch stopped at 10:17, its
    /// back burnt black, carved only "H". In the morning square the gossip is of trembling rails; Valdo scorns the watch
    /// as scrap, and Mia sends Satria to the Baker, whose family knew the railway men. In his bakery the Baker wants his
    /// flour sifted and his dough kneaded first (minigame 1A), then sends a sweet loaf to trade with Arlo at the jetty
    /// for damar oil, and the watch to the Mender. At midday in the forge the oil lifts the soot (M.B. on the back), the
    /// wheels are seated and the pendulum set going (minigame 1B), and the sprung back shows its engraving to Helen. At
    /// dusk Satria lights the platform's three lanterns with the Mender's oil lantern and sits by Helen on her bench; she
    /// remembers the storm of 1952, played as a sepia memory, and at last stops waiting.
    /// </summary>
    public sealed class Night1 : NightChapter
    {
        /// <summary>Helen's bench on the platform, where Satria sits beside her, and the memory's places on it in 1952.</summary>
        static readonly Vector2 BesideHelen = new(452, 277), Platform = new(470, 296);

        public Night1(Main main) : base(main) { }

        protected override int Night => 1;
        protected override string Title => "The Stopped Watch";
        protected override string Word => "Waiting";
        protected override string Page =>
            "Eleven years in the city, and I always believed my parents were the ones who failed: poor ants stuck in a far village, never lucky enough to buy a ticket to the future. Tonight Aunt Helen showed me how wrong I was.\n\n" +
            "They had the tickets in their hands. They could have climbed into a dry carriage and gone. But when the bridge went down and the neighbours screamed, Mother set down her case and chose the mud.\n\n" +
            "Waiting too long isn't faithfulness. It's how we run from the fact that life has to be lived. Tonight Helen made her peace. And for the first time in eleven years, I'm starting to see this house differently.";
        protected override string WakeLine => "...A bell? At this hour? There's a light out there, past the station.";
        protected override string MorningLine => "Morning. Tea first. Then find out who \"H\" is, quietly.";
        protected override string DayErrand => "The square. Find out who \"H\" is, quietly.";

        /// <summary>The watch as the day has left it: burnt black, cleaned, then ticking.</summary>
        protected override string Keepsake => Game.Bag.Contains("watch_ticking") ? "watch_ticking" : Game.Bag.Contains("watch_clean") ? "watch_clean" : "watch";

        protected override string Asking => "Do you know whose watch this is?";

        // Asked round about the watch: the railway men's friends point to the Baker, the line's old hands to the Mender.
        static readonly Dictionary<string, Reaction> Asked = new()
        {
            ["pip"] = new("A railway watch! The Baker's always going on about the railway men from before. He'd know!", "surprised", "Pip: the Baker is always going on about the old railway men."),
            ["sam"] = new("Platform service issue, by the case. The hall has the staff lists somewhere, but the Baker's family knew those men in person.", "neutral", "Sam: the Baker's family knew the railway men in person."),
            ["florist"] = new("Phew. It smells like the night the substation went up. Burnt wire. Keep it away from my flowers, love."),
            ["shopper"] = new("\"H\"? Half this village is H-something. The Baker's father fed every railwayman on the line, though. Ask him.", "smile", "The shopper: the Baker's father fed every railwayman on the line."),
            ["breadboy"] = new("That's the smell from the bakery's back shed! The Baker keeps his father's old railway lamp in there.", "surprised"),
            ["porter"] = new("Railway issue, that. Before my time. The Mender at the forge still keeps the old line's tools, though.", "neutral", "The porter: the Mender at the forge keeps the old line's tools."),
            ["bram"] = new("A platform watch... We were all issued one. I handed mine back the day they closed the line.", "sad"),
            ["leo"] = new("Ten-seventeen. That's when the night train used to come through. Strange hour for a watch to stop.", "sad"),
            ["nora"] = new("Oh, child. The storm of fifty-two left a lot of things like that. A stopped clock in every house.", "sad"),
            ["theo"] = new("...Put it away. I don't look at old things any more.", "sad"),
            ["arlo"] = new("Burnt like that, it's been through a fire, or a storm. The sea gives back all sorts, but not that."),
            ["fisher"] = new("Railway, that is. The line ran right down to the jetty once. Ask up at the station end."),
            ["salter"] = new("The salt would've eaten it, if it had been down here. That's a fire's doing, not the sea's."),
            ["gardener"] = new("Couldn't tell you, son. Ask someone who still rides the trains in his sleep. The Baker, say.", "smile"),
            ["farmhand"] = new("Never owned a watch. The sun does me fine.", "smile"),
            ["herder"] = new("My aphids keep better time than that thing.", "smile"),
        };
        protected override Dictionary<string, Reaction> Reactions => Asked;

        protected override string Sending => "Before the next dusk, mind. Every soul is given one chance to understand its homecoming.";

        // The first night: Marlow, who has been waiting, and the rule of the seven nights.
        protected override async Awaitable AtShop()
        {
            await Say("marlow", "You're twelve minutes late.");
            await Say("courier", "Who... who are you? Since when has there been a shop in these roots? This afternoon it was bushes!", "surprised");
            await Say("marlow", "I'm Marlow. The keeper.");
            Known("marlow", "Marlow");
            await Say("courier", "Keeper of what?");
            var fetching = FetchBox(0);
            await Say("marlow", "Of what the village left behind, when it hurried to run from its own memories.");
            await Say("courier", "I'm a courier from the city, Mr Marlow. I came home to settle a deed, not to collect antiques.");
            await fetching;
            await Say("marlow", "I know. That's why it's you. Your feet are used to walking, and your hands to carrying what's entrusted to them. Deliver this.");
            await HandOver();
            await Say("courier", "Now, past midnight? There's only one letter carved on the lid: H. Who in this village...", "surprised");
            await Say("marlow", "This shop never opens for those who only want to remember, Satria. It opens for those who come home meaning to leave something. The door opens for seven nights. There is no eighth.");
            await Say("marlow", "Open it.");
        }

        public override string Closed(string id) => id switch
        {
            "bakery_door" or "forge_door" when Game.Phase == Phase.Night => "Shut for the night.",
            "to_coast" when Game.Phase == Phase.Night => Game.Has("boxed") ? "Home. It will keep till morning." : "Not tonight. The bell came from the station way.",
            _ => base.Closed(id),
        };

        protected override async Awaitable ResumeDay(string checkpoint)
        {
            switch (checkpoint)
            {
                case "midday":
                    await Go("bakery", "door");
                    Hint("Arlo is down at the coast. The loaf is for his damar oil.");
                    break;
                case "dusk":
                    await Go("forge", "door");
                    Hint("Helen sits on the platform's end bench at dusk. Light the lanterns first.");
                    break;
                default:
                    await Start();
                    break;
            }
        }

        protected override async Awaitable Arrived(string place)
        {
            switch (place)
            {
                // out of the shop, the box in his bag: was it real, and nobody must know
                case "grove" when Game.Has("boxed") && !Game.Has("doubted"):
                    Game.Mark("doubted");
                    await Scene(async () =>
                    {
                        Actor("courier").FaceTo(0);
                        await Wait(0.6f);
                        await ShowText("The shop door shuts behind him with a soft click. When he turns, there is only the banyan's dark tangle of roots.");
                        await Say("courier", "What was that...? Am I dreaming on my feet? Eight hours on a shaking bus would do it.");
                        await Say("courier", "But the box is real. Cold, hard at the corners. The watch inside weighs like a lump of lead.");
                        await Say("courier", "If I tell Aunt Helen or the Baker, they'll say Satria's come home with his head on crooked. Nobody can know. I'm a professional. I'll find who \"H\" is, quietly.");
                    });
                    break;
                // the morning market's gossip, overheard
                case "square" when Game.Phase == Phase.Morning && !Game.Has("rumour"):
                    Game.Mark("rumour");
                    await Say("mia", "They say the old station's rails still tremble on their own, some nights... and the last engine buried by the landslide twenty years ago!");
                    await Say("shopper", "Oh, that's only the tide hitting the cliff rocks, Mia.");
                    Hint("Someone in the square might know whose watch this is. Show it round.");
                    break;
            }
        }

        protected override async Awaitable Day(string id)
        {
            switch (id)
            {
                case "valdo" when !Game.Has("asked_valdo"):
                    Game.Mark("asked_valdo");
                    await Say("courier", "Morning, Mr Valdo. Do you know anyone in the village with an old pocket watch, marked \"H\"?");
                    await Say("valdo", "Good heavens, Mr Satria. You show me a scorched lump of scrap? Some railway porter's junk, long run off or dead. It wouldn't pawn for ten coins.", "cross");
                    await Say("valdo", "Don't waste your time on rubbish. Measure your yard's boundary instead. The investors want a precise plan.", "smile");
                    break;
                case "mia" when Game.Phase == Phase.Morning && !Game.Has("asked_mia"):
                    Game.Mark("asked_mia");
                    await Say("courier", "Mia, excuse me. Do you know who owns an old watch like this one?");
                    await Say("mia", "Oh, very official, isn't it... \"H\"? Haji Mansur the rice merchant, across the river? No, he wears a gold one on a fat chain.", "surprised");
                    await Say("mia", "Wait. A silver one like this, and it smells of burnt wire, like the station's old transformer. Ask the Baker at the bakery. His family were thick as thieves with the railway men, before he took up bread.", "smile");
                    Note("Mia thinks the Baker will know the watch: his family were close to the railway men.");
                    break;
                case "baker" when Game.Phase == Phase.Morning && !Game.Has("kneaded"):
                    await Baker();
                    break;
                case "arlo" when Game.Bag.Contains("bread"):
                    await Arlo();
                    break;
                case "arlo" when Game.Phase == Phase.Midday && Game.Has("kneaded"):
                    await Say("arlo", "Damar oil? I've a bottle in the boat stores. A man works up an appetite out here, though...", "smile");
                    break;
                case "mender" when Game.Bag.Contains("damar_oil"):
                    await Mender();
                    break;
                case "mender" when Game.Has("kneaded") && !Game.Bag.Contains("watch_ticking"):
                    await Say("mender", "Burnt shell? Soot like that wants damar oil before I touch it. Arlo keeps some on his boat.");
                    break;
                case "lantern_post_0" or "lantern_post_1" or "lantern_post_2" when Game.Bag.Contains("oil_lantern") && !Game.Has(id):
                    await LightLantern(id);
                    break;
                case "helen" when Game.Phase == Phase.Dusk && Game.Bag.Contains("watch_ticking"):
                    if (!Lit()) await Say("courier", "It's pitch dark down this end. The lanterns first. She shouldn't see this in the dark.");
                    else await Helen();
                    break;
                default:
                    await base.Day(id);
                    break;
            }
        }

        static bool Lit() => Game.Has("lantern_post_0") && Game.Has("lantern_post_1") && Game.Has("lantern_post_2");

        // In his bakery the Baker knows the watch by its smell, and wants his breakfast orders done before he says more.
        async Awaitable Baker()
        {
            if (!Game.Has("asked_baker"))
            {
                Game.Mark("asked_baker");
                await Scene(async () =>
                {
                    var baker = Actor("baker");
                    await Meet("baker", Anchor("knead"));
                    await Say("courier", Game.Has("asked_mia") ? "Mr Baker, Mia says you know the old things from the station?" : "Mr Baker, do you know whose watch this is?");
                    baker.Held = Keepsakes.Art("watch", "xs", "scorched");
                    baker.Pose = "receive";
                    await Wait(0.6f);
                    await Say("baker", "Hmm! Sulphur and burnt ozone... This is a platform service watch, from the days of the steam railway. I knew the man who wore one like it.", "surprised");
                    baker.Held = null;
                    baker.Pose = "idle";
                    await Say("baker", "But my hands are cramped, and the hall's breakfast orders aren't sifted or kneaded yet! Help me first, then I'll talk.", "smile");
                });
            }
            else await Say("baker", "Back to the basin, then? The flour won't sift itself.", "smile");
            await Play(new BakerKnead());
            Game.Mark("kneaded");
            await Scene(async () =>
            {
                var courier = Actor("courier");
                var baker = Actor("baker");
                baker.FaceTo(courier.Feet.x);
                await Say("baker", "Well done! Quick hands, courier's hands!", "smile");
                await Say("baker", "Now, that watch. The black on its back is no ordinary dirt. It's burnt cable resin, and only damar oil softens it.");
                courier.FaceTo(baker.Feet.x);
                await Receive("bread");
                await Say("baker", "Take this sweet loaf, still warm, to Arlo at the jetty and trade it for a bottle of his damar oil. Then take the watch to the Mender at the railway forge.");
                Note("The Baker: trade his sweet loaf with Arlo at the jetty for damar oil, then take the watch to the Mender.");
            });
            await MovePhase(Phase.Midday);
            Checkpoint("midday");
            Hint("Down to the coast: Arlo is at the jetty.");
        }

        // At the jetty Arlo takes the loaf for a bottle of damar oil.
        async Awaitable Arlo()
        {
            await Scene(async () =>
            {
                await Say("courier", "Arlo! The Baker sends this, still warm. He says you might part with some damar oil for it.");
                await Trade("arlo", "bread", "damar_oil");
                await Say("arlo", "The Baker's sweet loaf? For that, take the whole bottle. Damar from the boat stores. It softens anything the sea or a fire has hardened.", "smile");
                Note("Arlo traded his damar oil for the Baker's loaf.");
            });
            Hint("The Mender's forge is by the line, below the platform.");
        }

        // In the forge the Mender cleans the watch with the oil, and they seat its wheels on the gear bench; its back
        // springs open on its engraving, and he knows who it is for.
        async Awaitable Mender()
        {
            await Scene(async () =>
            {
                var mender = Actor("mender");
                await Meet("mender", Anchor("bench"));
                await Say("courier", "Mender. The Baker sent me. The watch's back is burnt black, and here's damar oil from Arlo.");
                Game.Bag.Remove("damar_oil");
                mender.Held = Keepsakes.Art("watch", "xs", "scorched");
                mender.Pose = "tinker";
                Sfx("oil");
                await Wait(1.2f);
                Swap("watch", "watch_clean");
                mender.Held = Keepsakes.Art("watch_clean", "xs");
                await Say("mender", "Srrk... srrk... see? The crust comes away clean as an onion skin. M.B., on the back.");
                await Say("mender", "But hold it to your ear, Satria. Silent. The escape wheel's slipped and the hairspring's jammed, from a hard knock twenty years ago. Let's take it apart on the gear bench.");
                mender.Pose = "idle";
            });
            await Play(new ClockworkAlign());
            await Scene(async () =>
            {
                var mender = Actor("mender");
                var courier = Actor("courier");
                Sfx("ticktock");
                await Wait(1.6f);
                Swap("watch_clean", "watch_ticking");
                mender.Held = Keepsakes.Art("watch_ticking", "xs", "open");
                await ShowText("Tick, tock. Tick, tock. The watch is alive again, and its back springs open on a fine engraving inside the silver lid:");
                await ShowText("\"For Helen. Don't wait for me at the station if the storm won't ease. M.\"");
                await Say("mender", "Satria... Helen. That's Aunt Helen, your mother's dear friend.", "moved");
                await Say("mender", "But don't go to her stall in the noise of the day. Every evening at dusk she sits alone on the bench at the dead platform's end.");
                mender.Held = null;
                mender.FaceTo(courier.Feet.x);
                courier.FaceTo(mender.Feet.x);
                await Receive("oil_lantern");
                await Say("mender", "Take this oil lantern. The platform's been pitch dark since the storm brought its poles down, twenty years back.");
                Note("Helen sits on the bench at the platform's end every evening at dusk.", keep: true);
            });
            await MovePhase(Phase.Dusk);
            Checkpoint("dusk");
            Hint("The platform's three lanterns, then Helen on her bench.");
        }

        // One of the platform's old oil lanterns, lit from the Mender's.
        async Awaitable LightLantern(string id)
        {
            var courier = Actor("courier");
            courier.FaceAway();
            courier.Pose = "strike";
            Sfx("flare");
            await Wait(0.7f);
            courier.Pose = "idle";
            Game.Mark(id);
            Main.Place.FollowStory();
            if (Lit())
            {
                await ShowText("Three lanterns along the platform. Their yellow light finds the mossy rails, and the bench where Helen sits.");
                Hint("Sit with Helen.");
            }
        }

        // Dusk on the platform: the watch for Helen, what she remembers of the storm, and at last the end of waiting.
        async Awaitable Helen() => await Handover("helen", async () =>
        {
            var helen = Actor("helen");
            Sfx("ticktock");
            await Say("helen", "This... this is Marcus's watch! Marcus's! The hands still at 10:17... and it's ticking? Where did you find this, Satria? It was lost the night of the storm, twenty years ago!", "surprised");
            await Say("courier", "From The Shop That Opens Once. Mr Marlow gave it to me in the banyan's roots, at midnight.");
            await Say("helen", "That shop... so it's real...", "moved");
            await Say("helen", "The night of the great storm, I stood on this platform waiting for your mother, Ratih. The night train's tickets in my pocket, the house packed, our cases beside us. We were going to the capital together...", "moved");
            await Say("helen", "Then at 10:17, as the whistle blew, the river bridge went down in the flood. We could hear people crying for help from here. Your mother looked at her case, then at me...", "sad");
            await Memory(async () =>
            {
                Known("young_helen", "Helen");
                Known("mother", "Ratih");
                var young = Bring("young_helen", Platform);
                var ratih = Bring("mother", Platform + new Vector2(34, 0));
                young.FaceTo(ratih.Feet.x);
                ratih.FaceTo(young.Feet.x);
                await Look(Platform + new Vector2(17, -8));
                Sfx("rain");
                await Wait(0.8f);
                Sfx("whistle");
                await Wait(1.4f);
                ratih.FaceTo(900);
                await Wait(0.8f);
                ratih.FaceTo(young.Feet.x);
                await Say("mother", "Just a moment, Helen. Only a moment. I have to help them first.", "sad");
                var going = Walk("mother", Platform + new Vector2(170, 0));
                await Say("young_helen", "Ratih...!", "surprised");
                await going;
                Sfx("rain");
                await Wait(1.2f);
            });
            await Look(BesideHelen);
            await Say("courier", "And the night train left without them?");
            await Say("helen", "It did. And the hill came down at the bend and buried the line, and Marcus with it.", "sad");
            await Say("helen", "Twenty years, Satria. Twenty years I've sat on this dead platform every evening, waiting for the right time to go... until I understood life never waits for anyone who hesitates.", "sad");
            await Say("helen", "Your parents never failed to leave, Satria. They had the tickets in their hands. They chose to stay, for other people.", "moved");
            helen.Pose = "moved";
            await Say("helen", "Thank you, Satria... Tonight, at last, I can stop waiting.", "moved");
            var courier = Actor("courier");
            courier.Seat = 0;
            courier.Pose = "idle";
            courier.Feet = BesideHelen + new Vector2(0, 8);
        }, async () =>
        {
            var helen = Actor("helen");
            var courier = Actor("courier");
            await Look(BesideHelen);
            await Walk("courier", BesideHelen + new Vector2(0, 2));
            courier.Feet = BesideHelen;
            courier.Seat = 9;
            courier.Pose = "sit";
            courier.FaceTo(helen.Feet.x);
            Sfx("bed");
            await Say("courier", "Evening, Aunt Helen.");
            helen.FaceTo(courier.Feet.x);
            await Say("helen", "Satria? What are you doing at this dead station so late, love? It's cold here. It gets into your joints.", "surprised");
            await Say("courier", "I've something for you. It was entrusted to me.");
        });
    }
}
