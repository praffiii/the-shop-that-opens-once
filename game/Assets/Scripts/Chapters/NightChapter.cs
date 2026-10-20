using UnityEngine;

namespace Shop
{
    /// <summary>
    /// What every night shares, so a night's own class holds only its story (GDD's nightly routine):
    /// the night's card and the midnight bell waking Satria in bed; the walk to Marlow's shop, where the night's box is
    /// handed over (<see cref="AtShop"/>); home again, the routine before sleep (the first night each step its own
    /// press: the box on the table, a wash at the water jar, the coil lit, the bed; later nights as one short montage);
    /// the night passing and the morning's tea; the day, which is the night's own (<see cref="Day"/>,
    /// <see cref="Arrived"/>); the handover at dusk with the lantern going out in the shop (<see cref="Handover"/>);
    /// and the evening at home: the journal's page, the lamp out, and to bed. Every step of it that moves the story is a
    /// cutscene, and each turn of the clock saves (Morning: "morning", the handover: "resolved").
    /// </summary>
    public abstract class NightChapter : Chapter
    {
        /// <summary>The bed's middle, where he lies, and how high its mattress is.</summary>
        static readonly Vector2 InBed = new(782, 366);
        const float Mattress = 12f;

        protected NightChapter(Main main) : base(main) { }

        /// <summary>Which night it is, 1 to 7: its day, its box in Marlow's cabinet (one less) and its lantern.</summary>
        protected abstract int Night { get; }
        /// <summary>The night's name on its card ("The Stopped Watch").</summary>
        protected abstract string Title { get; }
        /// <summary>The keepsake in tonight's box.</summary>
        protected abstract string Keepsake { get; }
        /// <summary>The journal page's word for the day ("Waiting"), and what Satria writes on it.</summary>
        protected abstract string Word { get; }
        protected abstract string Page { get; }
        /// <summary>The first night shows the routine at home step by step; later nights know it, and run it as one montage.</summary>
        protected virtual bool FullRoutine => Night == 1;
        /// <summary>What Satria thinks waking to the bell, and to the morning.</summary>
        protected virtual string WakeLine => "...The bell. Midnight again.";
        protected virtual string MorningLine => "Morning. Tea first. Then whoever this belongs to.";

        static readonly string[] Numbers = { "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight" };

        public override async Awaitable Start()
        {
            Know();
            await Card($"Night {Night}: {Title}");
            await Go("satria_home", "bed");
            await Scene(async () =>
            {
                var courier = LieDown();
                await Wait(0.6f);
                await BellStrikes(Night); // the night's number of strokes
                courier.Pose = "wake";
                await Wait(0.8f);
                await Say("courier", WakeLine, "surprised");
                GetUp();
            });
            Hint("Marlow's shop opens at midnight, in the grove past the station.");
        }

        /// <summary>Picks the night up where it was saved: the morning at home, or the evening after the handover; by default it starts over.</summary>
        public override async Awaitable Resume(string checkpoint)
        {
            Know();
            switch (checkpoint)
            {
                case "morning":
                    await Go("satria_home", "bed");
                    Hint("Morning. Tea's on the stove.");
                    break;
                case "resolved":
                    await Go("satria_home", "door");
                    break;
                default:
                    await ResumeDay(checkpoint);
                    break;
            }
        }

        /// <summary>Picks the night up at a checkpoint of its own day (Night 1's "midday"); by default it starts over.</summary>
        protected virtual Awaitable ResumeDay(string checkpoint) => Start();

        // The village, and Marlow once he has said his name on the first night.
        void Know()
        {
            KnowVillage();
            if (Night > 1) Known("marlow", "Marlow");
        }

        public sealed override async Awaitable Entered(string place)
        {
            if (place == "shop" && Game.Phase == Phase.Night && !Game.Has("boxed")) await ShopVisit();
            else if (place == "satria_home" && Game.Phase == Phase.Night && Game.Has("boxed") && !Game.Has("slept")) await HomeAgain();
            else if (place == "satria_home" && Game.Has("resolved")) await Evening();
            else await Arrived(place);
        }

        public sealed override async Awaitable Interact(string id)
        {
            if (!await Routine(id)) await Day(id);
        }

        /// <summary>The night's own story where the courier arrives; nothing by default.</summary>
        protected virtual Awaitable Arrived(string place) => Done();

        /// <summary>The night's own story at a hotspot or person; by default their own line.</summary>
        protected virtual Awaitable Day(string id) => Chat(id);

        /// <summary>What Marlow says as he hands over tonight's box, while he fetches it (a night has its own words).</summary>
        protected virtual async Awaitable AtShop()
        {
            var fetching = FetchBox(Night - 1);
            await Say("marlow", "Another night, another box. You know the way of it now.");
            await fetching;
            await HandOver();
            await Say("marlow", "Open it.");
        }

        /// <summary>What Marlow says once the box is open, sending the courier on.</summary>
        protected virtual string Sending => "Before the next dusk, mind. It has waited long enough.";

        // The shop at midnight: Marlow leaves what he was doing for the counter as the courier comes up to it, fetches
        // the night's box, and the courier opens it.
        async Awaitable ShopVisit()
        {
            Game.Mark("boxed");
            await Scene(async () =>
            {
                var coming = Walk("marlow", Anchor("marlow"));
                var stepping = Walk("courier", Anchor("counter"));
                await Look(Anchor("counter"));
                await coming;
                await stepping;
                await AtShop();
                await OpenBox(Night - 1, Keepsake);
                await Say("marlow", Sending);
                await Look(null);
            });
            Hint("Home to bed. It will keep till morning.");
        }

        // Home with the box at night: the feet scrubbed on the mat, then the routine before sleep, step by step the first
        // night, as one montage after.
        async Awaitable HomeAgain()
        {
            if (!FullRoutine)
            {
                await Scene(async () =>
                {
                    await Scrub();
                    await SetDownBox();
                    await Wash();
                    await LightCoil();
                    await Say("courier", "The same steps as last night. The house is starting to remember me.", "smile");
                    await Sleep();
                });
                return;
            }
            await Scene(Scrub);
            Hint("Before bed: the box on the table, a wash at the water jar, the coil lit.");
        }

        // The routine's hotspots at home, and the evening's desk; false for anything that is the night's own.
        async Awaitable<bool> Routine(string id)
        {
            var home = Game.Phase == Phase.Night && Game.Has("boxed") && !Game.Has("slept");
            switch (id)
            {
                case "table" when home && !Game.Has("box_home"): await Scene(SetDownBox); return true;
                case "water_jar" when home && !Game.Has("washed"): await Scene(Wash); return true;
                case "coil" when home && !Game.Has("coil_lit"): await Scene(LightCoil); return true;
                case "bed" when home:
                    var left = !Game.Has("box_home") ? "The box first. On the table, where I can see it."
                        : !Game.Has("washed") ? "I'm filthy from the road. A wash first."
                        : !Game.Has("coil_lit") ? "The coil. The mosquitoes here are worse than the city's landlords."
                        : null;
                    if (left != null) await Say("courier", left);
                    else await Scene(Sleep);
                    return true;
                case "stove" when Game.Phase == Phase.Morning && !Game.Has("tea"): await Scene(Tea); return true;
                case "table": await ShowText(Game.Has("box_home") ? "The night's box on the walnut table, its lid shut." : "Mother's walnut table. Two chairs, one of them always pulled out a little."); return true;
                case "coil": await ShowText(Game.Phase == Phase.Night ? "A coil on its tin stand by the bed." : "The coil's grey ash on its tin stand. It burned the whole night through."); return true;
                case "desk": await ShowText("His journal, open at the next clean page, and the oil lamp. He writes in it each night before bed."); return true;
                case "stove": await ShowText("The wood stove, still warm. The kettle on it is older than he is."); return true;
                case "photo": await ShowText("The family photo over the sofa. Father squinting at the sun, Mother laughing at him for it."); return true;
                case "radio": await ShowText("Father's radio. He turns the knob; the valves hum as they warm, then a crackle of the coast station."); return true;
                case "sewing": await ShowText("Mother's treadle sewing machine. A spool of red thread still on its pin."); return true;
                case "water_jar": await ShowText("The clay jar, full and cool. The dipper hangs from its rim."); return true;
                case "bed": await ShowText(Game.Phase == Phase.Night ? "Not yet. Not till it's done." : "The old kapok bed, made as Mother taught him: the quilt pulled tight."); return true;
                default: return false;
            }
        }

        /// <summary>The handover: what leads up to it (<paramref name="before"/>), the courier gives the keepsake to its owner, they say what they say (<paramref name="scene"/>), the light turns to night round them, and in Marlow's shop a lantern goes out. Saves at "resolved".</summary>
        protected async Awaitable Handover(string owner, System.Func<Awaitable> scene, System.Func<Awaitable> before = null)
        {
            await Scene(async () =>
            {
                if (before != null) await before();
                await GiveKeepsake(owner, Keepsake);
                await scene();
                await MovePhase(Phase.Night, watched: true);
                Sfx("crickets");
                await LanternGoesOut();
            });
            Game.Mark("resolved");
            Checkpoint("resolved");
            Hint("Home. The journal is waiting.");
        }

        // The night's last scene at home: the day written in the journal at the desk, the lamp blown out, to bed.
        async Awaitable Evening()
        {
            await Scene(async () =>
            {
                var courier = Actor("courier");
                await Walk("courier", Main.Place.Find("desk").GlobalSpot);
                courier.FaceTo(Main.Place.Find("desk").Position.x);
                courier.Pose = "write";
                Sfx("pen");
                await Wait(1f);
                await Main.ShowJournal($"Day {Numbers[Night]}: {Word}", Page);
                courier.Pose = "idle";
                await Walk("courier", Main.Place.Find("bed").GlobalSpot);
                LieDown();
                Sfx("blow");
                Main.Place.World.ShowItemIfAny("lamp_lit", false);
                await Wait(1f);
                Sfx("crickets");
                await Wait(1.5f);
            });
            await Main.EndChapter();
        }

        /// <summary>The great brass bell, <paramref name="strokes"/> times, deep enough to feel in the chest.</summary>
        protected async Awaitable BellStrikes(int strokes)
        {
            for (var i = 0; i < strokes; i++)
            {
                Sfx("bell_toll");
                await Wait(1.3f);
            }
        }

        // Into bed, under Mother's quilt.
        Ant LieDown()
        {
            var courier = Actor("courier");
            courier.Feet = InBed;
            courier.Seat = Mattress;
            courier.FaceTo(InBed.x + 8);
            courier.Pose = "lie";
            return courier;
        }

        // Up out of bed, standing beside it.
        void GetUp()
        {
            var courier = Actor("courier");
            courier.Seat = 0;
            courier.Feet = Main.Place.Def.Spawns["bed"];
            courier.Pose = "idle";
        }

        async Awaitable Scrub()
        {
            var courier = Actor("courier");
            courier.Pose = "crouch";
            Sfx("scrub");
            await Wait(0.8f);
            courier.Pose = "idle";
            await ShowText("He scrubs the night's damp off his feet on the coir mat, the way Mother made him, every single time.");
        }

        async Awaitable SetDownBox()
        {
            await Walk("courier", Main.Place.Find("table").GlobalSpot);
            Actor("courier").FaceAway();
            Sfx("latch");
            Game.Mark("box_home");
            Main.Place.FollowStory();
            await Wait(0.5f);
            if (FullRoutine) await ShowText("He sets the box down on the walnut table. It looks smaller here than it did in Marlow's hands.");
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
            if (FullRoutine) await ShowText("Cold water from the clay jar, in the coconut-shell dipper. The road's dust comes off his face.");
        }

        async Awaitable LightCoil()
        {
            var courier = Actor("courier");
            await Walk("courier", Main.Place.Find("coil").GlobalSpot);
            courier.FaceTo(Main.Place.Find("coil").Position.x);
            courier.Pose = "strike";
            Sfx("match");
            await Wait(0.8f);
            Sfx("hiss");
            Game.Mark("coil_lit");
            Main.Place.FollowStory();
            courier.Pose = "idle";
            await Wait(0.4f);
            if (FullRoutine) await ShowText("A match, a hiss, and the coil's end glows. A thread of smoke curls up. The mosquitoes can find someone else tonight.");
        }

        // To bed, the night passing, and the morning: the clock turns to morning and saves.
        async Awaitable Sleep()
        {
            await Walk("courier", Main.Place.Find("bed").GlobalSpot);
            LieDown();
            Sfx("bed");
            await Wait(0.8f);
            Sfx("blow");
            Main.Place.World.ShowItemIfAny("lamp_lit", false);
            Sfx("crickets");
            await Wait(1.5f);
            Game.Mark("slept");
            await Card("The night passes.", $"Day {Night}, morning.");
            await MovePhase(Phase.Morning);
            Checkpoint("morning");
            var courier = LieDown();
            courier.Pose = "wake";
            await Wait(1f);
            GetUp();
            await Say("courier", MorningLine);
            Hint("Tea's on the stove.");
        }

        // The morning's tea at the stove: the kettle, a cup, and the day can start.
        async Awaitable Tea()
        {
            var courier = Actor("courier");
            await Walk("courier", Main.Place.Find("stove").GlobalSpot);
            courier.FaceAway();
            Sfx("kettle");
            await Wait(1.4f);
            courier.FaceTo(courier.Feet.x - 8);
            courier.Pose = "drink";
            await Wait(1.2f);
            courier.Pose = "idle";
            Game.Mark("tea");
            await ShowText("Sweet tea, too hot, drunk anyway. The way Father took it, standing at the stove.");
        }
    }
}
