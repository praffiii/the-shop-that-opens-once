using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Night 6, The Deer Leather Ledger (the word: Letting Go). Marlow's sixth box, sealed M.B., holds Marcus Bell's 1952
    /// station ledger: Father's gifts of timber and cement for the bridge, its last balance blank under a red question
    /// mark. Marlow is Marcus Bell, and he sends Satria home to find Father's savings book behind the old radio. The day
    /// is spent at home, as the script has it: Valdo at the door with his final deed, turned away; at midday the radio
    /// tuned to the old station (minigame 6A) and the savings book slides out; the ledger balanced at the walnut table
    /// (minigame 6B). The evening passes at home, and at midnight the ledger goes back to Marlow in his own shop.
    /// </summary>
    public sealed class Night6 : NightChapter
    {
        /// <summary>Just inside the front door, where Valdo stands, and where the courier meets him.</summary>
        static readonly Vector2 Doorway = new(877, 430), Facing = new(851, 420);

        public Night6(Main main) : base(main) { }

        protected override int Night => 6;
        protected override string Title => "The Deer Leather Ledger";
        protected override string Word => "Letting Go";
        protected override string Page =>
            "In the city, a person's worth was their balance and their property. I thought Father unlucky, to die leaving no money behind.\n\n" +
            "Tonight, with his savings book open at nothing, I see him as the richest ant this colony ever had. He hoarded no gold. He put his whole life into the bridge that saved hundreds of his neighbours.\n\n" +
            "Letting go is not losing. It is emptying your hands, so they can hold what truly lasts.";
        protected override bool FullRoutine => true; // Nights 6 and 7 play the routine as the script writes it
        protected override string WakeLine => "...Six. One more night after this one.";
        protected override string MorningLine => "No deliveries today. Father's radio... and whatever he hid behind it.";

        /// <summary>The ledger as it came out of the box, and once it is balanced.</summary>
        protected override string Keepsake => Game.Bag.Contains("ledger_balanced") ? "ledger_balanced" : "ledger";

        protected override async Awaitable AtShop()
        {
            var fetching = FetchBox(5);
            await Say("marlow", "Six strokes. Only one box after this one, and you'll know whose that is.");
            await fetching;
            await HandOver();
            await Say("courier", "No name on the lid this time. Whose is it?", "surprised");
            await Say("marlow", "Open it.");
        }

        // Marlow is Marcus Bell, and what the blank balance means.
        protected override async Awaitable Opened()
        {
            await Say("courier", "Marcus Bell... Bellwood's station master, 1952...");
            await Say("courier", "Mr Marlow... is your real name Marcus Bell?!", "surprised");
            await Say("marlow", "Names are cloaks we wear in the world outside, Satria. Under this one I am only a witness, waiting for someone able to close this book of old accounts.", "smile");
            await Say("courier", "It's full of Father's gifts. Timber beams, cement, all for the bridge. So why is the last balance left blank, with a red question mark?");
            await Say("marlow", "Because your father never counted what he gave up for this village. But you counted it, every coin, for eleven years in the city. As a loss.", "sad");
            await Say("marlow", "Take it home. Behind your father's old radio is his savings book. Balance this record before the seventh night comes.");
            Note("Marlow is Marcus Bell, the station master of 1952. Father's savings book is behind his old radio; balance the ledger with it.", keep: true);
        }

        protected override async Awaitable ResumeDay(string checkpoint)
        {
            switch (checkpoint)
            {
                case "midday":
                    await Go("satria_home", "door");
                    Hint("Father's radio, on the side table.");
                    break;
                case "dusk":
                    await Go("satria_home", "door");
                    Hint("Wait for midnight at home, then take the ledger back to Marlow.");
                    break;
                case "midnight":
                    await Go("satria_home", "door");
                    Hint("Marlow's shop, in the grove past the station.");
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
                // the way home from the shop with Marlow's name in the bag
                case "grove" when Game.Has("boxed") && !Game.Has("doubted"):
                    Game.Mark("doubted");
                    await Scene(async () =>
                    {
                        Actor("courier").FaceTo(0);
                        await Wait(0.6f);
                        await Say("courier", "Marlow is Marcus Bell... Twenty years he's kept that gap in the roots, watching the village grow old without him.");
                        await Say("courier", "And the day after tomorrow is Day Eight. What did Father hide behind his radio? Why did he never once speak of our savings?", "sad");
                        await Say("courier", "Not a word to the market, or they'll think I've gone mad. In the morning I'll turn out Father's things myself.");
                    });
                    break;
                // midnight again, and the ledger goes back to the station master in his own shop
                case "shop" when Game.Phase == Phase.Night && Game.Bag.Contains("ledger_balanced") && !Game.Has("resolved"):
                    await Return();
                    break;
            }
        }

        protected override async Awaitable Day(string id)
        {
            switch (id)
            {
                case "radio" when Game.Phase == Phase.Morning && !Game.Has("valdo_refused"):
                    await Agent();
                    break;
                case "radio" when Game.Phase == Phase.Midday && !Game.Bag.Contains("savings_book"):
                    await Tune();
                    break;
                case "table" when Game.Phase == Phase.Midday && Game.Bag.Contains("ledger") && !Game.Bag.Contains("savings_book"):
                    await Say("courier", "Not yet. I need Father's own figures first. Marlow said behind the radio.");
                    break;
                case "table" when Game.Phase == Phase.Midday && Game.Bag.Contains("ledger"):
                    await Balance();
                    break;
                case "bed" when Game.Phase == Phase.Dusk:
                    await Midnight();
                    break;
                default:
                    await base.Day(id);
                    break;
            }
        }

        // The back of the radio is screwed tight, and Valdo is at the door with his final deed; turned away, the day
        // moves to midday.
        async Awaitable Agent()
        {
            Game.Mark("valdo_refused");
            await Scene(async () =>
            {
                var courier = Actor("courier");
                await ShowText("Father's radio. Its back panel is screwed tight, and the screws are rusted into their holes.");
                Sfx("door");
                await Wait(0.6f);
                var valdo = Bring("valdo", Doorway);
                valdo.FaceTo(Facing.x);
                await Walk("courier", Facing);
                courier.FaceTo(Doorway.x);
                await Look(Vector2.Lerp(Doorway, Facing, 0.5f));
                valdo.Held = Keepsakes.Art("contract", "xs");
                valdo.Pose = "give";
                await Say("valdo", "Time's nearly up, Mr Satria. The sugar mill's investors come up from the capital the day after tomorrow, nine sharp, at the hall.");
                await Say("valdo", "Here's the final deed. Sign it now, or this land goes to auction for the taxes nobody's paid.", "cross");
                valdo.Held = null;
                valdo.Pose = "idle";
                await Say("courier", "The deadline is yours, Mr Valdo. Day Eight, nine in the morning. That's two days yet. Don't step past my fence before then.");
                await Say("valdo", "Two days, then. Enjoy them in this ramshackle hut.", "cross");
                await Walk("valdo", Doorway + new Vector2(0, 6));
                Main.Place.Leave("valdo");
                Sfx("door");
                await Look(null);
                Note("Valdo came with his final deed. Refused: his own deadline is Day Eight, nine in the morning.");
            });
            await MovePhase(Phase.Midday);
            Checkpoint("midday");
            Hint("Father's radio. Turn it slowly.");
        }

        // The radio tuned to the old station (minigame 6A); its hum frees a compartment, and Father's savings book.
        async Awaitable Tune()
        {
            await Scene(async () =>
            {
                await Walk("courier", Main.Place.Find("radio").GlobalSpot);
                Actor("courier").FaceAway();
                await Say("courier", "Father always said the old station was at 740. If anything opens that back panel, it's him.");
            });
            await Play(new RadioTuning());
            await Scene(async () =>
            {
                await ShowText("The static melts into a warm old recording: keroncong, a violin and a plucked ukulele. Father played it every afternoon.");
                Sfx("latch");
                await ShowText("Something clicks at the back of the radio. A small book slides out of a compartment that wasn't there a moment ago.");
                await Receive("savings_book");
                await Say("courier", "Father's savings book. DANIEL, in his own hand.", "moved");
                Note("Behind the radio: Father's savings book from the village post office.");
            });
            Hint("The walnut table: balance the ledger with Father's figures.");
        }

        // The ledger balanced at the walnut table (minigame 6B); the day moves to dusk.
        async Awaitable Balance()
        {
            await Scene(async () =>
            {
                await Walk("courier", Main.Place.Find("table").GlobalSpot);
                Actor("courier").FaceAway();
                await Say("courier", "Four thousand eight hundred for the beams... and Father's wages, a year at a time.");
            });
            await Play(new LedgerBalance());
            Swap("ledger", "ledger_balanced");
            await Scene(async () =>
            {
                Sfx("stamp");
                await ShowText("The two columns meet. Marcus Bell's stamp comes up bright red: PAID IN FULL WITH FAMILY LOVE. In Father's savings book the last line reads nothing at all.");
                await Say("courier", "Ten years of his wages, every one of them in the bridge. The whole colony owes him... and he never sent anyone the bill.", "moved");
                Note("The ledger is balanced: paid in full with family love. Father's savings book is empty; he gave it all to the bridge.", keep: true);
            });
            await MovePhase(Phase.Dusk);
            Checkpoint("dusk");
            Hint("Wait for midnight at home, then take the ledger back to Marlow.");
        }

        // The evening passes at home, the one turn to night that isn't a handover: Marlow's shop opens only at midnight.
        async Awaitable Midnight()
        {
            await Scene(async () =>
            {
                await Walk("courier", Main.Place.Find("bed").GlobalSpot);
                Actor("courier").FaceTo(Main.Place.Find("bed").Position.x);
                await Say("courier", "The shop opens at midnight. I'll wait.");
                await Card("The evening passes.", "Midnight.");
                await MovePhase(Phase.Night);
                Sfx("crickets");
                await Say("courier", "Back to Marcus Bell, with his book balanced.");
            });
            Checkpoint("midnight");
            Hint("Marlow's shop, in the grove past the station.");
        }

        // At the counter Marlow waits; the ledger goes back to him, Mother's own hand is found in it, and he leaves a
        // message for Helen.
        async Awaitable Return()
        {
            await Handover("marlow", async () =>
            {
                await Say("marlow", "Paid in full. Of every ledger I kept for this station, this is the only one that ever balanced.", "moved");
                await ShowText("Behind the seal, a folded sheet that wasn't there before. The handwriting stops his breath.");
                await Say("courier", "Mother... Mother came to this shop before she died?!", "surprised");
                await Say("marlow", "Three years before she passed. She asked the shop for no wealth, no fine house, nothing at all. Only one thing.", "sad");
                await Say("marlow", "'If my son comes home one day, never tell him what to choose. Let him see with his own eyes, and feel with his own heart. The right answer always comes too late if someone else spoon-feeds it.'");
                await Say("courier", "Father emptied his whole account for the villagers' bridge... and Mother waited for me to understand what our house means.", "moved");
                await Say("marlow", "And one more thing, from the station master, not the shopkeeper. When you see Helen, tell her Marcus never stopped waiting either. Not for one day of the twenty years.", "moved");
                await Say("marlow", "Tonight you have understood the past. Tomorrow night is the seventh, and the last box opens for you alone. Go home, and ready your heart.");
            }, async () =>
            {
                var coming = Walk("marlow", Anchor("marlow"));
                await Walk("courier", Anchor("counter"));
                await coming;
                await Say("courier", "It balances, Mr Bell. Every beam of it.");
            });
        }
    }
}
