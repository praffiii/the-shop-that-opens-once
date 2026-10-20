using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Minigame 7, the melody of home (Night 7): the walnut music box from box VII on Ratih's sewing table. Its brass crank
    /// is wound clockwise a quarter turn a beat at 60 BPM, three full turns: D as the grip rides over the top, A as it
    /// swings round underneath, each as the meter's needle (the time since the last quarter) reaches the glow, and each
    /// plays the next note of the melody. Wound before the glow, the spring twangs loose (fail A, KLANGG); left till the
    /// needle passes it, the song runs down mid-tune (fail B). A key the wrong way only jars against the ratchet. Wound to
    /// the end, the box plays on by itself, the hidden catch clicks and the spring drawer slides out with the photo in it.
    /// </summary>
    public sealed class MusicBoxCrank : Minigame
    {
        const int Turns = 3, Quarters = 4 * Turns;
        /// <summary>Seconds the needle takes across the gauge after a quarter turn, and the glow: a beat at 60 BPM lands in it.</summary>
        const float Sweep = 1.6f;
        static readonly (float, float) Beat = (0.5f, 0.78f);
        /// <summary>Seconds a quarter turn takes to swing round, the wait before the catch gives, and the drawer's slide.</summary>
        const float Swing = 0.2f, Catch = 0.4f, Slide = 0.9f;
        /// <summary>The crank's frames a turn (clockwise from straight up), the grip's start at nine o'clock, and the drawer's frames.</summary>
        const int Steps = 16, Start = 12, DrawerFrames = 11;
        /// <summary>Where the pieces stand on the table: the box, the crank's middle, the drawer in the apron.</summary>
        static readonly Vector2 Box = new(52, 0), Hub = new(140, 33), Drawer = new(72, 57);

        RectTransform area;
        Image box, crank, drawer, way;
        Meter meter;
        Pips turned;
        int quarters;
        float since, ended;
        bool started;

        public override string Title => "The melody of home";
        public override (string Key, string Text)[] Instructions => new[]
        {
            ("D", "Wind on as the grip rides over the top."),
            ("A", "Wind on as it swings round underneath."),
            ((string)null, "A quarter turn each beat, in the glow: three turns."),
        };
        public override (string Who, string Line) FailA => ("courier", "Too rushed... Mother's lullaby was always played gently and calmly. Take a deep breath, and turn again from the first beat.");
        public override (string Who, string Line) FailB => ("courier", "The turning has to carry on till the last note is done... Don't hesitate in the middle of the song.");
        public override Vector2 Size => new(200, 116);

        /// <summary>The grip goes over the top on a turn's first two quarters (D) and back under on its last two (A).</summary>
        bool Over => quarters % 4 < 2;

        public override void Build(RectTransform area)
        {
            this.area = area;
            Look.Picture("table", area, Look.Piece("mbox_table"));
            drawer = Look.Picture("drawer", area, Look.Frame("mbox_drawer", 0));
            Look.Move(drawer.rectTransform, Drawer);
            box = Look.Picture("box", area, Look.Frame("mbox_box", 0));
            Look.Move(box.rectTransform, Box);
            crank = Look.Picture("crank", area, Crank(Start));
            Look.Move(crank.rectTransform, Hub - Vector2.one * 14);
            way = Look.Picture("way", area, Look.Frame("mbox_way", 0));
            turned = new Pips(area, new Vector2(6, 4), Turns);
            meter = new Meter(area, new Vector2(0, 98), Size.x) { Sweet = Beat };
        }

        // The crank a number of sixteenths of a turn round from straight up.
        static Sprite Crank(int step) => Look.Frame("mbox_crank", (step % Steps + Steps) % Steps);

        public override void Reset()
        {
            quarters = 0;
            since = ended = 0;
            started = false;
            turned.Count = 0;
            Show();
        }

        // The crank as far round as it is wound and the cylinder with it, the meter at rest.
        void Show()
        {
            Look.SetSprite(crank, Crank(Start + 4 * quarters));
            Look.SetSprite(box, Look.Frame("mbox_box", quarters % 4));
            meter.Value = 0;
            Point();
        }

        // The drawer eased out a frame for each full turn, and the arrow turned the way the grip goes next.
        void Point()
        {
            Look.SetSprite(drawer, Look.Frame("mbox_drawer", quarters / 4));
            Look.SetSprite(way, Look.Frame("mbox_way", Over ? 0 : 1));
            way.gameObject.SetActive(quarters < Quarters);
        }

        public override Outcome Tick()
        {
            if (quarters == Quarters) return Open();
            if (started)
            {
                since += Time.deltaTime;
                if (since > Beat.Item2 * Sweep)
                {
                    Sound.Play("stall");
                    return Outcome.FailB;
                }
            }
            meter.Value = since / Sweep;
            // the arrow nudges the way it points
            var nudge = (Mathf.Sin(Time.time * 8) > 0 ? 1 : 0) * (Over ? 1 : -1);
            Look.Move(way.rectTransform, new Vector2(Hub.x - 3 + nudge, Over ? 9 : 50));
            var right = Controls.Right;
            if (!right && !Controls.Left) return Outcome.Playing;
            if (right != Over)
            {
                Sound.Play("click");
                Main.Run(Jar());
                return Outcome.Playing;
            }
            if (started && !meter.InSweet)
            {
                Sound.Play("klangg");
                Main.Run(Unwind());
                return Outcome.FailA;
            }
            if (started) meter.Sparks();
            Main.Run(Wind(quarters));
            quarters++;
            since = 0;
            started = true;
            Sound.Play("crank");
            Sound.Play("mbox_" + ((quarters - 1) % 4 + 1));
            Main.Run(Rise(quarters % 4 == 0));
            turned.Count = quarters / 4;
            Point();
            return Outcome.Playing;
        }

        // Wound to the end: the box plays the melody on by itself, its cylinder turning, then the catch gives and the
        // drawer slides the rest of the way out.
        Outcome Open()
        {
            ended += Time.deltaTime;
            meter.Value = 0;
            var phase = (int)(ended * 4) % 4;
            Look.SetSprite(box, Look.Frame("mbox_box", phase + (phase == 0 ? 4 : 0)));   // a tooth plucked each turn of it
            var t = ended - Catch;
            if (t < 0) return Outcome.Playing;
            if (t - Time.deltaTime < 0)
            {
                Sound.Play("drawer");
                Sound.Play("musicbox");
                Main.Run(Rise(false));
            }
            // on from the frame it had crept out to, a frame a turn
            Look.SetSprite(drawer, Look.Frame("mbox_drawer", Mathf.Min(DrawerFrames - 1, Turns + Mathf.FloorToInt(t / Slide * (DrawerFrames - Turns)))));
            return t >= Slide ? Outcome.Won : Outcome.Playing;
        }

        // One quarter turn swinging round, the cylinder rolling on and a tooth of the comb plucked.
        async Awaitable Wind(int from)
        {
            for (var t = 0f; t < Swing && crank; t += Time.deltaTime)
            {
                Look.SetSprite(crank, Crank(Start + 4 * from + Mathf.RoundToInt(4 * t / Swing)));
                Look.SetSprite(box, Look.Frame("mbox_box", (from + (t > Swing / 2 ? 1 : 0)) % 4 + 4));
                await Main.Frame();
            }
            if (!crank) return;
            Look.SetSprite(crank, Crank(Start + 4 * (from + 1)));
            Look.SetSprite(box, Look.Frame("mbox_box", (from + 1) % 4));
        }

        // A key the wrong way: the grip jars back a step against the ratchet and settles.
        async Awaitable Jar()
        {
            var at = quarters;
            Look.SetSprite(crank, Crank(Start + 4 * at - 1));
            await Main.Wait(0.1f);
            if (crank && quarters == at) Look.SetSprite(crank, Crank(Start + 4 * at));
        }

        // The spring slipping its catch: the crank whirls back round.
        async Awaitable Unwind()
        {
            var step = Start + 4 * quarters;
            for (var t = 0f; t < 0.4f && crank; t += Time.deltaTime)
            {
                Look.SetSprite(crank, Crank(step - Mathf.RoundToInt(t * 60)));
                await Main.Frame();
            }
        }

        // A note rising off the comb and fading as it drifts up; the two short ones of the tune come up beamed together.
        async Awaitable Rise(bool pair)
        {
            var note = Look.Picture("note", area, Look.Frame("mbox_note", pair ? 1 : 0));
            var from = new Vector2(Box.x + 18 + quarters * 13 % 46, 8);
            const float Seconds = 0.9f;
            for (var t = 0f; t < Seconds && note; t += Time.deltaTime)
            {
                Look.Move(note.rectTransform, from + new Vector2(Mathf.Sin(t * 9) * 1.5f, -18 * t / Seconds));
                note.color = new Color(1, 1, 1, Mathf.Min(1, 3 * (1 - t / Seconds)));
                await Main.Frame();
            }
            if (note) Object.Destroy(note.gameObject);
        }

        public override void Solve()
        {
            quarters = Quarters;
            turned.Count = Turns;
            Show();
            Look.SetSprite(drawer, Look.Frame("mbox_drawer", DrawerFrames - 1));
            meter.Value = 0.6f;
        }
    }
}
