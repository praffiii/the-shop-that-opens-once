using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Minigame 5A, Leo's shoes resoled at the Mender's forge (Night 5). First Space held warms the pine damar in its
    /// pottery bowl over the clay candle heater: the resin melts only while the heat is in the glow, and blasted past it
    /// the damar boils black (fail A, and the bowl starts over). Then A and D in turn draw the hot brass iron along the
    /// peeling sole, laying the resin edge to edge. Last the hammer swings over the press's four pegs, and Space strikes:
    /// a peg goes home only when the hammer is upright over it, the clamp bar coming down a step with each; struck
    /// leaning, the peg splits (fail B, and a new peg is set in its hole, the pegs driven staying driven).
    /// </summary>
    public sealed class ResinResole : Minigame
    {
        /// <summary>How fast the heat rises while Space is held and falls when let go, its glow, where the damar boils, and the seconds in the glow it takes to melt.</summary>
        const float Rise = 0.45f, Cool = 0.3f, Boil = 0.95f, Melt = 2.5f;
        static readonly (float, float) Warm = (0.55f, 0.8f);
        /// <summary>The strokes of the iron along the sole, where the sole's resin starts and how long it runs.</summary>
        const int Strokes = 10;
        const float SoleX = 95, SoleLength = 80;
        /// <summary>The pegs, the hammer's swing (radians a second), the upright window on the meter, and the clamp bar's open gap.</summary>
        const int Pegs = 4, Gap = 5;
        const float Swing = 2.6f, Strike = 0.15f, Finish = 0.8f;
        static readonly (float, float) Upright = (0.42f, 0.58f);
        const float Wall = 114;

        RectTransform gauging;
        Image heater, bowl, iron, smoke, upper, sole, bar, hammer, resin, resinLight;
        Image[] pegs;
        Meter meter;
        Pips driven;
        float t, heat, melted, struck = -1, finished;
        int strokes, last, set;
        bool burnt, split;

        public override string Title => "Leo's shoes";
        public override (string Key, string Text)[] Instructions => new[]
        {
            ("Space", "Hold to warm the damar; keep it in the glow."),
            ("A/D", "In turn, draw the hot iron along the sole."),
            ("Space", "Strike each peg when the hammer stands upright."),
        };
        public override (string Who, string Line) FailA => ("mender", "Hahaha! Don't rush, Satria! Damar glue is like forest honey: warm it on a calm candle flame, don't blast it like a welding torch! Come, fresh resin from this pottery bowl!");
        public override (string Who, string Line) FailB => ("courier", "The strike has to come straight down... mending a runner's shoe takes real precision.");
        public override Vector2 Size => new(216, Wall + 4 + Meter.Height);

        bool Heating => melted < Melt;
        bool Spreading => !Heating && strokes < Strokes;
        bool Pegging => !Heating && !Spreading && set < Pegs;

        public override void Build(RectTransform area)
        {
            Look.Picture("forge_wall", area, Look.Piece("forge_wall"));
            heater = Look.Picture("candle_heater", area, Look.Frame("candle_heater", 0));
            Look.Move(heater.rectTransform, new Vector2(2, 79));
            bowl = Look.Picture("resin_bowl", area, Look.Frame("resin_bowl", 0));
            Look.Move(bowl.rectTransform, new Vector2(5, 75));
            Look.Move(Look.Picture("shoe_press", area, Look.Piece("shoe_press")).rectTransform, new Vector2(64, 36));
            sole = Look.Picture("shoe_sole", area, Look.Frame("shoe_sole", 0));
            Look.Move(sole.rectTransform, new Vector2(91, 84));
            resin = Look.Block("resin", area, new Rect(SoleX, 83, 0, 1), Art.Color("#ffb347"));
            resinLight = Look.Block("resin_light", area, new Rect(SoleX, 82, 0, 1), Art.Color("#ffd86a"));
            upper = Look.Picture("shoe_upper", area, Look.Frame("shoe_upper", 0));
            bar = Look.Picture("press_bar", area, Look.Piece("press_bar"));
            pegs = new Image[Pegs];
            for (var k = 0; k < Pegs; k++)
            {
                pegs[k] = Look.Picture("shoe_peg", area, Look.Frame("shoe_peg", 0));
                Look.Move(pegs[k].rectTransform, new Vector2(98 + 20 * k, 26));
            }
            iron = Look.Picture("brass_iron", area, Look.Frame("brass_iron", 0));
            hammer = Look.Picture("peg_hammer", area, Look.Frame("peg_hammer", 3));
            smoke = Look.Picture("resin_smoke", area, Look.Frame("resin_smoke", 0));
            Look.Move(smoke.rectTransform, new Vector2(5, 48));
            driven = new Pips(area, new Vector2(Size.x - Pips.Width(Pegs) - 6, 6), Pegs);
            gauging = Look.Node("gauging", area);
            meter = new Meter(gauging, new Vector2(0, Wall + 4), Size.x) { Sweet = Warm };
        }

        public override void Reset()
        {
            // burnt damar starts the bowl over; a split peg is swapped for a new one, the pegs driven staying driven
            if (burnt) melted = strokes = 0;
            burnt = split = false;
            t = heat = finished = 0;
            struck = -1;
            last = 0;
            meter.Sweet = Heating ? Warm : Upright;
            driven.Count = set;
            Show();
        }

        // Where the hammer leans, -1 to 1, as it swings over the next peg.
        float Lean => Mathf.Sin(t * Swing);

        // The forge as far as the work has gone: the heater's flame and the damar in the bowl, the iron at the bowl or on
        // the sole with the resin laid behind it, the press bar's gap, the pegs and the hammer over the next one.
        void Show()
        {
            Look.SetSprite(heater, Look.Frame("candle_heater", !Heating ? 0 : heat < 0.25f ? 0 : heat < Warm.Item1 ? 1 : heat < Warm.Item2 ? 2 : 3));
            Look.SetSprite(bowl, Look.Frame("resin_bowl", burnt ? 4 : Heating && heat > Warm.Item2 ? 3 : melted >= Melt ? 2 : melted > Melt / 2 ? 1 : 0));
            smoke.gameObject.SetActive(burnt);
            if (burnt) Look.SetSprite(smoke, Look.Frame("resin_smoke", Mathf.Min(2, (int)(t * 4) % 3)));

            var laid = SoleLength * strokes / Strokes;
            iron.gameObject.SetActive(Heating || Spreading);
            Look.SetSprite(iron, Look.Frame("brass_iron", Heating ? (heat >= Warm.Item1 ? 1 : 0) : 1));
            Look.Move(iron.rectTransform, Heating ? new Vector2(11, 64) : new Vector2(Mathf.Round(SoleX + laid - 2), 69));
            Look.Place(resin.rectTransform, new Rect(SoleX, 83, laid, 1));
            Look.Place(resinLight.rectTransform, new Rect(SoleX, 82, laid, 1));

            var fresh = !Heating && !Spreading && set == Pegs ? 1 : 0;
            Look.SetSprite(upper, Look.Frame("shoe_upper", fresh));
            Look.SetSprite(sole, Look.Frame("shoe_sole", fresh));
            var gap = Mathf.Round(Gap - (float)Gap * set / Pegs);
            Look.Move(upper.rectTransform, new Vector2(95, 56 - gap));
            Look.Move(bar.rectTransform, new Vector2(74, 56 - gap - 5));
            for (var k = 0; k < Pegs; k++) Look.SetSprite(pegs[k], Look.Frame("shoe_peg", k < set ? 1 : k == set && split ? 2 : 0));

            hammer.gameObject.SetActive(Pegging);
            var down = struck >= 0 && t - struck < Strike;
            var lean = down ? 3 : Mathf.Clamp(Mathf.RoundToInt(Lean * 3) + 3, 0, 6);
            Look.SetSprite(hammer, Look.Frame("peg_hammer", lean));
            Look.Move(hammer.rectTransform, new Vector2(101 + 20 * set - 14, down ? 6 : 0));

            gauging.gameObject.SetActive(!Spreading);
            meter.Value = Heating ? heat : 0.5f + Lean / 2;
            meter.Sweet = Heating ? Warm : Upright;
        }

        public override Outcome Tick()
        {
            var dt = Time.deltaTime;
            t += dt;
            var outcome = Heating ? Heat(dt) : Spreading ? Spread() : Pegging ? Peg() : Done(dt);
            Show();
            return outcome;
        }

        Outcome Heat(float dt)
        {
            heat = Mathf.Clamp01(heat + (Controls.Holding ? Rise : -Cool) * dt);
            if (heat > Boil)
            {
                burnt = true;
                t = 0;
                Sound.Play("hiss");
                return Outcome.FailA;
            }
            meter.Value = heat;
            if (!meter.InSweet) return Outcome.Playing;
            melted += dt;
            if (melted >= Melt) Sound.Play("bubble");
            return Outcome.Playing;
        }

        Outcome Spread()
        {
            var way = Controls.Left ? -1 : Controls.Right ? 1 : 0;
            if (way == 0 || way == last) return Outcome.Playing; // the same key again only scrapes
            last = way;
            strokes++;
            Sound.Play("scrub");
            if (strokes == Strokes)
            {
                t = 0;
                Sound.Play("wax_press");
            }
            return Outcome.Playing;
        }

        Outcome Peg()
        {
            if (!Controls.Interact) return Outcome.Playing;
            meter.Value = 0.5f + Lean / 2;
            if (!meter.InSweet)
            {
                split = true;
                Sound.Play("trrak");
                return Outcome.FailB;
            }
            struck = t;
            driven.Count = ++set;
            meter.Sparks();
            Sound.Play("thump");
            return Outcome.Playing;
        }

        // The last peg home: a moment to see the shoe come out of the press restored.
        Outcome Done(float dt)
        {
            finished += dt;
            return finished >= Finish ? Outcome.Won : Outcome.Playing;
        }

        public override void Solve()
        {
            melted = Melt;
            strokes = Strokes;
            set = Pegs;
            driven.Count = set;
            Show();
        }
    }
}
