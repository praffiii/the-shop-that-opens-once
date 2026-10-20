using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Minigame 3B, Theo's darkroom (Night 3), all in the safelight's black and red: Daniel's last reel developed in the
    /// twenty-year-old developer. Space rocks the tank in a gentle rhythm, each rock as the gauge's needle reaches the
    /// glow, till the agitation's part of the timer is done; rocked too soon, or let stop, the developer spreads unevenly
    /// (fail B), and so does rocking it again while it stands. Meanwhile the bath warms and cools on its own: A drops in
    /// sea-water ice and D pours warm water from the kettle, to hold the thermometer between its notches at 20 and 22
    /// degrees, where alone the timer runs; past 24 the emulsion bubbles (fail A). When the timer rings, TING, Space lifts
    /// the film out: Daniel and the villagers fitting the emergency bridge's beams, clear in black and white.
    /// </summary>
    public sealed class Darkroom : Minigame
    {
        /// <summary>Seconds of agitation and of standing on the timer (it runs only in the band), and of a rock's beat on the gauge.</summary>
        const float Agitate = 8f, Stand = 5f, Beat = 1.6f;
        /// <summary>Where on the beat a rock lands well (ArtSource darkroom()'s agigauge band), and seconds after the agitation a last rock is still allowed.</summary>
        static readonly (float From, float To) Rhythm = (0.4f, 0.8f);
        const float Grace = 0.4f;
        /// <summary>The bath in degrees: the start, the band, where the emulsion bubbles, and how fast the ice and the kettle move it (a second).</summary>
        const float Start = 20f, Low = 20f, High = 22f, Boil = 24f, Coldest = 16f, Cool = 1.8f, Warm = 1.8f;
        /// <summary>The thermometer's column (ArtSource's thermo: 7 px a degree, 26 at the top of its tube), and the bulb it rises from.</summary>
        static readonly Vector2 Column = new(13, 14);
        const float PerDegree = 7f, TopDegree = 26f, Bulb = 86f;
        /// <summary>Seconds the film takes coming up out of the tank, and clearing; and between the timer's rings.</summary>
        const float LiftSeconds = 1.4f, Clears = 0.5f, Rings = 1.2f;
        static readonly Color Lit = Art.Color("#ff8058"), Hot = Art.Color("#ffc4a4"), Cold = Art.Color("#d84a2e");

        Image column, tank, bucket, kettle, stream, timer, gauge, needle, film, shine;
        RectTransform area;
        float heat, clock, since, stood, t, lifted, ringAt, iceAt, pourAt;
        int rock = 1, degree;
        bool started;

        public override string Title => "Theo's darkroom";
        public override (string Key, string Text)[] Instructions => new[]
        {
            ("Space", "Rock the tank gently, each time the needle reaches the glow."),
            ("A/D", "Ice or warm water: hold the thermometer between its notches."),
            ("Space", "When the timer rings, lift the film out."),
        };
        public override (string Who, string Line) FailA => ("theo", "Steady, Satria, don't panic! This old emulsion can't bear the heat. There, sea-water ice in the bucket. Pour in the cold stabilising water now, and we'll soak the film again in the fixer.");
        public override (string Who, string Line) FailB => ("courier", "The developer isn't spreading evenly over the celluloid... I have to keep the tank rocking steadily.");
        public override Vector2 Size => new(200, 104);

        bool InBand => heat >= Low && heat <= High;

        public override void Build(RectTransform area)
        {
            this.area = area;
            Look.Picture("darkroom", area, Look.Piece("darkroom"));
            Look.Move(Look.Picture("thermo", area, Look.Piece("thermo")).rectTransform, new Vector2(2, 6));
            column = Look.Block("column", area, default, Lit);
            Look.Move(Look.Picture("bath", area, Look.Piece("bath")).rectTransform, new Vector2(57, 52));
            tank = Look.Picture("tank", area, Look.Frame("tank", 0));
            Look.Move(tank.rectTransform, new Vector2(80, 18));
            Look.Move(Look.Picture("bath_front", area, Look.Piece("bath_front")).rectTransform, new Vector2(57, 59));
            bucket = Look.Picture("bucket", area, Look.Frame("bucket", 0));
            Look.Move(bucket.rectTransform, new Vector2(28, 50));
            stream = Look.Block("stream", area, new Rect(140, 38, 2, 17), Hot);
            kettle = Look.Picture("kettle", area, Look.Frame("kettle", 0));
            Look.Move(kettle.rectTransform, new Vector2(140, 30));
            timer = Look.Picture("timer", area, Look.Frame("devtimer", 0));
            Look.Move(timer.rectTransform, new Vector2(165, 4));
            gauge = Look.Picture("gauge", area, Look.Frame("agigauge", 0));
            Look.Move(gauge.rectTransform, new Vector2(60, 88));
            needle = Look.Picture("needle", area, Look.Piece("agineedle"));
            film = Look.Picture("film", area, Look.Frame("film", 0));
            shine = Look.Block("shine", film.transform, new Rect(0, 0, 3, film.rectTransform.sizeDelta.y), new Color(1, 1, 1, 0.55f));
        }

        public override void Reset()
        {
            // the solution settled again at 20 degrees, the film back in the tank
            heat = Start;
            degree = Mathf.FloorToInt(heat);
            clock = since = stood = t = 0;
            lifted = -1;
            started = false;
            ringAt = iceAt = pourAt = 0;
            Look.SetSprite(tank, Look.Frame("tank", 0));
            film.gameObject.SetActive(false);
            Show();
        }

        // The column at the bath's heat (flashing past the band), the needle on the beat while the tank is rocked and the
        // gauge dark while it stands, the timer's wedge as far as it has run, ringing at the end; the kettle pouring.
        void Show()
        {
            var top = Column.y + (TopDegree - heat) * PerDegree;
            Look.Place(column.rectTransform, new Rect(Column.x, Mathf.Round(top), 3, Bulb - Mathf.Round(top)));
            column.color = heat > High ? ((int)(Time.time * 6) % 2 == 0 ? Hot : Lit) : heat < Low ? Cold : Lit;
            var rocking = clock < Agitate;
            Look.SetSprite(gauge, Look.Frame("agigauge", rocking ? 0 : 1));
            needle.gameObject.SetActive(rocking);
            Look.Move(needle.rectTransform, new Vector2(60 + Mathf.Clamp01(since / Beat) * 76, 90));
            var ringing = clock >= Agitate + Stand;
            Look.SetSprite(timer, Look.Frame("devtimer", ringing ? 25 + (int)(Time.time * 10) % 2 : Mathf.FloorToInt(clock / (Agitate + Stand) * 24)));
            var pouring = started && lifted < 0 && Controls.Move.x > 0;
            Look.SetSprite(kettle, Look.Frame("kettle", pouring ? 1 : 0));
            stream.gameObject.SetActive(pouring);
            if (pouring) stream.color = (int)(Time.time * 12) % 2 == 0 ? Hot : Lit;
        }

        public override Outcome Tick()
        {
            var dt = Time.deltaTime;
            if (lifted >= 0) return Lift(dt);
            if (!started)
            {
                // nothing runs till the first rock
                if (Controls.Interact)
                {
                    started = true;
                    Rock();
                }
                Show();
                return Outcome.Playing;
            }
            t += dt;
            // the bath drifts warm, and now and then cooler, under the ice and the kettle
            var drift = 0.3f + 0.5f * Mathf.Sin(t * 0.6f + 0.5f);
            var hand = Controls.Move.x;
            heat = Mathf.Max(Coldest, heat + (drift + (hand < 0 ? hand * Cool : hand * Warm)) * dt);
            if (hand < 0 && Time.time >= iceAt)
            {
                iceAt = Time.time + 0.35f;
                Main.Run(Ice());
            }
            if (hand > 0 && Time.time >= pourAt)
            {
                pourAt = Time.time + 1f;
                Sound.Play("pour");
            }
            if (Mathf.FloorToInt(heat) != degree)
            {
                degree = Mathf.FloorToInt(heat);
                Sound.Play("tick");
            }
            if (heat > Boil)
            {
                Sound.Play("bubble");
                Main.Run(Bubbles());
                return Outcome.FailA;
            }
            var was = clock;
            if (InBand) clock = Mathf.Min(Agitate + Stand, clock + dt);
            if (was < Agitate && clock >= Agitate) Sound.Play("click"); // the timer past its agitation mark: let it stand
            since += dt;
            if (clock < Agitate)
            {
                if (Controls.Interact)
                {
                    if (since / Beat < Rhythm.From) return Outcome.FailB;
                    Rock();
                }
                else if (since >= Beat) return Outcome.FailB;
            }
            else if (clock < Agitate + Stand)
            {
                stood += dt;
                if (Controls.Interact && stood > Grace) return Outcome.FailB;
            }
            else
            {
                if (Time.time >= ringAt)
                {
                    ringAt = Time.time + Rings;
                    Sound.Play("alarm");
                }
                if (Controls.Interact)
                {
                    lifted = 0;
                    Look.SetSprite(tank, Look.Frame("tank", 3));
                    Sound.Play("slosh");
                }
            }
            Show();
            return Outcome.Playing;
        }

        // One rock of the tank, to the other side from the last, settling level again; the developer sloshes.
        void Rock()
        {
            since = 0;
            rock = -rock;
            Look.SetSprite(tank, Look.Frame("tank", rock < 0 ? 1 : 2));
            Sound.Play("slosh");
            Main.Run(Settle());
        }

        async Awaitable Settle()
        {
            await Main.Wait(0.22f);
            if (tank && lifted < 0) Look.SetSprite(tank, Look.Frame("tank", 0));
        }

        // The film coming up out of the tank still murky, then clearing as the light runs over it, Daniel's frames sharp.
        Outcome Lift(float dt)
        {
            lifted += dt;
            film.gameObject.SetActive(true);
            film.transform.SetAsLastSibling();
            var up = Mathf.Clamp01(lifted / 0.35f);
            Look.Move(film.rectTransform, new Vector2(36, Mathf.Lerp(60, 34, 1 - (1 - up) * (1 - up))));
            Look.SetSprite(film, Look.Frame("film", lifted < Clears ? 0 : 1));
            var sweep = (lifted - Clears) / 0.4f;
            shine.gameObject.SetActive(sweep is > 0 and < 1);
            Look.Move(shine.rectTransform, new Vector2(Mathf.Clamp01(sweep) * film.rectTransform.sizeDelta.x, 0));
            Show();
            return lifted >= LiftSeconds ? Outcome.Won : Outcome.Playing;
        }

        // A cube of ice scooped from the bucket and tossed into the bath's near end, a ring of ripples where it lands.
        async Awaitable Ice()
        {
            Look.SetSprite(bucket, Look.Frame("bucket", 1));
            var cube = Look.Picture("cube", area, Look.Piece("cube"));
            Vector2 from = new(39, 48), to = new(64, 54);
            for (var s = 0f; s < 0.25f && cube; s += Time.deltaTime)
            {
                var u = s / 0.25f;
                Look.Move(cube.rectTransform, Vector2.Lerp(from, to, u) + new Vector2(0, -14 * u * (1 - u) * 4));
                await Main.Frame();
            }
            if (!cube) return;
            Object.Destroy(cube.gameObject);
            if (bucket) Look.SetSprite(bucket, Look.Frame("bucket", 0));
            Sound.Play("ice");
            await Ripple(to + new Vector2(2, 2));
        }

        async Awaitable Ripple(Vector2 at)
        {
            var ring = Look.Block("ripple", area, new Rect(at, new Vector2(1, 1)), Hot);
            for (var s = 0f; s < 0.3f && ring; s += Time.deltaTime)
            {
                var w = 2 + Mathf.Round(s * 30);
                Look.Place(ring.rectTransform, new Rect(at.x - w / 2, at.y, w, 1));
                ring.color = new Color(Hot.r, Hot.g, Hot.b, 1 - s / 0.3f);
                await Main.Frame();
            }
            if (ring) Object.Destroy(ring.gameObject);
        }

        // Too hot: the emulsion bubbling up round the tank.
        async Awaitable Bubbles()
        {
            var bubbles = new Image[8];
            for (var i = 0; i < bubbles.Length; i++) bubbles[i] = Look.Block("bubble", area, new Rect(0, 0, 2, 2), Hot);
            for (var s = 0f; s < 0.7f && area; s += Time.deltaTime)
            {
                for (var i = 0; i < bubbles.Length; i++)
                {
                    var rise = Mathf.Repeat(s * 40 + i * 5, 18);
                    Look.Move(bubbles[i].rectTransform, new Vector2(82 + i * 5 + Mathf.Sin(s * 14 + i) * 1.5f, 56 - rise));
                }
                await Main.Frame();
            }
            foreach (var bubble in bubbles)
                if (bubble) Object.Destroy(bubble.gameObject);
        }

        public override void Solve()
        {
            clock = Agitate + Stand;
            lifted = LiftSeconds;
            Look.SetSprite(tank, Look.Frame("tank", 3));
            Lift(0);
        }
    }
}
