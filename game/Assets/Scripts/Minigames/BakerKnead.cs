using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Minigame 1A, the Baker's sifting and kneading (Night 1). First the flour is sifted into the basin to the
    /// metronome's 75 BPM: A as its arm reaches the left, D as it reaches the right, eight good shakes (a wrong key, a
    /// shake off the beat or two in one beat spills it: fail A). Then the dough is kneaded: Space as the closing ring
    /// meets the glowing one, five times (a press outside it leaves the dough stiff: fail B, and the flour stays sifted).
    /// </summary>
    public sealed class BakerKnead : Minigame
    {
        const int Shakes = 8, Kneads = 5;
        /// <summary>Seconds a beat at 75 BPM, and how far either side of it a shake still lands on it.</summary>
        const float Beat = 0.8f, OnBeat = 0.17f;
        /// <summary>Seconds the ring takes to close, and the ring frames (2 px apart from 6 px) that meet the sweet ring's 15 px.</summary>
        const float Closing = 1.3f;
        const int RingFrames = 12, SweetFrom = 3, SweetTo = 5;
        /// <summary>Where the pieces stand on the floured table (the table's top at Table).</summary>
        static readonly Vector2 Bowl = new(67, 34), Sieve = new(77, 0), Ring = new(69, 2);
        const float Table = 50, FallSeconds = 0.35f;

        RectTransform area, sifting, kneading;
        Image metronome, sieve, basin, dough, ring;
        Pips shaken, kneaded;
        float t;
        int shakes, kneads, lastBeat, ticked;

        public override string Title => "Sift and knead";
        public override (string Key, string Text)[] Instructions => new[]
        {
            ("A/D", "Shake the sieve as the arm ticks left, then right."),
            ("Space", "Press the dough as the ring meets the glow."),
        };
        public override (string Who, string Line) FailA => ("baker", "Ha! Easy, Satria, easy! Bread wants a gentle hand and a patient heart, not parcels flung about like in the city. There's flour aplenty. Wipe your face at the bucket and we'll start again from the first sift.");
        public override (string Who, string Line) FailB => ("courier", "My hands are too stiff... Kneading wants soft palms. Loosen up and follow the dough.");
        public override Vector2 Size => new(200, 93);

        public override void Build(RectTransform area)
        {
            this.area = area;
            Look.Panel("tabletop", area, new Rect(0, Table, Size.x, Size.y - Table));
            foreach (var (x, y) in new[] { (12, 4), (52, 9), (148, 3), (171, 10), (126, 7), (34, 12) })
                Look.Block("flour", area, new Rect(x, Table + y, 2, 1), Look.Cream); // flour dusting the planks
            basin = Look.Picture("basin", area, Look.Frame("basin", 0));
            Look.Move(basin.rectTransform, Bowl);
            sifting = Look.Node("sifting", area);
            metronome = Look.Picture("metronome", sifting, Look.Frame("metronome", 0));
            Look.Move(metronome.rectTransform, new Vector2(20, 26));
            sieve = Look.Picture("sieve", sifting, Look.Frame("sieve", 1));
            Look.Move(sieve.rectTransform, Sieve);
            shaken = new Pips(sifting, new Vector2(Mathf.Round((Size.x - Pips.Width(Shakes)) / 2), 72), Shakes);
            kneading = Look.Node("kneading", area);
            dough = Look.Picture("dough", kneading, Look.Frame("dough", 0));
            Look.Move(dough.rectTransform, new Vector2(81, 24));
            Look.Move(Look.Picture("sweet", kneading, Look.Piece("ring_sweet")).rectTransform, Ring);
            ring = Look.Picture("ring", kneading, Look.Frame("ring", RingFrames - 1));
            Look.Move(ring.rectTransform, Ring);
            kneaded = new Pips(kneading, new Vector2(Mathf.Round((Size.x - Pips.Width(Kneads)) / 2), 72), Kneads);
        }

        public override void Reset()
        {
            // a fail at the dough keeps the flour sifted
            if (shakes < Shakes) shakes = 0;
            t = 0;
            kneads = 0;
            lastBeat = ticked = -1;
            shaken.Count = shakes;
            kneaded.Count = 0;
            Show();
        }

        // The sifting or the kneading on the bench, with the basin as full as the sifting has made it.
        void Show()
        {
            var sifted = shakes == Shakes;
            sifting.gameObject.SetActive(!sifted);
            kneading.gameObject.SetActive(sifted);
            Look.SetSprite(basin, Look.Frame("basin", shakes / 2));
            Look.SetSprite(dough, Look.Frame("dough", kneads == 0 ? 0 : 2 - kneads % 2));
        }

        public override Outcome Tick()
        {
            t += Time.deltaTime;
            return shakes < Shakes ? Sift() : Knead();
        }

        Outcome Sift()
        {
            // the arm swings left on the even beats and right on the odd ones
            var swing = -Mathf.Cos(Mathf.PI * t / Beat);
            Look.SetSprite(metronome, Look.Frame("metronome", Mathf.RoundToInt((swing + 1) * 4)));
            if (Mathf.FloorToInt(t / Beat) is var tick && tick != ticked)
            {
                ticked = tick;
                Sound.Play("tick");
            }
            var beat = Mathf.RoundToInt(t / Beat);
            var left = Controls.Left;
            if (!left && !Controls.Right) return Outcome.Playing;
            var right = beat % 2 == 1;
            if (Mathf.Abs(t - beat * Beat) > OnBeat || left == right || beat == lastBeat) return Outcome.FailA;
            lastBeat = beat;
            shaken.Count = ++shakes;
            Look.SetSprite(sieve, Look.Frame("sieve", right ? 2 : 0));
            Main.Run(Settle());
            Main.Run(Fall());
            Sound.Play("sift");
            if (shakes == Shakes) t = 0; // the ring starts wide
            Show();
            return Outcome.Playing;
        }

        // The sieve comes back level after a shake.
        async Awaitable Settle()
        {
            await Main.Wait(0.18f);
            if (sieve) Look.SetSprite(sieve, Look.Frame("sieve", 1));
        }

        // A puff of flour falls through the mesh into the basin.
        async Awaitable Fall()
        {
            var flakes = new Image[6];
            for (var i = 0; i < flakes.Length; i++)
                flakes[i] = Look.Block("flour", area, new Rect(88 + i * 5, 12, 2, 2), Art.Color(i % 2 == 0 ? "#ffffff" : "#fff1d2"));
            for (var t = 0f; t < FallSeconds && area; t += Time.deltaTime)
            {
                for (var i = 0; i < flakes.Length; i++)
                    Look.Move(flakes[i].rectTransform, new Vector2(88 + i * 5 + Mathf.Sin(t * 20 + i) * 1.5f, 12 + 28 * t / FallSeconds + (i % 3) * 2));
                await Main.Frame();
            }
            foreach (var flake in flakes)
                if (flake) Object.Destroy(flake.gameObject);
        }

        Outcome Knead()
        {
            var frame = RingFrames - 1 - Mathf.FloorToInt(t % Closing / Closing * RingFrames);
            Look.SetSprite(ring, Look.Frame("ring", frame));
            if (!Controls.Interact) return Outcome.Playing;
            if (frame < SweetFrom || frame > SweetTo) return Outcome.FailB;
            kneaded.Count = ++kneads;
            t = 0;
            Sound.Play("thump");
            Show();
            return kneads == Kneads ? Outcome.Won : Outcome.Playing;
        }

        public override void Solve()
        {
            shakes = Shakes;
            kneads = Kneads;
            shaken.Count = Shakes;
            kneaded.Count = Kneads;
            Show();
        }
    }
}
