using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Minigame 2B, Mother's treadle sewing machine (Night 2): Mochi's torn ear sewn back on in red thread. Holding Space
    /// pumps the treadle and the wheel speeds up, letting go slows it; the cloth feeds under the needle as fast as the
    /// wheel turns, and pumped past the glow the needle strikes the plate and the thread snarls (fail A, TRRAK). A and D
    /// guide the cloth so the needle rides the chalked line of the ear; off the line too long and the seam wanders
    /// (fail B). At the seam's end Space ties off the knot.
    /// </summary>
    public sealed class TreadleStitch : Minigame
    {
        /// <summary>The seam's length on the cloth, how far apart its stitches and chalk dashes are, and how fast the cloth feeds at full speed (px).</summary>
        const float Seam = 150f, Stitch = 4f, Feed = 40f;
        /// <summary>How fast the treadle speeds the wheel up while pumped and lets it slow, a second; the glow; and where it jams.</summary>
        const float Pump = 0.7f, Ease = 0.5f, Jam = 0.9f;
        static readonly (float, float) Glow = (0.4f, 0.75f);
        /// <summary>How fast A and D guide the cloth (px/s), how far the needle may stray from the line, and for how long.</summary>
        const float Guide = 34f, Stray = 6f, StrayFor = 0.35f;
        /// <summary>The needle on the board, and the cloth's place under it.</summary>
        static readonly Vector2 Needle = new(100, 41);
        static readonly Rect Cloth = new(62, 2, 76, 70);
        const int Steps = 6;

        RectTransform cloth;
        Image machine, wheel, treadle;
        Image[] dots, chalk, stitches;
        float[] sewn;
        Meter meter;
        Pips seam;
        float speed, fed, guide, strayed, turned;
        bool knotting;

        public override string Title => "Mother's sewing machine";
        public override (string Key, string Text)[] Instructions => new[]
        {
            ("Space", "Hold to pump the treadle; keep the wheel in the glow."),
            ("A/D", "Guide the cloth so the needle rides the chalk line."),
            ("Space", "At the seam's end, tie off the knot."),
        };
        public override (string Who, string Line) FailA => ("courier", "Good grief... too much force. Mother pedalled this with a calm rhythm, humming a lullaby. I have to match my heartbeat to the wheel.");
        public override (string Who, string Line) FailB => ("courier", "This patchwork's so fragile... Draw the thread slowly. It mustn't tear twice.");
        public override Vector2 Size => new(200, 98);

        public override void Build(RectTransform area)
        {
            Look.Panel("tabletop", area, new Rect(0, 0, Size.x, 76));
            cloth = Look.Panel("cloth", area, Cloth).rectTransform;
            dots = new Image[24];
            for (var i = 0; i < dots.Length; i++) dots[i] = Look.Block("dot", cloth, new Rect(0, 0, 2, 2), Color.white);
            chalk = new Image[(int)(Cloth.height / Stitch) + 1];
            for (var i = 0; i < chalk.Length; i++) chalk[i] = Look.Block("chalk", area, new Rect(0, 0, 1, 2), Look.Cream);
            stitches = new Image[chalk.Length];
            for (var i = 0; i < stitches.Length; i++) stitches[i] = Look.Block("stitch", area, new Rect(0, 0, 1, 3), Art.Color("#f2545b"));
            sewn = new float[(int)(Seam / Stitch) + 1];
            machine = Look.Picture("machine", area, Look.Frame("machine", 0));
            Look.Move(machine.rectTransform, new Vector2(Needle.x - 15, Needle.y - 41));
            wheel = Look.Picture("flywheel", area, Look.Frame("flywheel", 0));
            Look.Move(wheel.rectTransform, new Vector2(176, 6));
            treadle = Look.Picture("treadle", area, Look.Frame("treadle", 1));
            Look.Move(treadle.rectTransform, new Vector2(10, 56));
            seam = new Pips(area, new Vector2(6, 6), Steps);
            meter = new Meter(area, new Vector2(0, 80), Size.x) { Sweet = Glow };
        }

        public override void Reset()
        {
            speed = fed = guide = strayed = 0;
            knotting = false;
            System.Array.Clear(sewn, 0, sewn.Length);
            Show();
        }

        /// <summary>The chalk line across the cloth at a point along the seam, from the cloth's middle (px): the ear's curve.</summary>
        static float Line(float s) => 14f * Mathf.Sin(s / 30f) + 4f * Mathf.Sin(s / 11f);

        // The cloth under the needle as fed and guided: its dots, the chalk still to sew below the needle, the red
        // stitches above it where they went, the wheel and treadle turning and the seam's steps.
        void Show()
        {
            Look.Move(cloth, new Vector2(Cloth.x + guide, Cloth.y));
            for (var i = 0; i < dots.Length; i++)
            {
                var y = Mathf.Repeat(i / 4 * 12f + 3 - fed, Cloth.height - 4) + 1;
                Look.Move(dots[i].rectTransform, new Vector2(6 + i % 4 * 18 + (i / 4 % 2) * 9, y));
            }
            var top = Cloth.y + 2;
            for (var k = 0; k < chalk.Length; k++)
            {
                // a dash every Stitch px of the seam; at screen y the cloth shows the seam at fed + (y - needle)
                var s = (Mathf.Floor((fed + top - Needle.y) / Stitch) + k) * Stitch;
                var y = Needle.y + s - fed;
                var ahead = s > fed && s <= Seam && y < Cloth.yMax - 2;
                chalk[k].gameObject.SetActive(ahead);
                if (ahead) Look.Move(chalk[k].rectTransform, new Vector2(Needle.x + guide + Line(s), y));
                var index = (int)(s / Stitch);
                var done = s >= 0 && s <= fed && y >= top && index < sewn.Length;
                stitches[k].gameObject.SetActive(done);
                if (done) Look.Move(stitches[k].rectTransform, new Vector2(Needle.x + guide + sewn[index], y - 1));
            }
            machine.transform.SetAsLastSibling();
            seam.Count = Mathf.Min(Steps, Mathf.FloorToInt(fed / Seam * Steps));
            meter.Value = speed;
        }

        public override Outcome Tick()
        {
            if (knotting)
            {
                if (!Controls.Interact) return Outcome.Playing;
                Sound.Play("knot");
                meter.Sparks();
                return Outcome.Won;
            }
            var dt = Time.deltaTime;
            speed = Mathf.Clamp01(speed + (Controls.Holding ? Pump : -Ease) * dt);
            if (speed > Jam)
            {
                Sound.Play("trrak");
                return Outcome.FailA;
            }
            guide += Controls.Move.x * Guide * dt;
            var was = fed;
            fed = Mathf.Min(Seam, fed + speed * Feed * dt);
            // a stitch each Stitch px fed, where the needle came down on the cloth
            for (var s = Mathf.Ceil(was / Stitch) * Stitch; s <= fed; s += Stitch) sewn[(int)(s / Stitch)] = -guide;
            Turn(dt);
            if (fed > was && Mathf.Abs(guide + Line(fed)) > Stray)
            {
                strayed += dt;
                if (strayed > StrayFor) return Outcome.FailB;
            }
            else strayed = 0;
            if (fed >= Seam)
            {
                knotting = true;
                speed = 0;
            }
            Show();
            return Outcome.Playing;
        }

        // The hand wheel turning and the needle going up and down as fast as the treadle drives them; the treadle rocks.
        void Turn(float dt)
        {
            var was = turned;
            turned += speed * dt * 12f;
            Look.SetSprite(wheel, Look.Frame("flywheel", (int)turned));
            Look.SetSprite(machine, Look.Frame("machine", (int)(turned * 2) % 2));
            Look.SetSprite(treadle, Look.Frame("treadle", speed > 0.05f ? (int)(turned / 2) % 2 * 2 : 1));
            if (speed > 0.1f && (int)(turned / 8) != (int)(was / 8)) Sound.Play("whir"); // about once a second at a steady pace
        }

        public override void Solve()
        {
            fed = Seam;
            for (var i = 0; i < sewn.Length; i++) sewn[i] = Line(i * Stitch);
            guide = -Line(Seam);
            speed = 0.5f;
            Show();
        }
    }
}
