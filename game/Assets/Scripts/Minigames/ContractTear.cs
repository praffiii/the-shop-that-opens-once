using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Minigame 8, tearing the contract (Day 8), on the hall's forecourt before Valdo and the whole village. Holding Space
    /// grips the deed of sale (the meter fills till it glows); then A and D pull it left and right in turn, each pull
    /// running the tear further down, till it comes apart in two before Valdo's face; letting go of Space then throws the
    /// scraps to the sea wind. Letting go before it is torn through lets it slip (fail A); pulling the same way twice only
    /// crumples it (fail B). The script's "hold E and Space, pull the mouse apart" becomes these keys, as E opens the bag.
    /// </summary>
    public sealed class ContractTear : Minigame
    {
        const int Tugs = 8, Scraps = 28, Streaks = 4;
        /// <summary>Seconds Space takes to fill the grip; the band it glows in once gripped.</summary>
        const float GripSeconds = 0.6f;
        static readonly (float, float) Gripped = (0.82f, 1f);
        /// <summary>Where the deed hangs (its frame, the paper 8 px in and 2 down); the halves' frames once torn, as export-cast.js draws them; the hands.</summary>
        static readonly Vector2 Deed = new(62, 6), LeftHalf = new(69, 7), RightHalf = new(91, 7), LeftHand = new(60, 24), RightHand = new(122, 24);
        /// <summary>The paper's height, the row of it the hands hold, how far the torn halves are pulled apart, and how fast.</summary>
        const float Paper = 70f, HandRow = 24f, Gap = 14f, PartSeconds = 0.3f;
        /// <summary>Seconds the scraps fly before the win chimes, and how much longer they drift on as it does.</summary>
        const float Scatter = 1.6f, Drift = 0.9f;

        RectTransform area;
        Image view, deed, left, right, leftHalf, rightHalf;
        Image[] streaks;
        Meter meter;
        readonly float[] jerk = new float[2];
        float grip, apart, flown;
        int tugs, last;
        bool gripped, torn;

        public override string Title => "Tearing the contract";
        public override (string Key, string Text)[] Instructions => new[]
        {
            ("Space", "Hold to grip the deed, till the gauge glows."),
            ("A/D", "Pull left, then right, in turn, to tear it in two."),
            ("Space", "Let go to throw the scraps to the sea wind."),
        };
        public override (string Who, string Line) FailA => ("courier", "It slipped right out of my hands... This village kept its lanterns lit for twenty years. I can hold on to one sheet of paper. Grip it, and pull again.");
        public override (string Who, string Line) FailB => ("courier", "Ha... I only crumpled it. One hand alone just bunches it up. Left, then right, in turn, the way Mother tore her patchwork strips.");
        public override Vector2 Size => new(200, 106);

        public override void Build(RectTransform area)
        {
            this.area = area;
            view = Look.Picture("square", area, Look.Frame("deed_view", 0));
            streaks = new Image[Streaks];
            for (var i = 0; i < Streaks; i++) streaks[i] = Look.Block("wind", area, new Rect(0, 0, 6 + i % 2 * 5, 1), Look.Cream);
            deed = Look.Picture("deed", area, Look.Frame("deed", 0));
            leftHalf = Look.Picture("half", area, Look.Frame("deed_half", 0));
            rightHalf = Look.Picture("half", area, Look.Frame("deed_half", 1));
            left = Look.Picture("hand", area, Look.Frame("deed_grip", 0));
            right = Look.Picture("hand", area, Look.Frame("deed_grip", 2));
            meter = new Meter(area, new Vector2(0, 88), Size.x) { Sweet = Gripped };
        }

        public override void Reset()
        {
            grip = apart = 0;
            flown = -1;
            tugs = 0;
            last = -1;
            gripped = torn = false;
            jerk[0] = jerk[1] = 0;
            Show();
        }

        /// <summary>How far each half of the deed has gaped out at the hands' row, after some pulls (the spread export-cast.js draws).</summary>
        static float Spread(int pulls) => pulls == 0 ? 0 : pulls * 0.75f * Mathf.Max(0, 1 - HandRow / (Paper * pulls / Tugs));

        // The deed as torn (or its two halves pulled apart), the hands holding it where it has gaped to, each jerking out
        // as it pulls, and Valdo's face falling at the first pull.
        void Show()
        {
            var thrown = flown >= 0;
            Look.SetSprite(view, Look.Frame("deed_view", tugs > 0 ? 1 : 0));
            deed.gameObject.SetActive(!torn);
            leftHalf.gameObject.SetActive(torn && !thrown);
            rightHalf.gameObject.SetActive(torn && !thrown);
            Look.SetSprite(deed, Look.Frame("deed", tugs));
            Look.Move(deed.rectTransform, Deed + new Vector2((jerk[1] - jerk[0]) / 3, 0));
            var gape = torn ? 4 + apart * Gap : Spread(tugs);
            Look.Move(leftHalf.rectTransform, LeftHalf - new Vector2(apart * Gap, 0));
            Look.Move(rightHalf.rectTransform, RightHalf + new Vector2(apart * Gap, 0));
            var held = (gripped || grip > 0.5f) && !thrown;   // the pincers close as the grip fills
            var tremble = held && Mathf.Sin(Time.time * 50) > 0 ? 1 : 0;   // the strain in the hands
            Look.SetSprite(left, Look.Frame("deed_grip", held ? 1 : 0));
            Look.SetSprite(right, Look.Frame("deed_grip", held ? 3 : 2));
            Look.Move(left.rectTransform, LeftHand - new Vector2(gape + jerk[0] + (thrown ? 6 : 0), tremble));
            Look.Move(right.rectTransform, RightHand + new Vector2(gape + jerk[1] + (thrown ? 6 : 0), 0));
        }

        public override Outcome Tick()
        {
            var dt = Time.deltaTime;
            Breeze();
            for (var i = 0; i < 2; i++) jerk[i] = Mathf.MoveTowards(jerk[i], 0, 30 * dt);
            if (flown >= 0)
            {
                flown += dt;
                Show();
                return flown >= Scatter ? Outcome.Won : Outcome.Playing;
            }
            if (!gripped)
            {
                // the grip fills while Space is held, and ebbs if it is let go too soon
                grip = Mathf.Clamp01(grip + (Controls.Holding ? 1 : -2) * dt / GripSeconds);
                meter.Value = grip;
                if (grip >= 1)
                {
                    gripped = true;
                    Sound.Play("page");
                    meter.Sparks();
                }
                else if (Controls.Left || Controls.Right)
                {
                    jerk[Controls.Right ? 1 : 0] = 2;   // a tug at it before it is held: nothing gives
                    Sound.Play("pop");
                }
                Show();
                return Outcome.Playing;
            }
            meter.Value = 0.91f + 0.05f * Mathf.Sin(Time.time * 40);
            if (torn)
            {
                if (apart < 1) apart = Mathf.Min(1, apart + dt / PartSeconds);
                if (!Controls.Holding) Throw();
                Show();
                return Outcome.Playing;
            }
            if (!Controls.Holding)
            {
                gripped = false;
                Show();
                Sound.Play("page");
                return Outcome.FailA;
            }
            var pull = Controls.Right ? 1 : Controls.Left ? 0 : -1;
            if (pull < 0)
            {
                Show();
                return Outcome.Playing;
            }
            if (pull == last)
            {
                Sound.Play("crumple");
                return Outcome.FailB;
            }
            last = pull;
            tugs++;
            jerk[pull] = 3;
            Main.Run(Fibres());
            if (tugs == Tugs)
            {
                torn = true;
                Sound.Play("tear");
            }
            else Sound.Play("rip");
            Show();
            return Outcome.Playing;
        }

        // The sea wind's streaks drifting across the sky behind it all.
        void Breeze()
        {
            for (var i = 0; i < streaks.Length; i++)
                Look.Move(streaks[i].rectTransform, new Vector2(Mathf.Repeat(Time.time * (34 + 9 * i) + i * 61, Size.x + 20) - 12, 6 + i * 9));
        }

        // A puff of paper fibre flying off the tip of the tear.
        async Awaitable Fibres()
        {
            var at = new Vector2(Deed.x + 38, Deed.y + 2 + Paper * tugs / Tugs);
            var bits = new (Image Bit, Vector2 Speed)[6];
            for (var i = 0; i < bits.Length; i++)
                bits[i] = (Look.Block("fibre", area, new Rect(at, Vector2.one * (i % 3 == 0 ? 2 : 1)), Art.Color(i % 2 == 0 ? "#ffffff" : "#f5e6c8")),
                    new Vector2(Random.Range(-36f, 36f), Random.Range(-40f, 10f)));
            const float Seconds = 0.4f;
            for (var t = 0f; t < Seconds && area; t += Time.deltaTime)
            {
                foreach (var (bit, speed) in bits)
                {
                    Look.Move(bit.rectTransform, at + speed * t + new Vector2(0, 90f * t * t));
                    bit.color = new Color(bit.color.r, bit.color.g, bit.color.b, 1 - t / Seconds);
                }
                await Main.Frame();
            }
            foreach (var (bit, _) in bits)
                if (bit) Object.Destroy(bit.gameObject);
        }

        // Let go: the two halves burst into scraps that the sea wind takes up and away over the square.
        void Throw()
        {
            flown = 0;
            Sound.Play("flutter");
            Sound.Play("whoosh");
            for (var i = 0; i < Scraps; i++)
            {
                var half = i % 2 == 0 ? LeftHalf - new Vector2(apart * Gap, 0) : RightHalf + new Vector2(apart * Gap, 0);
                Main.Run(Fly(half + new Vector2(Random.Range(2f, 34f), Random.Range(2f, Paper - 4)), i));
            }
        }

        // One scrap tumbling up and off on the wind, swaying as it goes, fading out as it drifts away.
        async Awaitable Fly(Vector2 from, int i)
        {
            var scrap = Look.Picture("scrap", area, Look.Frame("deed_scrap", 0));
            var kind = i % 5 == 0 ? 4 : 0;   // a few carry a piece of the red stamp
            var speed = new Vector2((from.x - 100) * 0.9f + Random.Range(-20f, 20f), Random.Range(-90f, -10f));
            var (spin, sway, phase) = (Random.Range(9f, 16f), Random.Range(3f, 7f), Random.Range(0f, 4f));
            const float Fall = 24f, Wind = 60f;
            var life = Scatter + Drift;
            for (var t = 0f; t < life && scrap; t += Time.deltaTime)
            {
                // the throw slows as the wind takes over, pushing it right, the scrap only slowly settling
                var at = from + speed * t + new Vector2(Wind, Fall) * (0.5f * t * t) + new Vector2(Mathf.Sin(t * 6 + phase) * sway, 0);
                Look.Move(scrap.rectTransform, at);
                Look.SetSprite(scrap, Look.Frame("deed_scrap", kind + (int)(t * spin + phase) % 4));
                scrap.color = new Color(1, 1, 1, Mathf.Clamp01((life - t) / 0.7f));
                await Main.Frame();
            }
            if (scrap) Object.Destroy(scrap.gameObject);
        }

        public override void Solve()
        {
            tugs = Tugs;
            gripped = torn = true;
            apart = 1;
            meter.Value = 1;
            Show();
        }
    }
}
