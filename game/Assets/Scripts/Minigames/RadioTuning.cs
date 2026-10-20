using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Minigame 6A, Father's valve radio (Night 6): the old station found again at AM 740 kHz. Holding A or D turns the
    /// copper tuning knob, and the turn gathers speed the longer it is held; let go and it stops short. Turned faster
    /// than the gauge's glow, the capacitor's thin plates howl (fail A, WUUUUNGG); the needle run on past 740 has
    /// missed the station (fail B). Near 740 the static on the wave glass clears into the station's wave, which swells
    /// and ebbs with its hum: Space as it swells out to the brass marks clears the static (off the crest it is missed
    /// too: fail B). The tune frees a compartment at the back, and Daniel's savings book slides out. R puts the needle
    /// back at 700 kHz.
    /// </summary>
    public sealed class RadioTuning : Minigame
    {
        /// <summary>The dial's ends and the station on it (kHz), how near it the radio is in tune, and where the needle has run past it.</summary>
        const float Low = 700f, High = 760f, Station = 740f, Tune = 1f, Past = 743f;
        /// <summary>How fast holding the knob speeds the turn up and letting go stops it (kHz/s²), the speed the plates howl at (kHz/s), and where that falls on the gauge.</summary>
        const float Spin = 9f, Stop = 45f, Howl = 12f, Glow = 0.8f;
        /// <summary>Seconds the station's wave takes to swell and ebb, and how near its crest (0 to 1) Space catches it.</summary>
        const float Swell = 1.6f, Crest = 0.85f;
        /// <summary>How far either side of the station the static clears (kHz), and the seconds between its crackles while turning.</summary>
        const float Clears = 10f, Crackle = 0.3f;
        /// <summary>Where the pieces stand on the bench: the radio, the knob, the wave glass, and the book behind the radio and landed by it.</summary>
        static readonly Vector2 Radio = new(12, 2), Knob = new(77, 83), Scope = new(128, 10), BookIn = new(80, 72), BookOut = new(116, 76);
        /// <summary>The dial glass: 700 kHz at its left end, 71 px to 760, the needle's top; the wave's first column, middle row, crest and reach (px).</summary>
        const float Glass = 26f, Span = 71f, NeedleY = 68f, WaveX = 133f, WaveY = 33f, Amp = 13f, Reach = 18f;
        const int Columns = 70;
        const float SlideSeconds = 0.45f;
        static readonly Color Phosphor = Art.Color("#9ee6c4"), Lit = Art.Color("#ffffff");

        Image needle, knob, book;
        Image[] wave;
        Meter meter;
        float tuned, speed, t, crackled;
        bool cresting;

        public override string Title => "Father's radio";
        public override (string Key, string Text)[] Instructions => new[]
        {
            ("A/D", "Turn the copper knob toward 740; keep the gauge in the glow."),
            ("Space", "In tune, press as the wave swells out to the brass marks."),
        };
        public override (string Who, string Line) FailA => ("courier", "The turn's too sensitive... These copper capacitor plates are so thin. They have to be turned slowly, a millimetre at a time.");
        public override (string Who, string Line) FailB => ("courier", "Just missed the frequency... Listen closely for the old station's broadcast resonance.");
        public override Vector2 Size => new(220, 104 + Meter.Height);

        bool InTune => Mathf.Abs(tuned - Station) <= Tune;
        /// <summary>The station's wave, from ebbed (0) to swelled to its crest (1).</summary>
        float Swelling => (1 - Mathf.Cos(2 * Mathf.PI * t / Swell)) / 2;
        bool AtCrest => InTune && Swelling >= Crest;

        public override void Build(RectTransform area)
        {
            Look.Panel("tabletop", area, new Rect(0, 0, Size.x, 100));
            book = Look.Picture("book", area, Look.Piece("radio_book")); // behind the radio till it slides out
            Look.Move(Look.Picture("radio", area, Look.Piece("radio")).rectTransform, Radio);
            needle = Look.Picture("needle", area, Look.Piece("radio_needle"));
            knob = Look.Picture("knob", area, Look.Frame("radio_knob", 0));
            Look.Move(knob.rectTransform, Knob);
            Look.Move(Look.Picture("scope", area, Look.Piece("radio_scope")).rectTransform, Scope);
            wave = new Image[Columns];
            for (var i = 0; i < Columns; i++) wave[i] = Look.Block("wave", area, new Rect(WaveX + i, WaveY, 1, 2), Phosphor);
            meter = new Meter(area, new Vector2(0, 104), Size.x) { Sweet = (0f, Glow) };
        }

        public override void Reset()
        {
            tuned = Low;
            speed = t = crackled = 0;
            cresting = false;
            Look.Move(book.rectTransform, BookIn);
            Show();
        }

        // The needle at the tuning, the knob a step on for each kHz, the gauge at the turn's speed, and the wave: static
        // far from the station, clearing into its swelling wave near it, lit at the crest.
        void Show()
        {
            Look.Move(needle.rectTransform, new Vector2(Glass + (tuned - Low) / (High - Low) * Span - 2, NeedleY));
            Look.SetSprite(knob, Look.Frame("radio_knob", (int)(tuned - Low)));
            meter.Value = Mathf.Abs(speed) / Howl * Glow;
            var clear = Mathf.Clamp01(1 - Mathf.Abs(tuned - Station) / Clears);
            var height = Amp * clear * (0.35f + 0.65f * Swelling);
            var colour = AtCrest ? Lit : Phosphor;
            var last = 0f;
            for (var i = 0; i < Columns; i++)
            {
                var y = Mathf.Round(Mathf.Clamp(WaveY + height * Mathf.Sin(i * 0.36f + t * 6f) + (1 - clear) * Random.Range(-10f, 10f), WaveY - Reach, WaveY + Reach));
                if (i == 0) last = y;
                // each column reaches up or down to the last, so the trace runs unbroken
                Look.Place(wave[i].rectTransform, new Rect(WaveX + i, Mathf.Min(y, last), 1, Mathf.Abs(y - last) + 2));
                wave[i].color = colour;
                last = y;
            }
        }

        public override Outcome Tick()
        {
            var dt = Time.deltaTime;
            t += dt;
            var hold = Controls.Move.x;
            // held, the turn gathers speed; let go, or turned the other way, it stops short
            speed = Mathf.MoveTowards(speed, hold * 2 * Howl, (hold == 0 || hold * speed < 0 ? Stop : Spin) * dt);
            var was = tuned;
            tuned = Mathf.Clamp(tuned + speed * dt, Low, High);
            if (tuned == Low && speed < 0) speed = 0; // against the dial's stop
            if (Mathf.Abs(speed) > Howl)
            {
                Sound.Play("radio_howl");
                return Outcome.FailA;
            }
            if (tuned > Past)
            {
                Sound.Play("radio_static");
                return Outcome.FailB;
            }
            if (Mathf.FloorToInt(tuned) != Mathf.FloorToInt(was)) Sound.Play("click"); // the tuning's detent at each kHz
            crackled += dt;
            if (speed != 0 && !InTune && crackled > Crackle)
            {
                crackled = 0;
                Sound.Play("radio_crackle");
            }
            var crest = AtCrest;
            if (crest && !cresting) Sound.Play("radio_tone"); // the station's hum as its wave swells
            cresting = crest;
            Show();
            if (!Controls.Interact) return Outcome.Playing;
            if (!crest)
            {
                Sound.Play("radio_static");
                return Outcome.FailB;
            }
            Sound.Play("keroncong");
            Main.Run(Release());
            return Outcome.Won;
        }

        // The tune frees the compartment at the back, and Father's savings book slides out onto the bench.
        async Awaitable Release()
        {
            Sound.Play("latch");
            for (var s = 0f; s < SlideSeconds && book; s += Time.deltaTime)
            {
                Look.Move(book.rectTransform, Vector2.Lerp(BookIn, BookOut, Mathf.SmoothStep(0, 1, s / SlideSeconds)));
                await Main.Frame();
            }
            if (book) Look.Move(book.rectTransform, BookOut);
        }

        public override void Solve()
        {
            tuned = Station;
            speed = 0;
            t = Swell / 2;
            Show();
            Look.Move(book.rectTransform, BookOut);
        }
    }
}
