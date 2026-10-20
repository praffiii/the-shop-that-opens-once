using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Not part of the story: a short run through every system (walking, places, talking, choices, the bag, handing
    /// over a keepsake as the light turns to night, a lantern going out, saving, a minigame at the Mender's forge), from the title's editor-only option. Night 1 replaces it.
    /// </summary>
    public sealed class DevChapter : Chapter
    {
        public DevChapter(Main main) : base(main) { }

        public override Phase StartPhase => Phase.Dusk;

        public override async Awaitable Start()
        {
            await Card("Systems test", "Not part of the story.");
            await Go("station", "start");
            Hint("Click to walk, or use WASD (hold Shift to run). Space uses what is close.");
        }

        public override async Awaitable Entered(string place)
        {
            if (place != "shop" || Game.Has("met_marlow")) return;
            Game.Mark("met_marlow");
            // the handover as a cinematic scene: Marlow leaves what he was doing for the counter as the courier comes
            // up to it, talks on as he fetches the night's box from the cabinet, and the courier opens it
            await Cinema(true);
            var coming = Walk("marlow", Anchor("marlow"));
            var stepping = Walk("courier", Anchor("counter"));
            await Look(Anchor("counter"));
            await Say("marlow", "You found the shop. Good.");
            await coming;
            await stepping;
            var fetching = FetchBox(0);
            await Say("marlow", "Every night, one box. Tonight, this one.");
            await fetching;
            await HandOver();
            await Say("marlow", "Open it.");
            await OpenBox(0, "watch");
            await Say("marlow", "It belongs to someone waiting on the old platform. Take it to them.");
            await Cinema(false);
            await Look(null);
            Hint("Press E to look in your bag.");
        }

        // Marlow's door is open whenever the run comes by.
        public override string Closed(string id) => null;

        public override async Awaitable Interact(string id)
        {
            switch (id)
            {
                case "helen" when Game.Bag.Contains("watch"):
                    await Say("helen", "Another evening, another train that doesn't come.");
                    if (await Choose("Show the watch", "Goodbye") != 0) return;
                    await GiveKeepsake("helen", "watch");
                    await Say("helen", "Oh. Where did you find this?", "moved");
                    await MovePhase(Phase.Night, watched: true);
                    await LanternGoesOut();
                    await Main.EndChapter();
                    break;
                case "mender":
                    await Say("mender", "Hold the hinge to the anvil and strike when it glows. Three good ones.");
                    await Play(new Strike());
                    Game.Mark("struck");
                    await Say("mender", "There. A hinge you could hang a chapel door on.", "smile");
                    break;
                case "marlow":
                    await Say("marlow", Game.Bag.Count > 0 ? "The platform is up the steps and past the forge, by the tea stall." : "Mind the lanterns.");
                    break;
                default:
                    await Chat(id);
                    break;
            }
        }

        // The systems test's minigame: strike the hinge while the needle sweeps through the glow, three times.
        sealed class Strike : Minigame
        {
            const int Strikes = 3;
            /// <summary>Sweeps of the needle a second, and seconds without a strike before the iron goes cold.</summary>
            const float Speed = 0.7f, Cold = 6f;
            Meter meter;
            Pips pips;
            float t, idle;
            int hits;

            public override string Title => "Strike while it glows";
            public override (string Key, string Text)[] Instructions => new[] { ("Space", "Strike while the needle is in the glow."), ((string)null, "Three good strikes shape the hinge.") };
            public override (string Who, string Line) FailA => ("mender", "Too soon or too late, it's all the same to iron. Again, from the first strike.");
            public override (string Who, string Line) FailB => ("courier", "I let it go cold watching the needle. Strike, don't stare.");
            public override Vector2 Size => new(200, Meter.Height + 8 + 9);

            public override void Build(RectTransform area)
            {
                meter = new Meter(area, Vector2.zero, Size.x) { Sweet = (0.62f, 0.78f) };
                pips = new Pips(area, new Vector2(Mathf.Round((Size.x - Pips.Width(Strikes)) / 2), Meter.Height + 8), Strikes);
            }

            public override void Reset()
            {
                t = idle = 0;
                hits = 0;
                pips.Count = 0;
            }

            public override Outcome Tick()
            {
                t += Time.deltaTime;
                meter.Value = Mathf.PingPong(t * Speed * 2, 1f);
                if ((idle += Time.deltaTime) > Cold) return Outcome.FailB;
                if (!Controls.Interact) return Outcome.Playing;
                if (!meter.InSweet) return Outcome.FailA;
                idle = 0;
                pips.Count = ++hits;
                meter.Sparks();
                Sound.Play("tick");
                return hits == Strikes ? Outcome.Won : Outcome.Playing;
            }

            public override void Solve()
            {
                meter.Value = 0.7f;
                pips.Count = Strikes;
            }
        }
    }
}
