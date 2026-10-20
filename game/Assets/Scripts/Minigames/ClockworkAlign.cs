using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Minigame 1B, the clockwork of Marcus's watch on the Mender's bench (Night 1). The great wheel, the third wheel and
    /// the escape wheel are seated in turn from the left: W and S pick one, A and D turn it a step, and it is seated when
    /// its red mark points up at the plate's arrow. Turning one before the wheel on its left is seated slips it (fail A).
    /// Then the pendulum swings, its rate wandering, and Space sets the watch going while it reads 3.0 Hz (outside the
    /// band the spring jams: fail B).
    /// </summary>
    public sealed class ClockworkAlign : Minigame
    {
        const int Steps = 12;
        /// <summary>Each wheel's piece, its middle on the bench and how far its teeth reach.</summary>
        static readonly (string Piece, Vector2 At, float Reach)[] Wheels =
        {
            ("gear_great", new(38, 33), 23), ("gear_third", new(78, 33), 17), ("gear_escape", new(106, 33), 12),
        };
        static readonly int[] Start = { 5, 8, 3 };
        /// <summary>The pendulum's rate on the meter, from its left end to its right, in Hz; and the band that sets the watch going.</summary>
        const float SlowHz = 2f, FastHz = 4f;
        static readonly (float, float) Band = (0.44f, 0.56f);

        readonly int[] turned = new int[3];
        Image[] gears, seats;
        Image bracket, pendulum;
        Meter meter;
        Text rate;
        int picked;
        float t;

        public override string Title => "The watch's wheels";
        public override (string Key, string Text)[] Instructions => new[]
        {
            ("W/S", "Pick a wheel, from the left."),
            ("A/D", "Turn it till its red mark points up."),
            ("Space", "Set it going at 3.0 Hz."),
        };
        public override (string Who, string Line) FailA => ("mender", "Easy, Satria. Old clockwork is like an old ant: don't force it, don't hurry it. Breathe. We'll seat them again, from the great wheel on the left.");
        public override (string Who, string Line) FailB => ("courier", "It's running a beat too fast... Twenty years still. No wonder its insides need time to find their rhythm again.");
        public override Vector2 Size => new(200, 92);

        bool Seated(int i) => turned[i] == 0;
        bool AllSeated => Seated(0) && Seated(1) && Seated(2);

        public override void Build(RectTransform area)
        {
            Look.Panel("baize", area, new Rect(0, 0, Size.x, 70));
            gears = new Image[Wheels.Length];
            seats = new Image[Wheels.Length];
            for (var i = 0; i < Wheels.Length; i++)
            {
                var (piece, at, reach) = Wheels[i];
                gears[i] = Look.Picture(piece, area, Look.Frame(piece, 0));
                Look.Move(gears[i].rectTransform, at - Vector2.one * Mathf.Floor(gears[i].rectTransform.sizeDelta.x / 2));
                Look.Move(Look.Picture("arrow", area, Look.Frame("notch", 0)).rectTransform, new Vector2(at.x - 2, at.y - reach - 4));
                seats[i] = Look.Picture("seat", area, Look.Frame("pip", 0));
                Look.Move(seats[i].rectTransform, new Vector2(at.x - 4, at.y + reach + 4));
            }
            bracket = Look.Panel("bracket", area);
            pendulum = Look.Picture("pendulum", area, Look.Frame("pendulum", 3));
            Look.Move(pendulum.rectTransform, new Vector2(146, 6));
            rate = Look.Label("", area, default, Look.Cream);
            meter = new Meter(area, new Vector2(0, 74), Size.x) { Sweet = Band };
        }

        public override void Reset()
        {
            Start.CopyTo(turned, 0);
            picked = 0;
            t = 0;
            Show();
        }

        // The wheels as turned, the one in hand bracketed, each seated wheel's socket lit, and the meter at rest till all three are.
        void Show()
        {
            for (var i = 0; i < Wheels.Length; i++)
            {
                Look.SetSprite(gears[i], Look.Frame(Wheels[i].Piece, turned[i]));
                Look.SetSprite(seats[i], Look.Frame("pip", Seated(i) ? 1 : 0));
            }
            var (_, at, reach) = Wheels[picked];
            Look.Place(bracket.rectTransform, new Rect(at.x - reach - 4, at.y - reach - 4, 2 * reach + 9, 2 * reach + 9));
            bracket.gameObject.SetActive(!AllSeated);
            if (AllSeated) return;
            // still: the needle rests at its stop and there is no rate to read
            meter.Value = 0;
            Look.SetText(rate, "-.- Hz");
            Look.Move(rate.rectTransform, new Vector2(146, 53));
        }

        public override Outcome Tick()
        {
            if (!AllSeated) return Seat();
            t += Time.deltaTime;
            // the rate wanders through the band and out again, never resting in it
            var v = 0.5f + 0.42f * Mathf.Sin(t * 1.1f) + 0.06f * Mathf.Sin(t * 3.7f);
            meter.Value = v;
            var hz = Mathf.Lerp(SlowHz, FastHz, v);
            Look.SetText(rate, $"{hz:0.0} Hz");
            Look.Move(rate.rectTransform, new Vector2(146, 53));
            Look.SetSprite(pendulum, Look.Frame("pendulum", Mathf.RoundToInt((Mathf.Sin(t * Mathf.PI * hz / 2) + 1) * 3)));
            if (!Controls.Interact) return Outcome.Playing;
            if (!meter.InSweet) return Outcome.FailB;
            meter.Sparks();
            Sound.Play("ticktock");
            return Outcome.Won;
        }

        Outcome Seat()
        {
            if (Controls.Up || Controls.Down)
            {
                picked = (picked + (Controls.Down ? 1 : Wheels.Length - 1)) % Wheels.Length;
                Sound.Play("pop");
            }
            else if (Controls.Left || Controls.Right)
            {
                if (picked > 0 && !Seated(picked - 1))
                {
                    Sound.Play("ting");
                    return Outcome.FailA;
                }
                turned[picked] = (turned[picked] + (Controls.Right ? Steps - 1 : 1)) % Steps;
                Sound.Play("click");
                if (Seated(picked))
                {
                    Sound.Play("latch");
                    if (picked < Wheels.Length - 1) picked++; // on to the next wheel
                }
            }
            else return Outcome.Playing;
            Show();
            return Outcome.Playing;
        }

        public override void Solve()
        {
            System.Array.Clear(turned, 0, turned.Length);
            Show();
            meter.Value = 0.5f;
        }
    }
}
