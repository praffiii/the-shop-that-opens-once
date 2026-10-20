using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Minigame 2A, the Gardener's chamomile (Night 2). The field's three rows go by the Gardener's little shears, buds,
    /// full blooms and brambles among them: W and S move the shears from row to row, and Space snips the bloom at the
    /// blades. Four full blooms are wanted. Shears caught in a bramble shake the petals into the mud (fail A); snipping
    /// at a bud or at nothing tears up a root (fail B). The blooms already in the basket stay there.
    /// </summary>
    public sealed class ChamomileHarvest : Minigame
    {
        const int Wanted = 4, Rows = 3;
        /// <summary>The field's earth inside its grassy edge, each row's foot in it, and how fast the rows go by (px/s).</summary>
        static readonly Rect Bed = new(1, 7, 198, 64);
        static readonly float[] Foot = { 22, 42, 62 };
        const float Speed = 30f, Spacing = 30f, First = 150f;
        /// <summary>The shears' tip, and the span either side of it a bloom is snipped in and a bramble catches in.</summary>
        const float Tip = 44f, Reach = 7f, Snag = 9f;
        /// <summary>What grows along the rows, over and over: its row and a bud (B), a full bloom (F) or a bramble (T).</summary>
        static readonly (int Row, char Kind)[] Field =
        {
            (1, 'F'), (0, 'T'), (2, 'B'), (0, 'F'), (1, 'T'), (2, 'F'), (1, 'B'), (2, 'T'),
            (0, 'F'), (1, 'T'), (1, 'F'), (2, 'B'), (0, 'T'), (2, 'F'),
        };

        sealed class Plant
        {
            public Image Img;
            public int Row;
            public char Kind;
            public bool Cut;
        }

        readonly Dictionary<int, Plant> growing = new();
        /// <summary>The earth's clods and the grass in the furrows, going by with the rows: each piece and where it started.</summary>
        readonly List<(Image Img, Vector2 At)> ground = new();
        RectTransform bed;
        Image shears;
        Pips picked;
        float fed;
        int row, count;

        public override string Title => "The chamomile field";
        public override (string Key, string Text)[] Instructions => new[]
        {
            ("W/S", "Move the shears from row to row, clear of the brambles."),
            ("Space", "Snip a full bloom as it reaches the blades."),
        };
        public override (string Who, string Line) FailA => ("gardener", "Here, a betel leaf for the sap. Slowly, Satria. The calming flower grows among the thorns that guard it. Cut in a hurry, like you're chasing a courier's deadline, and the petals bruise and lose their scent. Breathe, and we'll take the next stem.");
        public override (string Who, string Line) FailB => ("courier", "I tore that one up by the root... Too hasty. Tending healing herbs wants a quiet heart.");
        public override Vector2 Size => new(200, 86);

        public override void Build(RectTransform area)
        {
            Look.Panel("garden", area, new Rect(0, 0, Size.x, Bed.yMax + 1));
            bed = Look.Node("bed", area, Bed);
            bed.gameObject.AddComponent<RectMask2D>();
            foreach (var foot in Foot)
            {
                Look.Block("furrow", bed, new Rect(0, foot + 1, Bed.width, 2), Art.Color("#c98a5a")); // a furrow along each row
                Look.Block("ridge", bed, new Rect(0, foot + 3, Bed.width, 1), Art.Color("#f2d3a0"));
            }
            for (var i = 0; i < 42; i++)
            {
                // clods dark and light scattered over the earth, and tufts of grass along the furrows, in a fixed scatter
                var x = (i * 47 + 13) % Bed.width;
                var tuft = i % 3 == 0;
                var y = tuft ? Foot[i % Rows] - 1 : (i * 29 + 5) % (Bed.height - 8) + 4;
                var img = Look.Block(tuft ? "tuft" : "clod", bed, new Rect(0, 0, tuft ? 1 : 2, tuft ? 3 : 1),
                    Art.Color(tuft ? (i % 2 == 0 ? "#6cbf4a" : "#4f9a3c") : i % 2 == 0 ? "#b87a4c" : "#f6dcae"));
                ground.Add((img, new Vector2(x, y)));
                if (tuft) ground.Add((Look.Block("tuft", bed, new Rect(0, 0, 1, 2), Art.Color("#8ad15e")), new Vector2(x + 1, y + 1)));
            }
            shears = Look.Picture("shears", bed, Look.Frame("shears", 0));
            picked = new Pips(area, new Vector2(Mathf.Round((Size.x - Pips.Width(Wanted)) / 2), 76), Wanted);
        }

        public override void Reset()
        {
            foreach (var plant in growing.Values) Object.Destroy(plant.Img.gameObject);
            growing.Clear();
            fed = 0;
            row = 1;
            picked.Count = count;
            Show();
        }

        float X(int i) => First + i * Spacing - fed;

        // The shears at their row, and the plants in view moved along it.
        void Show()
        {
            foreach (var (img, at) in ground) Look.Move(img.rectTransform, new Vector2(Mathf.Repeat(at.x - fed, Bed.width), at.y));
            Look.Move(shears.rectTransform, new Vector2(Tip - 23, Foot[row] - 14));
            shears.transform.SetAsLastSibling();
            var first = Mathf.Max(0, Mathf.CeilToInt((fed - First - 10) / Spacing));
            for (var i = first; X(i) < Bed.width + 10; i++)
            {
                if (!growing.TryGetValue(i, out var plant))
                {
                    var (r, kind) = Field[i % Field.Length];
                    var piece = kind == 'T' ? "bramble" : "bloom";
                    plant = new Plant { Row = r, Kind = kind, Img = Look.Picture(piece, bed, Look.Frame(piece, kind == 'F' ? 1 : 0)) };
                    growing[i] = plant;
                }
                var size = plant.Img.rectTransform.sizeDelta;
                Look.Move(plant.Img.rectTransform, new Vector2(X(i) - Mathf.Floor(size.x / 2), Foot[plant.Row] - size.y + 1));
            }
            // gone off the left end
            foreach (var i in new List<int>(growing.Keys))
                if (i < first)
                {
                    Object.Destroy(growing[i].Img.gameObject);
                    growing.Remove(i);
                }
        }

        public override Outcome Tick()
        {
            fed += Speed * Time.deltaTime;
            if (Controls.Up || Controls.Down)
            {
                row = Mathf.Clamp(row + (Controls.Down ? 1 : -1), 0, Rows - 1);
                Sound.Play("pop");
            }
            Show();
            foreach (var (i, plant) in growing)
                if (plant.Kind == 'T' && plant.Row == row && Mathf.Abs(X(i) - Tip) < Snag)
                {
                    Look.SetSprite(plant.Img, Look.Frame("bramble", 1));
                    Sound.Play("rustle");
                    return Outcome.FailA;
                }
            if (!Controls.Interact) return Outcome.Playing;
            Main.Run(Close());
            foreach (var (i, plant) in growing)
                if (plant.Kind == 'F' && !plant.Cut && plant.Row == row && Mathf.Abs(X(i) - Tip) < Reach)
                {
                    plant.Cut = true;
                    Look.SetSprite(plant.Img, Look.Frame("bloom", 2));
                    Sound.Play("snip");
                    picked.Count = ++count;
                    return count == Wanted ? Outcome.Won : Outcome.Playing;
                }
            Sound.Play("snip");
            return Outcome.FailB;
        }

        // The blades shut on a snip and open again.
        async Awaitable Close()
        {
            Look.SetSprite(shears, Look.Frame("shears", 1));
            await Main.Wait(0.15f);
            if (shears) Look.SetSprite(shears, Look.Frame("shears", 0));
        }

        public override void Solve()
        {
            count = Wanted;
            picked.Count = Wanted;
        }
    }
}
