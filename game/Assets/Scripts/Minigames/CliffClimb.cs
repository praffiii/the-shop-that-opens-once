using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Minigame 3A, the wild sea-mint cliff over the south coast (Night 3), climbed on Arlo's hemp rope while he watches
    /// from his boat. W and S climb the black rock's crevice a foothold at a time; gusts of sea wind, shown coming on the
    /// windsock and in the streaks across the face, push Satria's balance (the meter) aside, and A and D lean against
    /// them. Blown off the meter's end he slips (fail A, SREEK). The rope trails from his waist and swings to the side he
    /// leans, so climbing past an oyster shell leant toward it snags the rope on it (fail B). At the top three clumps of
    /// sea mint grow along the lip: lean to one and Space picks it. A retry starts on the ledge below, the mint kept.
    /// </summary>
    public sealed class CliffClimb : Minigame
    {
        /// <summary>The cliff picture (ArtSource cliff(): its crevice up x 100, a foothold every Step px up from Foot), the view of it, and Satria's feet in the view.</summary>
        const float Crevice = 100, Foot = 218, Step = 18, Tall = 240, View = 100, Eye = 72;
        const int Holds = 10, Top = Holds - 1, Wanted = 3;
        /// <summary>The ledges a retry starts on, and the oysters: between foothold k and k + 1, on the left (-1) or right (1) wall.</summary>
        static readonly int[] Ledges = { 0, 3, 6 };
        static readonly (int Hold, int Side)[] Oysters = { (1, -1), (2, 1), (4, 1), (5, -1), (7, -1), (8, 1) };
        /// <summary>Balance: how fast A and D lean (a second, on the meter), how fast he climbs between holds (px/s), and the steady band.</summary>
        const float Lean = 0.6f, Climb = 150f, Sway = 0.03f;
        static readonly (float From, float To) Steady = (0.4f, 0.6f);
        /// <summary>Gusts, over and over: which way each blows, how hard it pushes (a second, on the meter), and the calm after it; seconds of warning and of blowing.</summary>
        static readonly int[] Way = { 1, -1, 1, -1, -1, 1 };
        static readonly float[] Push = { 0.32f, 0.36f, 0.42f, 0.3f, 0.4f, 0.38f };
        static readonly float[] Calm = { 1.8f, 2.4f, 1.5f, 2.2f, 1.7f, 2.6f };
        const float Warn = 0.9f, Blow = 1.3f, FirstGust = 1.2f;
        /// <summary>The clumps of mint along the lip, and where on the meter Satria reaches each: left of this, in the steady band, right of that.</summary>
        static readonly float[] Mint = { Crevice - 28, Crevice, Crevice + 28 };
        const float ReachLeft = 0.36f, ReachRight = 0.64f;
        const int Rope = 28, Streaks = 10;

        readonly bool[] picked = new bool[3];
        RectTransform world;
        Image climber, boat, surf, sock;
        Image[] mint, oysters, rope, streaks;
        Meter meter;
        Pips gathered;
        int hold, limb, count, gust, tries;
        float feet, balance, t, gustAt;
        bool started;

        public override string Title => "The sea-mint cliff";
        public override (string Key, string Text)[] Instructions => new[]
        {
            ("W/S", "Climb the crevice a foothold at a time."),
            ("A/D", "Lean against the gusts; keep the rope off the oysters."),
            ("Space", "At the top, lean to a clump of mint and pick it."),
        };
        public override (string Who, string Line) FailA => ("arlo", "Hold your footing in the wet crevice, Satria! Don't fight the sea wind: duck your head and hug the rock when the swell hits! Breathe, and climb again from the ledge below you!");
        public override (string Who, string Line) FailB => ("courier", "The rope's caught on an oyster shell... Untie the knot slowly. Don't panic up here.");
        public override Vector2 Size => new(200, View + 4 + Meter.Height);

        static float FeetAt(int k) => Foot - k * Step;

        public override void Build(RectTransform area)
        {
            var view = Look.Node("view", area, new Rect(0, 0, Size.x, View));
            view.gameObject.AddComponent<RectMask2D>();
            world = Look.Node("cliff", view, new Rect(0, 0, Size.x, Tall));
            Look.Picture("cliff", world, Look.Piece("cliff"));
            surf = Look.Picture("surf", world, Look.Frame("surf", 0));
            Look.Move(surf.rectTransform, new Vector2(0, 221));
            foreach (var k in Ledges) Look.Move(Look.Picture("ledge", world, Look.Piece("ledge")).rectTransform, new Vector2(Crevice - 22, FeetAt(k) - 1));
            oysters = new Image[Oysters.Length];
            for (var i = 0; i < Oysters.Length; i++)
            {
                var (k, side) = Oysters[i];
                oysters[i] = Look.Picture("oyster", world, Look.Frame("oyster", 0));
                Look.Move(oysters[i].rectTransform, new Vector2(Crevice + side * 9 - 6, FeetAt(k) - Step / 2 - 5));
            }
            rope = new Image[Rope];
            for (var i = 0; i < Rope; i++) rope[i] = Look.Block("rope", world, new Rect(0, 0, 2, 2), Art.Color(i % 2 == 0 ? "#f5dcaa" : "#c99f66"));
            climber = Look.Picture("climber", world, Look.Frame("climber", 2));
            // the mint on the lip, over his hands as he reaches into it
            mint = new Image[Mint.Length];
            for (var i = 0; i < Mint.Length; i++)
            {
                mint[i] = Look.Picture("seamint", world, Look.Frame("seamint", 0));
                Look.Move(mint[i].rectTransform, new Vector2(Mint[i] - 11, 8));
            }
            boat = Look.Picture("arloboat", world, Look.Frame("arloboat", 0));
            streaks = new Image[Streaks];
            for (var i = 0; i < Streaks; i++) streaks[i] = Look.Block("streak", view, new Rect(0, 0, 8 + i % 3 * 4, 1), new Color(1, 1, 1, 0.75f));
            sock = Look.Picture("windsock", view, Look.Frame("windsock", 0));
            Look.Move(sock.rectTransform, new Vector2(Size.x - 38, 4));
            gathered = new Pips(view, new Vector2(6, 6), Wanted);
            meter = new Meter(area, new Vector2(0, View + 4), Size.x) { Sweet = Steady };
        }

        public override void Reset()
        {
            tries++;
            // back to the ledge at or below where he was, steady, the wind calm till he climbs again
            var ledge = 0;
            foreach (var k in Ledges)
                if (k <= hold) ledge = k;
            hold = ledge;
            feet = FeetAt(hold);
            balance = 0.5f;
            started = false;
            gust = 0;
            t = gustAt = 0;
            foreach (var oyster in oysters) Look.SetSprite(oyster, Look.Frame("oyster", 0));
            Look.SetSprite(boat, Look.Frame("arloboat", 0));
            gathered.Count = count;
            Show();
        }

        // Where the gusts are at: 0 calm, 1 coming (on the windsock), 2 blowing; and which way the one coming blows.
        (int Phase, int Way, float For) Wind()
        {
            if (!started || t < gustAt) return (0, 0, 0);
            var into = t - gustAt;
            return into < Warn ? (1, Way[gust], into) : (2, Way[gust], into - Warn);
        }

        // The cliff scrolled to keep Satria in view; him on his foothold, leaning; the rope from his waist bowing to the
        // side he leans; the mint in reach lit; the boat bobbing, the surf lapping, the windsock and the wind's streaks.
        void Show()
        {
            var top = Mathf.Clamp(feet - Eye, 0, Tall - View);
            Look.Move(world, new Vector2(0, -top));
            var lean = Mathf.Clamp(Mathf.RoundToInt((balance - 0.5f) * 5), -2, 2);
            var shift = (balance - 0.5f) * 10;
            Look.SetSprite(climber, Look.Frame("climber", limb * 5 + lean + 2));
            Look.Move(climber.rectTransform, new Vector2(Crevice - 20 + shift, feet - 37));
            var bow = (balance - 0.5f) * 40;
            for (var i = 0; i < Rope; i++)
            {
                var d = i * 2f;
                Look.Move(rope[i].rectTransform, new Vector2(Crevice + shift - 1 + bow * Mathf.Sin(Mathf.Min(d / 30f, 1) * Mathf.PI / 2), feet - 11 + d));
            }
            for (var i = 0; i < mint.Length; i++)
                Look.SetSprite(mint[i], Look.Frame("seamint", picked[i] ? 2 : hold == Top && Reach() == i ? 1 : 0));
            Look.Move(boat.rectTransform, new Vector2(146, Tall - boat.rectTransform.sizeDelta.y - 4 + Mathf.Round(Mathf.Sin(Time.time * 2))));
            Look.SetSprite(surf, Look.Frame("surf", (int)(Time.time * 5)));
            var (phase, way, into) = Wind();
            Look.SetSprite(sock, Look.Frame("windsock", phase == 0 ? 0 : (way > 0 ? 1 : 4) + (phase == 2 ? 1 + (int)(into * 8) % 2 : 0)));
            for (var i = 0; i < Streaks; i++)
            {
                // the wind's streaks blowing across, a few as it comes and fast as it blows
                var on = phase == 2 || (phase == 1 && i % 3 == 0);
                streaks[i].gameObject.SetActive(on);
                if (!on) continue;
                var x = Mathf.Repeat(into * (phase == 2 ? 260 : 110) + i * 37, Size.x + 40) - 20;
                Look.Move(streaks[i].rectTransform, new Vector2(way > 0 ? x : Size.x - x, (i * 23 + 7) % (View - 6) + 3));
            }
            meter.Value = balance;
        }

        // The clump Satria can reach from where he leans, or -1.
        int Reach() => balance < ReachLeft ? 0 : balance > ReachRight ? 2 : Steadied ? 1 : -1;

        bool Steadied => balance >= Steady.From && balance <= Steady.To;

        public override Outcome Tick()
        {
            var dt = Time.deltaTime;
            if (started) t += dt;
            var (phase, way, into) = Wind();
            if (phase == 1 && into < dt) Sound.Play("gust");
            if (phase == 2 && into < dt) Main.Run(Spray());
            if (phase == 2) balance += way * Push[gust] * dt;
            if (phase == 2 && into >= Blow)
            {
                gustAt = t + Calm[gust];
                gust = (gust + 1) % Way.Length;
            }
            balance = Mathf.Clamp01(balance + Controls.Move.x * Lean * dt + Mathf.Sin(Time.time * 1.7f) * Sway * dt);
            feet = Mathf.MoveTowards(feet, FeetAt(hold), Climb * dt);
            if (balance <= 0.02f || balance >= 0.98f)
            {
                Sound.Play("sreek");
                Look.SetSprite(boat, Look.Frame("arloboat", 1));
                Main.Run(Slip());
                return Outcome.FailA;
            }
            var climbing = feet == FeetAt(hold);
            if (climbing && (Controls.Up && hold < Top || Controls.Down && hold > 0))
            {
                var to = hold + (Controls.Up ? 1 : -1);
                for (var i = 0; i < Oysters.Length; i++)
                {
                    var (k, side) = Oysters[i];
                    if (k != Mathf.Min(hold, to) || (side < 0 ? balance >= Steady.From : balance <= Steady.To)) continue;
                    Look.SetSprite(oysters[i], Look.Frame("oyster", 1));
                    Sound.Play("snag");
                    Show();
                    return Outcome.FailB;
                }
                if (!started) gustAt = FirstGust;
                started = true;
                hold = to;
                limb = 1 - limb;
                Sound.Play("climb");
                Main.Run(Pebbles());
            }
            else if (hold == Top && Controls.Interact && Reach() is var clump && clump >= 0 && !picked[clump])
            {
                picked[clump] = true;
                gathered.Count = ++count;
                Sound.Play("pluck");
                Main.Run(Leaves(Mint[clump]));
                if (count == Wanted)
                {
                    Show();
                    return Outcome.Won;
                }
            }
            Show();
            return Outcome.Playing;
        }

        // He loses his footing and slides down the rock with his arms flung up, till the retry sets him on the ledge.
        async Awaitable Slip()
        {
            var go = tries;
            var at = Look.Pos(climber.rectTransform);
            Look.SetSprite(climber, Look.Frame("climber", 10));
            for (var s = 0f; s < 0.3f && climber && go == tries; s += Time.deltaTime)
            {
                Look.Move(climber.rectTransform, at + new Vector2(0, 40 * s));
                await Main.Frame();
            }
        }

        // A pebble or two knocked off the foothold, falling away down the face.
        async Awaitable Pebbles()
        {
            var from = new Vector2(Crevice - 4, FeetAt(hold) + Step);
            var bits = new[] { Look.Block("pebble", world, new Rect(from, Vector2.one * 2), Art.Color("#8b8aa8")), Look.Block("pebble", world, new Rect(from + new Vector2(7, 1), Vector2.one), Art.Color("#b3b3cb")) };
            for (var s = 0f; s < 0.45f && world; s += Time.deltaTime)
            {
                for (var i = 0; i < bits.Length; i++) Look.Move(bits[i].rectTransform, from + new Vector2(i * 7 + (i == 0 ? -6 : 5) * s, 2 + 200 * s * s));
                await Main.Frame();
            }
            foreach (var bit in bits)
                if (bit) Object.Destroy(bit.gameObject);
        }

        // As a gust hits, the swell breaks white on the cliff's foot.
        async Awaitable Spray()
        {
            Sound.Play("waves");
            var drops = new Image[8];
            for (var i = 0; i < drops.Length; i++) drops[i] = Look.Block("spray", world, new Rect(0, 0, 2, 2), Art.Color(i % 2 == 0 ? "#ffffff" : "#b3f1f5"));
            for (var s = 0f; s < 0.7f && world; s += Time.deltaTime)
            {
                for (var i = 0; i < drops.Length; i++)
                    Look.Move(drops[i].rectTransform, new Vector2(Crevice - 56 + i * 16 + (i % 3 - 1) * 10 * s, 222 - (40 + i % 3 * 12) * s + 90 * s * s));
                await Main.Frame();
            }
            foreach (var drop in drops)
                if (drop) Object.Destroy(drop.gameObject);
        }

        // The picked mint's leaves and flowers burst from the lip and fall.
        async Awaitable Leaves(float x)
        {
            var bits = new Image[6];
            for (var i = 0; i < bits.Length; i++) bits[i] = Look.Block("leaf", world, new Rect(0, 0, 2, 2), Art.Color(i % 3 == 0 ? "#c3a2ff" : i % 3 == 1 ? "#9fd65e" : "#ffffff"));
            for (var s = 0f; s < 0.5f && world; s += Time.deltaTime)
            {
                for (var i = 0; i < bits.Length; i++)
                    Look.Move(bits[i].rectTransform, new Vector2(x + (i - 2.5f) * 30 * s, 16 - 50 * s + 160 * s * s));
                await Main.Frame();
            }
            foreach (var bit in bits)
                if (bit) Object.Destroy(bit.gameObject);
        }

        public override void Solve()
        {
            hold = Top;
            feet = FeetAt(Top);
            for (var i = 0; i < picked.Length; i++) picked[i] = true;
            count = Wanted;
            gathered.Count = Wanted;
            Show();
        }
    }
}
