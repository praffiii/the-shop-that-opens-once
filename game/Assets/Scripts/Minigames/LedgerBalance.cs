using System.Globalization;
using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Minigame 6B, Marcus Bell's station ledger (Night 6), balanced at home. The debit page holds the bridge beams'
    /// 4,800 perak; the credit page Father's wages given for them, a line a year, and only five years are entered. W
    /// enters the next year and S takes the last one out, the brass scale on the gutter levelling as the two totals
    /// agree. A and D carry the station stamp along the settlement row: it hangs from the hand, leaning as it is carried
    /// and swinging past straight as it stops. Space presses it with the red wax seal of the 1952 service. While the
    /// books don't balance the ink spills (fail A); off the brass duty seal in the PAID IN FULL WITH FAMILY LOVE box, or
    /// pressed while it swings, it lands crooked (fail B). The years entered stay entered; R cleans the ink away for a
    /// fresh stamp.
    /// </summary>
    public sealed class LedgerBalance : Minigame
    {
        const int Years = 10, Entered = 5, Wage = 480, Spent = 4800;
        /// <summary>The first credit line and the lines' pitch; the totals' right edges and their row.</summary>
        static readonly Vector2 Lines = new(144, 23);
        const float Pitch = 6f, DebitRight = 103f, CreditRight = 239f, TotalY = 86f;
        /// <summary>The scale on the gutter.</summary>
        static readonly Vector2 Scale = new(106, 56);
        /// <summary>The stamp, by its middle: how far it is carried either way, the height its frame hangs at, and how far it drops to press.</summary>
        const float Leftmost = 36f, Rightmost = 212f, Hang = 89f, Drop = 12f;
        /// <summary>The duty seal's middle in its box, and how far off it (px) and how far from hanging straight (degrees) a stamp still lands square.</summary>
        static readonly Vector2 Seal = new(165, 134);
        const float Square = 7f, Straight = 1.5f;
        /// <summary>How fast the stamp is carried (px/s) and gets up to it (px/s²); its swing's spring and damping, and how far it leans (degrees a px/s).</summary>
        const float Carry = 80f, Grip = 500f, Spring = 70f, Damp = 3.5f, Lean = 0.08f;
        /// <summary>Degrees between the stamp's frames; and seconds a line takes to ink in, the stamp to press, and the seal to pop.</summary>
        const float Step = 3f, InkSeconds = 0.25f, PressSeconds = 0.16f, PopSeconds = 0.2f;
        static readonly Color Short = Art.Color("#a8403e"); // roofR3: the red ink of a total that falls short

        Image[] lines;
        Image scale, stamp, mark, wax;
        Text credit;
        int entered = Entered;
        float x, speed, tilt, swing;

        public override string Title => "Marcus Bell's ledger";
        public override (string Key, string Text)[] Instructions => new[]
        {
            ("W/S", "Enter a year of Father's wages, or take one out, till the scale levels."),
            ("A/D", "Carry the station stamp to PAID IN FULL WITH FAMILY LOVE."),
            ("Space", "Press it square on the brass duty seal, hanging straight."),
        };
        public override (string Who, string Line) FailA => ("courier", "There's still a gap in the figures... Father gave his wages for ten whole years, not just five.");
        public override (string Who, string Line) FailB => ("courier", "Crooked... Set the stamp straight, square over the brass duty seal.");
        public override Vector2 Size => new(248, 160);

        int Credit => entered * Wage;

        public override void Build(RectTransform area)
        {
            Look.Picture("ledger", area, Look.Piece("ledger"));
            lines = new Image[Years];
            for (var i = 0; i < Years; i++)
            {
                lines[i] = Look.Picture("line", area, Look.Frame("ledger_line", i));
                lines[i].type = Image.Type.Filled; // inked in from the left as it is entered
                lines[i].fillMethod = Image.FillMethod.Horizontal;
                Look.Move(lines[i].rectTransform, Lines + new Vector2(0, i * Pitch));
            }
            scale = Look.Picture("scale", area, Look.Frame("ledger_scale", 0));
            Look.Move(scale.rectTransform, Scale);
            var debit = Look.Label(Spent.ToString("#,0", CultureInfo.InvariantCulture), area);
            Look.Move(debit.rectTransform, new Vector2(DebitRight - Look.Width(debit), TotalY));
            credit = Look.Label("", area);
            mark = Look.Picture("mark", area);
            wax = Look.Picture("wax", area, Look.Piece("ledger_wax"));
            Look.Move(wax.rectTransform, Seal + new Vector2(14, 4));
            stamp = Look.Picture("stamp", area, Look.Frame("ledger_stamp", 2));
        }

        public override void Reset()
        {
            x = Leftmost;
            speed = tilt = swing = 0;
            Look.SetSprite(mark, null);
            wax.gameObject.SetActive(false);
            Show();
        }

        // The years entered, the credit total (red while it falls short), the scale tipped toward the debit till level,
        // and the stamp where it is carried, at its swing.
        void Show()
        {
            for (var i = 0; i < Years; i++) lines[i].gameObject.SetActive(i < entered);
            Look.SetText(credit, Credit.ToString("#,0", CultureInfo.InvariantCulture));
            credit.color = Credit == Spent ? Look.Ink : Short;
            Look.Move(credit.rectTransform, new Vector2(CreditRight - Look.Width(credit), TotalY));
            Look.SetSprite(scale, Look.Frame("ledger_scale", 4 * Credit / Spent));
            Look.SetSprite(stamp, Look.Frame("ledger_stamp", Mathf.Clamp(Mathf.RoundToInt(tilt / Step) + 2, 0, 4)));
            Look.Move(stamp.rectTransform, new Vector2(x - 36, Hang));
        }

        public override Outcome Tick()
        {
            if (Controls.Up && entered < Years)
            {
                Main.Run(Ink(lines[entered++]));
                Sound.Play(Credit == Spent ? "right" : "pen");
            }
            else if (Controls.Down && entered > 0)
            {
                entered--;
                Sound.Play("page");
            }
            else if (Controls.Up || Controls.Down) Sound.Play("pop"); // no year left to enter, or to take out

            var dt = Time.deltaTime;
            speed = Mathf.MoveTowards(speed, Controls.Move.x * Carry, Grip * dt);
            x += speed * dt;
            if (x < Leftmost || x > Rightmost)
            {
                x = Mathf.Clamp(x, Leftmost, Rightmost);
                speed = 0;
            }
            // it hangs from the hand: carried, it leans back from the way it goes; stopped, it swings past straight and settles
            swing += (Spring * (speed * Lean - tilt) - Damp * swing) * dt;
            tilt += swing * dt;
            Show();
            if (!Controls.Interact) return Outcome.Playing;
            Main.Run(Press());
            if (Credit != Spent)
            {
                Mark(2);
                Sound.Play("ink_spill");
                return Outcome.FailA;
            }
            Sound.Play("thump");
            if (Mathf.Abs(x - Seal.x) > Square || Mathf.Abs(tilt) > Straight)
            {
                Mark(1);
                return Outcome.FailB;
            }
            Mark(0);
            Main.Run(Sealed());
            return Outcome.Won;
        }

        // The stamp's mark on the page under it: square, crooked or the ink spilt.
        void Mark(int frame)
        {
            Look.SetSprite(mark, Look.Frame("ledger_mark", frame));
            Look.Move(mark.rectTransform, new Vector2(x - 36, Seal.y - 20));
        }

        // A year's line inks in from the left.
        static async Awaitable Ink(Image line)
        {
            for (var t = 0f; t < InkSeconds && line; t += Time.deltaTime)
            {
                line.fillAmount = t / InkSeconds;
                await Main.Frame();
            }
            if (line) line.fillAmount = 1;
        }

        // The stamp comes down on the page and lifts again.
        async Awaitable Press()
        {
            var at = new Vector2(x - 36, Hang);
            for (var t = 0f; t < PressSeconds && stamp; t += Time.deltaTime)
            {
                Look.Move(stamp.rectTransform, at + new Vector2(0, Drop * Mathf.Sin(Mathf.PI * t / PressSeconds)));
                await Main.Frame();
            }
            if (stamp) Look.Move(stamp.rectTransform, at);
        }

        // As the stamp lifts, the red wax seal is pressed by its mark: it swells and settles, about its middle.
        async Awaitable Sealed()
        {
            await Main.Wait(PressSeconds);
            if (!wax) return;
            wax.gameObject.SetActive(true);
            Sound.Play("wax_press");
            var seal = wax.rectTransform;
            var (at, size) = (seal.anchoredPosition, seal.sizeDelta);
            for (var t = 0f; t < PopSeconds && seal; t += Time.deltaTime)
            {
                var grow = 0.6f * (1 - t / PopSeconds);
                seal.localScale = Vector3.one * (1 + grow);
                seal.anchoredPosition = at + new Vector2(-grow * size.x, grow * size.y) / 2;
                await Main.Frame();
            }
            if (!seal) return;
            seal.localScale = Vector3.one;
            seal.anchoredPosition = at;
        }

        public override void Solve()
        {
            entered = Years;
            x = Seal.x;
            speed = tilt = swing = 0;
            Show();
            Mark(0);
            wax.gameObject.SetActive(true);
        }
    }
}
