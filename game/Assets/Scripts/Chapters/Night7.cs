using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Night 7, The Unsigned Letter (the word: Choosing). The one night whose day comes first, as the script has it: Day 7
    /// wakes warm at home (a wash, tea, breakfast), Valdo makes his last push before the hall, and the village Satria's
    /// six nights brought back to life is his to walk round, with Marcus's message to give Helen. At dusk he sits at
    /// Mother's sewing table till the seventh bell; Marlow's last box is FOR THE COURIER: her walnut music box and a
    /// letter sealed in red wax. Home, the lamp and the kitchen fire lit, the music box wound (minigame 7) opens the sewing
    /// table's hidden drawer and its photo, and her letter is read; the journal's last page is written at her table, the
    /// last lantern goes out, and the front door opens on the dawn of Day 8.
    /// </summary>
    public sealed class Night7 : NightChapter
    {
        public Night7(Main main) : base(main) { }

        public override Phase StartPhase => Phase.Morning;
        protected override int Night => 7;
        protected override string Title => "The Unsigned Letter";
        protected override string Word => "Choosing";
        protected override string Page =>
            "For eleven years I thought living meant running from the past. The faster I ran, the less of it could catch me.\n\n" +
            "Tonight Mother set me free. Not by asking me to stay, but by letting me choose.\n\n" +
            "Freedom isn't having nowhere to belong. It is the courage to choose where to moor your heart.\n\n" +
            "I am Satria, son of Daniel and Ratih. And tonight... I have made my choice.";
        protected override bool FullRoutine => true;
        protected override bool DayFirst => true;
        protected override string WakeLine => "The last morning. The house isn't cold any more. It feels... lived in.";
        protected override string Keepsake => "musicbox";

        /// <summary>Ratih's letter, a page at a time.</summary>
        static readonly string[] Letter =
        {
            "If this letter has found you, then you have come home, and Mr Marlow has kept his word.\n\n" +
            "I never asked you to come back, and I was never angry that you left. You were seventeen, and the city bus was waiting. A young ant has to try his wings.\n\n" +
            "But there is something your father and I never told you.",
            "Twenty years ago there was a place waiting for your father at the city's central workshop. The house was packed, the furniture covered, our cases by the door. On the night of the storm we stood on the platform with the special train's tickets in our hands, every coin we had saved.\n\n" +
            "Then the neighbours came. The bridge was down, and two orphans from the estuary had no seats. Your father looked at me and said, 'Just a little while, Ratih.'",
            "We gave them our tickets. That little while became ten years, then twenty, to the end of his life, and we never regretted it. Not for one day.\n\n" +
            "Don't think we chose the village over your future, my son. We chose it because our hearts were already here.",
            "Now it is your turn to choose. If you want to sell, sell without guilt. We live on in your courage, not in these walls.\n\n" +
            "And if you stay, stay because you have found a reason to love your own life here.\n\n" +
            "The choice is wholly yours.\n\n" +
            "Your mother,\nRatih",
        };

        // The seventh morning: woken warm in bed by the light, not the bell; the night's box comes at the day's end.
        public override async Awaitable Start()
        {
            Know();
            await Card($"{Lang.F("Night {0}", Night)}: {Title}", Lang.F("Day {0}, morning.", Night));
            await Go("satria_home", "bed");
            await Scene(async () =>
            {
                var courier = LieDown();
                Sfx("wind");
                await Wait(1f);
                courier.Pose = "wake";
                await Wait(0.8f);
                GetUp();
                await Say("courier", WakeLine, "smile");
            });
            Hint("A wash at the water jar, tea on the stove, breakfast at the table.");
        }

        protected override async Awaitable ResumeDay(string checkpoint)
        {
            switch (checkpoint)
            {
                case "midday":
                    await Go("square", "from_east");
                    Hint("A last round of the village: Helen and the Mender, Sam and Mia, Pip and Leo, Theo.");
                    break;
                case "night":
                    await Go("satria_home", "door");
                    Hint("Marlow's shop, for the last time.");
                    break;
                case "dawn":
                    await Go("satria_home", "door");
                    Hint("The front door. It's nearly dawn.");
                    break;
                default:
                    await Start();
                    break;
            }
        }

        // The last box was for him: Marlow fetches it from the emptied cabinet.
        protected override async Awaitable AtShop()
        {
            var fetching = FetchBox(6);
            await Say("courier", "Six boxes, every one opened and empty. Where do they all go, Mr Marlow?");
            await Say("marlow", "Home. They never lived here, Satria. They only waited for someone brave enough to carry them. Tonight every trust has arrived but one.", "smile");
            await fetching;
            await HandOver();
            await ShowText("Coconut fronds carved over its lid, and cut into its front: FOR THE COURIER.");
            await Say("courier", "This one... is for me?", "surprised");
            await Say("marlow", "Open it.");
        }

        // The letter under the music box, and Marlow's last words; the shop will never open again.
        protected override async Awaitable Opened()
        {
            await ShowText("Under the music box lies a thick envelope sealed in red wax. No name on it, and no sender. It smells of dried lavender.");
            await Receive("letter");
            await Say("marlow", "Take it home. Set it on your mother's sewing table, light the lamp and the kitchen fire, and read the letter where you first learned to love life.");
            await Say("marlow", "Tonight your work as the courier of the gap in time is done. This shop will never open its door again.", "sad");
            Actor("courier").Pose = "moved";
            await Say("courier", "Thank you, Mr Marlow. For keeping our village, all these twenty years.", "moved");
            Actor("courier").Pose = "idle";
            await Say("marlow", "Not I. The ones who chose to stay and care kept it alive. Go on, now. Home.", "smile");
            Note("The last box was mine: Mother's walnut music box and a sealed letter. Set it on her sewing table, light the lamp and the fire, then read.", keep: true);
        }

        protected override async Awaitable Arrived(string place)
        {
            switch (place)
            {
                case "square" when Game.Phase == Phase.Morning && !Game.Has("valdo_last"):
                    Hint("Valdo, pacing before the hall.");
                    break;
                case "satria_home" when Game.Phase == Phase.Midday && !Game.Has("told_helen"):
                    await Say("courier", "Not home yet. Marcus's message for Helen is still mine to carry.");
                    Hint("Helen, at her tea stall on the platform.");
                    break;
                case "satria_home" when Game.Phase == Phase.Midday:
                    await Sit();
                    break;
                // home from the last box to a dark house
                case "satria_home" when Game.Phase == Phase.Night && Game.Has("boxed") && !Game.Has("cold_seen"):
                    Game.Mark("cold_seen");
                    await ShowText("The desk lamp unlit, no fire in the stove. The house has waited two years for someone to warm it.");
                    Hint("The lamp on the desk and the kitchen fire, as Marlow said. Then Mother's sewing machine.");
                    break;
                case "east" when Game.Phase == Phase.Night && Game.Has("chosen"):
                    await Dawn();
                    break;
            }
        }

        protected override async Awaitable Day(string id)
        {
            var home = Game.Phase == Phase.Night && Game.Has("boxed");
            switch (id)
            {
                case "water_jar" when Game.Phase == Phase.Morning && !Game.Has("washed"):
                    await Scene(Wash);
                    break;
                case "valdo" when Game.Phase == Phase.Morning && !Game.Has("valdo_last"):
                    await LastPush();
                    break;
                case "table" when Game.Phase == Phase.Morning && !Game.Has("breakfast"):
                    await Scene(Breakfast);
                    break;
                case "helen" or "mender" or "sam" or "mia" or "baker" or "pip" or "leo" or "theo" when Game.Phase == Phase.Midday && !Game.Has($"round_{id}"):
                    Game.Mark($"round_{id}");
                    await Scene(() => Round(id));
                    break;
                case "desk" when home && !Game.Has("lit_lamp"):
                    await Scene(() => Light("desk", "lit_lamp", "A match to the wick. The oil lamp's glow climbs the wall to the window."));
                    break;
                case "stove" when home && !Game.Has("lit_fire"):
                    await Scene(() => Light("stove", "lit_fire", "Dry wood and a match, and the kitchen fire catches. Golden flames drive out the cold that has filled the house for two years."));
                    break;
                case "sewing" when home && !(Game.Has("lit_lamp") && Game.Has("lit_fire")):
                    await Say("courier", "The lamp and the fire first. Marlow said.");
                    break;
                case "sewing" when home && !Game.Has("chosen"):
                    await Melody();
                    break;
                default:
                    await base.Day(id);
                    break;
            }
        }

        async Awaitable Wash()
        {
            var courier = Actor("courier");
            await Walk("courier", Main.Place.Find("water_jar").GlobalSpot);
            courier.FaceAway();
            Sfx("pour");
            await Wait(0.6f);
            courier.FaceTo(courier.Feet.x + 8);
            courier.Pose = "wash";
            await Wait(1.2f);
            courier.Pose = "idle";
            Game.Mark("washed");
            await ShowText("Mountain water from the clay jar, in the coconut-shell dipper, over his face and antennae. Cold, and clean.");
        }

        // Breakfast at Mother's table, then the cap and the bag, and out to see what six days have done.
        async Awaitable Breakfast()
        {
            var courier = Actor("courier");
            await Walk("courier", Main.Place.Find("table").GlobalSpot);
            courier.FaceAway();
            Sfx("tea");
            await Wait(0.8f);
            courier.FaceTo(courier.Feet.x - 8);
            courier.Pose = "drink";
            await Wait(1.2f);
            courier.Pose = "idle";
            Game.Mark("breakfast");
            await ShowText("The Baker's wheat bread with the rest of the tea, at Mother's walnut table. The house is quiet, but not empty.");
            Sfx("rustle");
            await Say("courier", "Cap straight. Bag on. Let's see what six days have done.", "smile");
            Hint("Out into the village. Valdo will be waiting at the square.");
        }

        // Before the hall, Valdo's last push: tomorrow at nine the investors sign. Stood up to, he stalks off, and the day
        // is Satria's.
        async Awaitable LastPush()
        {
            Game.Mark("valdo_last");
            await Scene(async () =>
            {
                var courier = Actor("courier");
                var valdo = Actor("valdo");
                var at = courier.Feet + new Vector2(28, -2);
                await Walk("valdo", at);
                valdo.FaceTo(courier.Feet.x);
                courier.FaceTo(at.x);
                valdo.Held = Keepsakes.Art("contract", "xs");
                await Say("valdo", "Twenty-four hours, Mr Satria. The investors from the capital are on tonight's bus, and tomorrow at nine sharp they sign the deed here at the hall, before the district notary.", "cross");
                var pacing = Walk("valdo", at + new Vector2(24, 0));
                await Say("valdo", "This is your last chance. Clear your motorbike debts in the city and walk away with cash in your pocket.");
                await pacing;
                pacing = Walk("valdo", at);
                await Say("courier", "The deadline in your own draft is tomorrow at nine, Mr Valdo. So today is still mine.");
                await pacing;
                valdo.FaceTo(courier.Feet.x);
                await Say("valdo", "Don't be stubborn. This village is dead. The young have all gone to the city, and the old are only waiting.", "cross");
                await Say("courier", "Bellwood never died, Mr Valdo. Only the eyes of people who price a place by the metre did.");
                await Say("valdo", "Nine o'clock. Not one minute after.", "cross");
                valdo.Held = null;
                await Walk("valdo", at + new Vector2(90, 0));
                Main.Place.Leave("valdo");
                Note("Valdo's last push: the investors sign tomorrow at nine, at the hall. Today is still mine.");
            });
            await MovePhase(Phase.Midday);
            Checkpoint("midday");
            Hint("A last round of the village: Helen and the Mender, Sam and Mia, Pip and Leo, Theo.");
        }

        // A last round of the village his six nights brought back to life; Helen hears Marcus's message.
        async Awaitable Round(string id)
        {
            var who = Actor(id);
            // beside them, a step clear of their work, as in the nights' handovers
            var spot = Main.Place.Find(id).GlobalSpot;
            var side = spot.x - who.Feet.x;
            if (Mathf.Abs(spot.y - who.Feet.y) < 8) spot.x = who.Feet.x + (side < 0 ? -1 : 1) * Mathf.Max(Mathf.Abs(side), Beside.x);
            await Walk("courier", spot);
            who.FaceTo(Actor("courier").Feet.x);
            Actor("courier").FaceTo(who.Feet.x);
            switch (id)
            {
                case "helen":
                    await Say("helen", "Stop a while, Satria! Since Marcus's watch ticks again I don't feel lonely waiting here. I pour a free cup for anyone passing now. Life's too lovely to spend mourning.", "smile");
                    await Say("courier", "Helen, I've one more thing for you. Not in the bag. Marcus asked me to tell you he never stopped waiting either. Not for one day of the twenty years.");
                    who.Pose = "moved";
                    await Say("helen", "...Then neither of us was ever waiting alone.", "moved");
                    who.Pose = "idle";
                    await Say("helen", "I won't ask how you know, love. Some letters come by roads no one else can walk.", "smile");
                    Game.Mark("told_helen");
                    Note("Helen has Marcus's message: he never stopped waiting either.");
                    break;
                case "mender":
                    who.Pose = "hammer";
                    await Say("mender", "We all owe a debt to your steadfast heart, young courier!", "smile");
                    await Say("mender", "And she's ready, this old engine. Every bearing. All she wants is a reason to roll.");
                    break;
                case "sam":
                    await Say("sam", "History isn't locked in a damp cellar any more, Satria. The truth of what your parents gave has freed this colony from a guilt it never owed.", "smile");
                    break;
                case "mia":
                    await Say("mia", "Thank you, Satria. You gave my son back his laugh.", "moved");
                    break;
                case "baker":
                    await Say("baker", "Come by tomorrow, courier. Whatever happens at nine, there'll be warm bread after.", "smile");
                    break;
                case "pip":
                    await Say("pip", "Satria! Mochi flew on the swing, really high! And I slept the whole night in the dark and didn't cry once!", "smile");
                    await Say("pip", "Mochi says Mrs Ratih sends her love. On the chamomile. You can smell it.");
                    break;
                case "leo":
                    await Say("leo", "Look at me, Satria. My legs don't ache from bitterness any more.", "smile");
                    await Say("leo", "The youngsters are coming up the hill at dawn tomorrow. I'm going to teach them how to step forward.");
                    break;
                case "theo":
                    await Say("theo", "I'm printing your father's reels for the hall's wall. The young ones will see their own grandparents, shoulder to shoulder at the bridge posts.", "smile");
                    await Say("theo", "They'll be proud to call themselves Bellwood's children. As they should.");
                    break;
            }
        }

        // Home at the round's end: dusk at Mother's sewing table, his eyes closed, till the seventh bell.
        async Awaitable Sit()
        {
            await Scene(async () =>
            {
                var courier = Actor("courier");
                var table = Main.Place.Find("sewing");
                await Walk("courier", table.GlobalSpot);
                courier.FaceTo(table.Position.x);
                courier.Pose = "sit";
                courier.Held = Keepsakes.Art("contract", "xs");
                await MovePhase(Phase.Dusk, watched: true);
                await ShowText("Purple dusk creeps over the house. He sits down on the floor before Mother's sewing machine, Valdo's draft in his hands.");
                await Say("courier", "Tomorrow at nine. Whatever I choose, I'll choose it here.");
                await ShowText("He closes his eyes, to wait for the last midnight bell.");
                await MovePhase(Phase.Night, watched: true);
                Sfx("crickets");
                await Wait(1f);
                await BellStrikes(Night);
                courier.Held = null;
                courier.Pose = "idle";
                await Say("courier", "Seven. The last box.", "surprised");
            });
            Checkpoint("night");
            Hint("Marlow's shop, for the last time.");
        }

        // The lamp or the stove lit at night, as Marlow said: the house warms.
        async Awaitable Light(string id, string flag, string text)
        {
            var courier = Actor("courier");
            var at = Main.Place.Find(id);
            await Walk("courier", at.GlobalSpot);
            courier.FaceTo(at.Position.x);
            courier.Pose = "strike";
            Sfx("match");
            await Wait(0.8f);
            Game.Mark(flag);
            Main.Place.FollowStory();
            courier.Pose = "idle";
            await ShowText(text);
            if (Game.Has("lit_lamp") && Game.Has("lit_fire")) Hint("Mother's sewing machine.");
        }

        // The music box wound on Mother's table (minigame 7), the hidden drawer and its photo, her letter read, and the
        // last page of the journal; the last lantern goes out.
        async Awaitable Melody()
        {
            var courier = Actor("courier");
            var table = Main.Place.Find("sewing");
            await Scene(async () =>
            {
                await Walk("courier", table.GlobalSpot);
                courier.FaceTo(table.Position.x);
                await ShowText("He sets the walnut music box on Mother's sewing table. Its little brass crank is stiff with the years.");
                await Say("courier", "Gently, the way she played it. Three turns.");
            });
            await Play(new MusicBoxCrank());
            Swap("musicbox", "musicbox_open");
            await Scene(async () =>
            {
                courier.FaceTo(table.Position.x);
                Sfx("lullaby");
                await ShowText("Three long notes, two short, a peaceful rest, and again. Mother's lullaby, the one she hummed over this table.");
                Sfx("drawer");
                await ShowText("Under the table something clicks, and a drawer he never knew was there slides out on a spring.");
                Main.Talk.Close();
                await Main.Reveal.Show("photo");
                Game.Bag.Add("photo");
                await Say("courier", "Father, Mother and me, laughing over grilled corn in the kitchen... Theo took this, and never said.", "moved");
                Sfx("seal");
                await ShowText("He breaks the red wax seal.");
                Music("letter");
                Sfx("unfold");
                for (var i = 0; i < Letter.Length; i++) await Main.ShowJournal(i == 0 ? "Satria, my dearest son," : $"\u00b7 {i + 1} \u00b7", Letter[i], pen: false);
                Swap("letter", "letter_read");
                courier.Pose = "moved";
                await ShowText("His tears fall on the walnut. He holds the letter to his chest, and the warmth that has been missing for eleven years is there.");
                await Wait(0.8f);
                courier.Pose = "write";
                Sfx("pen");
                await Wait(1f);
                await Main.ShowJournal(Lang.F("Day Seven: {0}", Lang.T(Word)), Page);
                courier.Pose = "idle";
                await ShowText("He folds Mother's letter into the bag's inmost pocket, near his heart.");
                await LanternGoesOut();
                Note("Mother's letter: they almost left on the special train, gave their tickets to two orphans, stayed, and never regretted it. The choice is mine.", keep: true);
            });
            Game.Mark("chosen");
            Checkpoint("dawn");
            Hint("The front door. It's nearly dawn.");
        }

        // The front door opened on the dawn of Day 8, and on to the morning after.
        async Awaitable Dawn()
        {
            await Scene(async () =>
            {
                Actor("courier").FaceTo(Actor("courier").Feet.x + 8);
                await MovePhase(Phase.Morning, watched: true);
                Sfx("wind");
                await ShowText("The eastern sky splits gold over Bellwood's hills, and the sea wind comes up the valley to meet him.");
                await Say("courier", "Morning, Bellwood.", "smile");
            });
            await Main.EndChapter();
        }
    }
}
