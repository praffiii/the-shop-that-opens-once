using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Minigame 4B, the waterlogged blueprint on Sam's table in the vault room (Night 4). First three sheets of blotting
    /// paper are rolled flat over the soaked bridge blueprint with A and D, edge to edge, and each lifts off wet, the
    /// paper drier under it. Then the brass tweezers lift the three map fragments off the felt tray into the holes along
    /// the colony's boundary line: W squeezes and S eases, a fragment lifts once the grip is in the glow, and the hand
    /// tightens as it carries, so it must be eased; pinched past the glow the wet paper tears (fail A, and the fragments
    /// go back on the tray). Last, Space held fans the ink dry with the bamboo fan: three seconds in the glow, but fanned
    /// too hard the ink runs (fail B). The sheets already blotted stay blotted, and the fragments laid stay laid.
    /// </summary>
    public sealed class BlueprintRestore : Minigame
    {
        const int Sheets = 3, Fragments = 3, Columns = 16, DryingSteps = 6;
        /// <summary>The blueprint on the table, a sheet column's width, how fast the roller goes (px/s), how near it presses, and the next sheet's wait.</summary>
        static readonly Rect Paper = new(64, 4, 128, 58);
        const float Column = 8f, Roll = 80f, Press = 6f, NextSheet = 0.5f, BlotEvery = 12f;
        /// <summary>Each fragment's place on the felt tray, and its hole in the blueprint.</summary>
        static readonly Vector2[] Tray = { new(18, 7), new(18, 28), new(18, 49) };
        static readonly Vector2[] Holes = { new(8, 30), new(40, 30), new(72, 30) };
        /// <summary>A W or S press on the tweezers, how fast the hand tightens while it carries, the glow, where the paper tears, and the carry's seconds.</summary>
        const float Squeeze = 0.12f, Tighten = 0.2f, Tear = 0.86f, Carry = 1.8f, Arc = 10f;
        static readonly (float, float) Gentle = (0.45f, 0.72f);
        /// <summary>How fast the fan's wind rises while held and falls when let go, its glow, where the ink runs, and the seconds of drying.</summary>
        const float Rise = 0.35f, Fall = 0.6f, Gale = 0.85f, Drying = 3f;
        static readonly (float, float) Breeze = (0.3f, 0.7f);
        static readonly int[] Sway = { 0, 1, 2, 3, 2, 1 };
        /// <summary>The ink's tint while it is still wet.</summary>
        static readonly Color Damp = new(0.85f, 0.9f, 1f);

        readonly bool[] pressed = new bool[Columns];
        RectTransform area, blotting, placing, gauging, fanning;
        Texture2D sheetArt;
        Image paper, roller, tweezers, fan, run;
        Image[] sheet, fragments, wind;
        Pips blotted, laid, dry;
        Meter meter;
        float t, roll, rolled, waiting, grip, carried, breeze, dried, swayed;
        int sheets, placed, swing;
        bool lifted, torn;

        public override string Title => "The waterlogged blueprint";
        public override (string Key, string Text)[] Instructions => new[]
        {
            ("A/D", "Roll the blotting paper flat, edge to edge."),
            ("W/S", "Squeeze or ease the tweezers; keep the grip in the glow."),
            ("Space", "Hold to fan the ink dry, gently, in the glow."),
        };
        public override (string Who, string Line) FailA => ("sam", "Gently, Satria! Twenty-year-old wet paper is like a butterfly's wing! Use the blunt edge of the tweezers, don't press sharp! Try again with the piece in the left corner.");
        public override (string Who, string Line) FailB => ("courier", "The fan has to be gentle... too strong a wind will blow the fragile fibres apart.");
        public override Vector2 Size => new(200, 98);

        bool Blotting => sheets < Sheets;
        bool Placing => !Blotting && placed < Fragments;

        public override void Build(RectTransform area)
        {
            this.area = area;
            Look.Panel("tabletop", area, new Rect(0, 0, Size.x, 76));
            Look.Panel("felt_tray", area, new Rect(4, 2, 52, 72));
            paper = Look.Picture("blueprint", area, Look.Frame("blueprint", 0));
            Look.Move(paper.rectTransform, Paper.position);
            fragments = new Image[Fragments];
            for (var k = 0; k < Fragments; k++) fragments[k] = Look.Picture("fragment", area, Look.Frame("fragment", k * 2));
            run = Look.Picture("ink_run", area, Look.Piece("ink_run"));
            Look.Move(run.rectTransform, Paper.position);
            var below = new Vector2(0, Paper.yMax + 2);

            blotting = Look.Node("blotting", area);
            sheetArt = Art.Texture("ui/sheet");
            sheet = new Image[Columns];
            for (var c = 0; c < Columns; c++)
            {
                sheet[c] = Look.Picture("sheet", blotting);
                Look.Move(sheet[c].rectTransform, Paper.position + new Vector2(c * Column, 0));
            }
            roller = Look.Picture("roller", blotting, Look.Frame("roller", 0));
            blotted = new Pips(blotting, below + new Vector2(Mid(Sheets), 0), Sheets);

            placing = Look.Node("placing", area);
            tweezers = Look.Picture("tweezers", placing, Look.Frame("tweezers", 0));
            laid = new Pips(placing, below + new Vector2(Mid(Fragments), 0), Fragments);

            fanning = Look.Node("fanning", area);
            wind = new Image[6];
            for (var i = 0; i < wind.Length; i++) wind[i] = Look.Block("wind", fanning, new Rect(0, 0, 5, 1), Look.Cream);
            fan = Look.Picture("fan", fanning, Look.Frame("fan", 1));
            Look.Move(fan.rectTransform, new Vector2(16, 18));
            dry = new Pips(fanning, below + new Vector2(Mid(DryingSteps), 0), DryingSteps);

            gauging = Look.Node("gauging", area);
            meter = new Meter(gauging, new Vector2(0, 80), Size.x) { Sweet = Gentle };
        }

        // Where a row of steps starts, to sit centred under the blueprint.
        static float Mid(int steps) => Mathf.Round(Paper.x + (Paper.width - Pips.Width(steps)) / 2);

        public override void Reset()
        {
            // the sheets blotted stay blotted, and the fragments laid stay laid; a tear sends them all back to the tray
            if (placed < Fragments) placed = 0;
            t = rolled = grip = carried = breeze = dried = swayed = 0;
            lifted = torn = false;
            swing = 0;
            run.gameObject.SetActive(false);
            laid.Count = placed;
            dry.Count = 0;
            meter.Sweet = Placing || Blotting ? Gentle : Breeze;
            Show();
        }

        // The table as far as the work has gone: the blueprint as dry as the sheets have left it, the sheet on it with its
        // pressed columns, the fragments on the tray, in the tweezers or in their holes, and the fan with its wind.
        void Show()
        {
            blotting.gameObject.SetActive(Blotting);
            placing.gameObject.SetActive(Placing);
            fanning.gameObject.SetActive(!Blotting && !Placing);
            gauging.gameObject.SetActive(!Blotting);
            Look.SetSprite(paper, Look.Frame("blueprint", Mathf.Min(sheets, Sheets)));
            var ink = Blotting ? Color.white : Color.Lerp(Damp, Color.white, dried / Drying);
            paper.color = ink;

            var showing = Blotting && waiting <= 0;
            for (var c = 0; c < Columns; c++)
            {
                sheet[c].gameObject.SetActive(showing);
                // each column cut from the fresh sheet or the pressed one
                Look.SetSprite(sheet[c], Art.Sprite(sheetArt, new RectInt(((pressed[c] ? 1 : 0) * Columns + c) * (int)Column, 0, (int)Column, (int)Paper.height)));
            }
            Look.SetSprite(roller, Look.Frame("roller", (int)(roll / 3)));
            Look.Move(roller.rectTransform, new Vector2(Paper.x + roll - 6, 0));

            for (var k = 0; k < Fragments; k++)
            {
                var at = k < placed ? Paper.position + Holes[k] : Tray[k];
                if (k == placed && lifted)
                {
                    var u = Mathf.SmoothStep(0, 1, carried / Carry);
                    at = Vector2.Lerp(Tray[k], Paper.position + Holes[k], u) + new Vector2(grip > Gentle.Item2 ? Mathf.Round(Mathf.Sin(t * 60)) : 0, -Mathf.Sin(u * Mathf.PI) * Arc);
                }
                Look.Move(fragments[k].rectTransform, at);
                Look.SetSprite(fragments[k], Look.Frame("fragment", k * 2 + (torn && k == placed ? 1 : 0)));
                fragments[k].color = k < placed ? ink : Color.white;
            }
            if (Placing)
            {
                // the tips on the fragment's middle, closing as the grip tightens
                var tip = Pos(fragments[placed]) + new Vector2(12, lifted ? 10 : 7);
                Look.Move(tweezers.rectTransform, tip - new Vector2(6, 31));
                Look.SetSprite(tweezers, Look.Frame("tweezers", grip < 0.2f ? 0 : grip < Gentle.Item1 ? 1 : grip <= Gentle.Item2 ? 2 : 3));
            }
            meter.Value = Placing ? grip : breeze;

            Look.SetSprite(fan, Look.Frame("fan", Sway[swing % Sway.Length]));
            for (var i = 0; i < wind.Length; i++)
            {
                wind[i].gameObject.SetActive(breeze > 0.05f);
                Look.Move(wind[i].rectTransform, new Vector2(46 + Mathf.Repeat(i * 29 + swayed * 40, Paper.xMax - 50), Paper.y + 8 + i * 9));
            }
        }

        static Vector2 Pos(Image img) => Look.Pos(img.rectTransform);

        public override Outcome Tick()
        {
            t += Time.deltaTime;
            var outcome = Blotting ? Blot() : Placing ? Place() : Fan();
            Show();
            return outcome;
        }

        Outcome Blot()
        {
            var dt = Time.deltaTime;
            var was = roll;
            roll = Mathf.Clamp(roll + Controls.Move.x * Roll * dt, 0, Paper.width);
            if (waiting > 0)
            {
                waiting -= dt;
                if (waiting <= 0) Sound.Play("page"); // a fresh sheet laid on
                return Outcome.Playing;
            }
            rolled += Mathf.Abs(roll - was);
            if (rolled >= BlotEvery)
            {
                rolled = 0;
                Sound.Play("blot");
            }
            var all = true;
            for (var c = 0; c < Columns; c++)
            {
                if (Mathf.Abs(roll - (c + 0.5f) * Column) <= Press) pressed[c] = true;
                all &= pressed[c];
            }
            if (!all) return Outcome.Playing;
            // the sheet is soaked through: it lifts off, and the blueprint under it is a step drier
            Main.Run(Lift());
            System.Array.Clear(pressed, 0, pressed.Length);
            blotted.Count = ++sheets;
            Sound.Play("page");
            if (Blotting) waiting = NextSheet;
            else meter.Sweet = Gentle;
            return Outcome.Playing;
        }

        // The soaked sheet peels up off the blueprint and away.
        async Awaitable Lift()
        {
            var peel = Look.Picture("peel", area, Look.Frame("sheet", 1));
            for (var s = 0f; s < 0.3f && peel; s += Time.deltaTime)
            {
                Look.Move(peel.rectTransform, Paper.position + new Vector2(0, -40 * s));
                peel.color = new Color(1, 1, 1, 1 - s / 0.3f);
                await Main.Frame();
            }
            if (peel) Object.Destroy(peel.gameObject);
        }

        Outcome Place()
        {
            if (Controls.Up || Controls.Down)
            {
                grip = Mathf.Clamp01(grip + (Controls.Up ? Squeeze : -Squeeze));
                Sound.Play("pinch");
            }
            if (lifted)
            {
                // the hand tightens as it carries
                grip += (Tighten + 0.08f * Mathf.Sin(t * 2.3f)) * Time.deltaTime;
                carried += Time.deltaTime;
            }
            if (grip > Tear)
            {
                torn = true;
                Sound.Play("tear");
                return Outcome.FailA;
            }
            meter.Value = grip;
            if (!lifted)
            {
                if (!meter.InSweet) return Outcome.Playing;
                lifted = true;
                carried = 0;
                Sound.Play("pop");
                return Outcome.Playing;
            }
            if (grip < Gentle.Item1)
            {
                // too slack: it slips out of the tips and back onto the felt
                lifted = false;
                Sound.Play("blot");
                return Outcome.Playing;
            }
            if (carried < Carry) return Outcome.Playing;
            lifted = false;
            grip = 0;
            laid.Count = ++placed;
            Sound.Play("page");
            if (!Placing) meter.Sweet = Breeze;
            return Outcome.Playing;
        }

        Outcome Fan()
        {
            var dt = Time.deltaTime;
            var held = Controls.Holding;
            breeze = Mathf.Clamp01(breeze + (held ? Rise : -Fall) * dt);
            if (breeze > Gale)
            {
                run.gameObject.SetActive(true);
                Sound.Play("whoosh");
                return Outcome.FailB;
            }
            if (held)
            {
                // the fan sways back and forth, quicker the harder it is fanned, wafting at each end of its swing
                swayed += dt * (3f + 12f * breeze);
                if ((int)swayed != swing)
                {
                    swing = (int)swayed;
                    if (Sway[swing % Sway.Length] % 3 == 0) Sound.Play("fan");
                }
            }
            meter.Value = breeze;
            if (held && meter.InSweet) dried += dt;
            dry.Count = Mathf.Min(DryingSteps, Mathf.FloorToInt(dried / Drying * DryingSteps));
            if (dried < Drying) return Outcome.Playing;
            meter.Sparks();
            Main.Run(Shine());
            return Outcome.Won;
        }

        // The dried ink glints, here and there along its lines.
        async Awaitable Shine()
        {
            var glints = new Image[7];
            for (var i = 0; i < glints.Length; i++)
                glints[i] = Look.Block("glint", area, new Rect(Paper.x + 10 + i * 17, Paper.y + 10 + i * 31 % 40, 2, 2), Color.white);
            for (var s = 0f; s < 0.8f && area; s += Time.deltaTime)
            {
                for (var i = 0; i < glints.Length; i++) glints[i].gameObject.SetActive(Mathf.Repeat(s * 8 + i * 0.37f, 1) < 0.5f);
                await Main.Frame();
            }
            foreach (var glint in glints)
                if (glint) Object.Destroy(glint.gameObject);
        }

        public override void Solve()
        {
            sheets = Sheets;
            placed = Fragments;
            dried = Drying;
            blotted.Count = Sheets;
            laid.Count = Fragments;
            dry.Count = DryingSteps;
            Show();
        }
    }
}
