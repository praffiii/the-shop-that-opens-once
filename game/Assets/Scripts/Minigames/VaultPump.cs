using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Minigame 4A, the hall basement's sump pump and Vault No. 7 (Night 4). First the flood is pumped out: each Space
    /// is a stroke of the 1952 pump's lever, pushing the pressure gauge up while it eases back between strokes, and the
    /// water drains down the gutter only while the needle is in the glow, which a steady 80 BPM keeps it in. Pumped too
    /// hard the rubber valve squeals and jams (fail A; the water already out stays out). Then the black iron key turns in
    /// the vault's lock: A and D (or the arrows) turn it a step, the next tumbler's pin rising as its notch nears, and the
    /// pin clicks home only if the key rests on the notch a moment; turned on past it too fast, it skips (fail B, and the
    /// tumblers go back to the first notch). After the fourth click the steel door swings open.
    /// </summary>
    public sealed class VaultPump : Minigame
    {
        /// <summary>Seconds a beat at 80 BPM; what a stroke adds to the pressure, how fast it eases off, and where the valve jams.</summary>
        const float Beat = 0.75f, Stroke = 0.25f, Ease = 1.6f, Jam = 0.92f;
        static readonly (float, float) Steady = (0.4f, 0.75f);
        /// <summary>The flood's top on the wall, full and drained, and the seconds in the glow it takes to pump it out.</summary>
        const float Full = 40f, Empty = 66f, Pumping = 7f;
        /// <summary>The steps of the key's turn each tumbler's notch is at, how long the key must rest on one, and the door's swing.</summary>
        static readonly int[] Notches = { 3, 8, 12, 18 };
        const float Catch = 0.3f, Ajar = 1.1f, Open = 2f, Swung = 2.9f;
        /// <summary>The door's middle on the wall, and the gutter the pumped water runs along to the drain.</summary>
        static readonly Vector2 Door = new(100, 52);
        static readonly Rect Gutter = new(50, 31, 128, 2);

        RectTransform pumping, locking;
        Image pump, flood, water, flow, door, key;
        Image[] glints, pins, ripples;
        Meter meter;
        Pips clicked;
        float t, pressure, level = Full, stroked, rested, opened;
        int step, set, beats;

        public override string Title => "The flooded vault";
        public override (string Key, string Text)[] Instructions => new[]
        {
            ("Space", "Pump at a steady beat; keep the needle in the glow."),
            ("A/D", "Turn the key a step at a time; wait for each click."),
        };
        public override (string Who, string Line) FailA => ("sam", "Oh, Satria! The rhythm has to be steady! This pump is from 1952, don't pump it like a racing-bike tyre! Breathe, and we'll pump again from the top valve!");
        public override (string Who, string Line) FailB => ("courier", "The cylinder notches need a light touch... I have to listen for the spring's click inside the vault.");
        public override Vector2 Size => new(200, 96);

        bool Drained => level >= Empty;

        public override void Build(RectTransform area)
        {
            pumping = Look.Node("pumping", area);
            Look.Picture("cellar", pumping, Look.Piece("cellar"));
            flow = Look.Block("flow", pumping, Gutter, Art.Color("#6fd8ea"));
            glints = new Image[5];
            for (var i = 0; i < glints.Length; i++) glints[i] = Look.Block("glint", flow.transform, new Rect(0, 0, 3, 1), Look.Cream);
            pump = Look.Picture("pump", pumping, Look.Frame("pump", 0));
            water = Look.Block("water", pumping, default, Art.Color("#3db3e0"));
            ripples = new Image[9];
            for (var i = 0; i < ripples.Length; i++) ripples[i] = Look.Block("ripple", water.transform, new Rect(0, 0, 5 + i % 3 * 2, 1), Art.Color(i % 3 == 0 ? "#8ce4f2" : "#2f96c8"));
            flood = Look.Picture("flood", pumping, Look.Frame("flood", 0));
            meter = new Meter(pumping, new Vector2(0, 78), Size.x) { Sweet = Steady };
            locking = Look.Node("locking", area);
            door = Look.Picture("vault", locking, Look.Frame("vault", 0));
            pins = new Image[Notches.Length];
            for (var k = 0; k < pins.Length; k++)
            {
                pins[k] = Look.Picture("tumbler", locking, Look.Frame("tumbler", 0));
                Look.Move(pins[k].rectTransform, new Vector2(Door.x - 18 + k * 10, 17));
            }
            key = Look.Picture("key", locking, Look.Frame("vault_key", 0));
            clicked = new Pips(locking, new Vector2(Mathf.Round((Size.x - Pips.Width(Notches.Length)) / 2), 80), Notches.Length);
        }

        public override void Reset()
        {
            // the water already pumped out stays out; the tumblers go back to the first notch
            t = pressure = rested = opened = 0;
            stroked = 1;
            step = set = 0;
            beats = -1;
            clicked.Count = 0;
            Show();
        }

        // The cellar with the flood as high as it still is, or the vault's door with its lock as turned.
        void Show()
        {
            pumping.gameObject.SetActive(!Drained);
            locking.gameObject.SetActive(Drained);
            var top = Mathf.Round(level);
            Look.Move(pump.rectTransform, new Vector2(4 + (pressure > Steady.Item2 ? Mathf.Round(Mathf.Sin(t * 70)) : 0), 6));
            Look.SetSprite(pump, Look.Frame("pump", stroked < 0.12f ? 2 : stroked < 0.24f ? 1 : 0));
            Look.Move(flood.rectTransform, new Vector2(0, top));
            Look.SetSprite(flood, Look.Frame("flood", (int)(t * 6)));
            var deep = Mathf.Max(0, 74 - top - 4);
            Look.Place(water.rectTransform, new Rect(0, top + 4, Size.x, deep));
            // ripples drifting slowly in the murk, fewer as the water goes down
            for (var i = 0; i < ripples.Length; i++)
            {
                var y = 3 + i * 7 % 26;
                ripples[i].gameObject.SetActive(y < deep - 2);
                Look.Move(ripples[i].rectTransform, new Vector2(Mathf.Round(Mathf.Repeat(i * 47 + t * (i % 2 == 0 ? 5 : -4), Size.x - 9)), y));
            }
            meter.Value = pressure;
            // the water runs down the gutter while the pump draws it, its glints going along to the drain
            flow.gameObject.SetActive(meter.InSweet);
            for (var i = 0; i < glints.Length; i++)
                Look.Move(glints[i].rectTransform, new Vector2(Mathf.Repeat(i * 26 + t * 60, Gutter.width - 3), 0));

            var frame = opened < Ajar ? 0 : opened < Open ? 1 : 2;
            Look.SetSprite(door, Look.Frame("vault", frame));
            Look.Move(door.rectTransform, new Vector2(0, opened > 0 && opened < 0.9f && opened % 0.32f < 0.08f ? 1 : 0)); // each of the three bolts drawn back jolts it
            key.gameObject.SetActive(frame == 0);
            Look.SetSprite(key, Look.Frame("vault_key", step));
            Look.Move(key.rectTransform, Door - Vector2.one * 16);
            for (var k = 0; k < pins.Length; k++)
            {
                pins[k].gameObject.SetActive(frame == 0);
                var rise = k < set ? 5 : k == set ? Mathf.Clamp(4 - (Notches[k] - step), 0, 4) : 0;
                Look.SetSprite(pins[k], Look.Frame("tumbler", rise));
            }
        }

        public override Outcome Tick()
        {
            t += Time.deltaTime;
            var outcome = Drained ? Turn() : Pump();
            Show();
            return outcome;
        }

        Outcome Pump()
        {
            var dt = Time.deltaTime;
            stroked += dt;
            pressure -= pressure * dt / Ease;
            if (Mathf.FloorToInt(t / Beat) is var beat && beat != beats)
            {
                beats = beat;
                Sound.Play("tick");
            }
            if (Controls.Interact)
            {
                stroked = 0;
                pressure += Stroke;
                Sound.Play("pump");
                if (pressure > Jam)
                {
                    Sound.Play("squeal");
                    Main.Run(Spray());
                    return Outcome.FailA;
                }
            }
            meter.Value = pressure;
            if (!meter.InSweet) return Outcome.Playing;
            level = Mathf.Min(Empty, level + (Empty - Full) / Pumping * dt);
            if (Drained) Sound.Play("gurgle");
            return Outcome.Playing;
        }

        // Water sprays out round the jammed valve and rains back down.
        async Awaitable Spray()
        {
            var drops = new Image[8];
            for (var i = 0; i < drops.Length; i++) drops[i] = Look.Block("spray", pumping, new Rect(12, 34, 2, 2), Art.Color(i % 2 == 0 ? "#f2feff" : "#6fd8ea"));
            for (var s = 0f; s < 0.5f && pumping; s += Time.deltaTime)
            {
                for (var i = 0; i < drops.Length; i++)
                    Look.Move(drops[i].rectTransform, new Vector2(12 - (i % 4 + 1) * 22 * s + i * 2, 34 - 70 * s + 180 * s * s - i % 3));
                await Main.Frame();
            }
            foreach (var drop in drops)
                if (drop) Object.Destroy(drop.gameObject);
        }

        Outcome Turn()
        {
            if (set == Notches.Length)
            {
                if (opened == 0) Sound.Play("vault");
                opened += Time.deltaTime;
                return opened >= Swung ? Outcome.Won : Outcome.Playing;
            }
            var notch = Notches[set];
            if (Controls.Right)
            {
                if (step == notch)
                {
                    step++;
                    Sound.Play("ting");
                    return Outcome.FailB;
                }
                step++;
                rested = 0;
                Sound.Play("click");
            }
            else if (Controls.Left && step > (set > 0 ? Notches[set - 1] : 0))
            {
                step--;
                rested = 0;
                Sound.Play("click");
            }
            if (step != notch) return Outcome.Playing;
            rested += Time.deltaTime;
            if (rested < Catch) return Outcome.Playing;
            clicked.Count = ++set;
            Sound.Play("tumbler");
            return Outcome.Playing;
        }

        public override void Solve()
        {
            level = Empty;
            set = Notches.Length;
            step = Notches[set - 1];
            opened = Swung;
            clicked.Count = set;
            Show();
        }
    }
}
