using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// One of the restoration minigames (the script's fail-safe minigames), played on the <see cref="Board"/> over the
    /// dimmed world until it is won. It never ends in a loss: a fail is one of two, each with its line from the mentor
    /// (or Satria to himself), and R starts it over at once with nothing lost. A chapter plays one with Chapter.Play.
    /// </summary>
    public abstract class Minigame
    {
        public enum Outcome { Playing, FailA, FailB, Won }

        public abstract string Title { get; }
        /// <summary>The on-screen instructions, a line each: the key it names (drawn as a key cap), or null, and what it does.</summary>
        public abstract (string Key, string Text)[] Instructions { get; }
        /// <summary>Who says what after each fail: the mentor, or "courier" for Satria's own thought.</summary>
        public abstract (string Who, string Line) FailA { get; }
        public abstract (string Who, string Line) FailB { get; }
        /// <summary>The play area's size in canvas px.</summary>
        public abstract Vector2 Size { get; }

        /// <summary>Makes its pieces in the play area, once.</summary>
        public abstract void Build(RectTransform area);
        /// <summary>Back to the start: the first go, and each try after a fail.</summary>
        public abstract void Reset();
        /// <summary>One frame of play, reading the keys.</summary>
        public abstract Outcome Tick();
        /// <summary>Shows it won without the keys, for tests (<see cref="Main.Auto"/>).</summary>
        public abstract void Solve();
    }

    /// <summary>
    /// The timing minigames' meter: a needle sweeping over a brass-rimmed iron gauge with a sweet band glowing like hot
    /// iron, its ends marked by brass notches above and below so it reads without its colour. Strikes throw sparks.
    /// </summary>
    public sealed class Meter
    {
        /// <summary>The gauge's rim and the notches over and under it (canvas px).</summary>
        const float Rim = 2f, NotchHigh = 3f, Gauge = 12f;
        public const float Height = NotchHigh + Gauge + NotchHigh;
        const float PulseSpeed = 5f, SparkSeconds = 0.35f;
        static readonly Color Dull = new(1f, 0.82f, 0.7f);

        readonly RectTransform root, needle;
        readonly Image glow, above, below, aboveEnd, belowEnd;
        readonly float width;
        float value, from, to;

        public Meter(Transform parent, Vector2 at, float width)
        {
            this.width = width;
            root = Look.Node("meter", parent, new Rect(at, new Vector2(width, Height)));
            Look.Panel("gauge", root, new Rect(0, NotchHigh, width, Gauge));
            glow = Look.Panel("glow", root);
            (above, aboveEnd) = (Notch(0), Notch(0));
            (below, belowEnd) = (Notch(1), Notch(1));
            needle = Look.Picture("needle", root, Look.Piece("needle")).rectTransform;
            Sweet = (0.4f, 0.6f);
        }

        Image Notch(int frame) => Look.Picture("notch", root, Look.Frame("notch", frame));

        /// <summary>Where the needle is, 0 (left) to 1 (right). Setting it each frame also keeps the glow breathing.</summary>
        public float Value
        {
            get => value;
            set
            {
                this.value = Mathf.Clamp01(value);
                Look.Move(needle, new Vector2(Mathf.Round(X(this.value)) - 3, -2));
                glow.color = Color.Lerp(Dull, Color.white, (Mathf.Sin(Time.time * PulseSpeed) + 1) / 2);
            }
        }

        // The point inside the rim at fraction v of the gauge.
        float X(float v) => Rim + v * (width - 2 * Rim);

        /// <summary>The sweet band, as fractions of the gauge.</summary>
        public (float From, float To) Sweet
        {
            get => (from, to);
            set
            {
                (from, to) = value;
                float a = Mathf.Round(X(from)), b = Mathf.Round(X(to));
                Look.Place(glow.rectTransform, new Rect(a, NotchHigh + Rim, b - a, Gauge - 2 * Rim));
                Look.Move(above.rectTransform, new Vector2(a - 2, 0));
                Look.Move(aboveEnd.rectTransform, new Vector2(b - 3, 0));
                Look.Move(below.rectTransform, new Vector2(a - 2, NotchHigh + Gauge));
                Look.Move(belowEnd.rectTransform, new Vector2(b - 3, NotchHigh + Gauge));
            }
        }

        public bool InSweet => value >= from && value <= to;

        /// <summary>Sparks fly up off the needle, as from a good strike.</summary>
        public void Sparks() => Main.Run(Fly());

        async Awaitable Fly()
        {
            var at = new Vector2(X(value), NotchHigh + Gauge / 2);
            var sparks = new (Image Dot, Vector2 Speed)[6];
            for (var i = 0; i < sparks.Length; i++)
                sparks[i] = (Look.Block("spark", root, new Rect(at, Vector2.one * 3), Art.Color(i % 2 == 0 ? "#fff7c8" : "#ffc35a")),
                    new Vector2(Random.Range(-40f, 40f), Random.Range(-70f, -30f)));
            for (var t = 0f; t < SparkSeconds && root; t += Time.deltaTime)
            {
                foreach (var (dot, speed) in sparks)
                {
                    Look.Move(dot.rectTransform, at + speed * t + new Vector2(0, 160f * t * t));
                    dot.color = new Color(dot.color.r, dot.color.g, dot.color.b, 1 - t / SparkSeconds);
                }
                await Main.Frame();
            }
            foreach (var (dot, _) in sparks)
                if (dot) Object.Destroy(dot.gameObject);
        }
    }

    /// <summary>A row of steps: iron sockets to do, glowing once done, each popping as it lights.</summary>
    public sealed class Pips
    {
        const float Size = 9f, Gap = 4f, PopSeconds = 0.2f;
        readonly Image[] pips;
        int count;

        public Pips(Transform parent, Vector2 at, int total)
        {
            var root = Look.Node("pips", parent, new Rect(at, new Vector2(total * (Size + Gap) - Gap, Size)));
            pips = new Image[total];
            for (var i = 0; i < total; i++)
            {
                pips[i] = Look.Picture("pip", root, Look.Frame("pip", 0));
                Look.Move(pips[i].rectTransform, new Vector2(i * (Size + Gap), 0));
            }
        }

        /// <summary>The row's width, to centre it.</summary>
        public static float Width(int total) => total * (Size + Gap) - Gap;

        /// <summary>How many steps are done.</summary>
        public int Count
        {
            set
            {
                for (var i = 0; i < pips.Length; i++)
                {
                    Look.SetSprite(pips[i], Look.Frame("pip", i < value ? 1 : 0));
                    if (i >= count && i < value) Main.Run(Pop(pips[i].rectTransform));
                }
                count = value;
            }
        }

        // Swells and settles back, about its middle.
        static async Awaitable Pop(RectTransform pip)
        {
            var at = pip.anchoredPosition;
            for (var t = 0f; t < PopSeconds && pip; t += Time.deltaTime)
            {
                var grow = 0.6f * (1 - t / PopSeconds);
                pip.localScale = Vector3.one * (1 + grow);
                pip.anchoredPosition = at + new Vector2(-grow, grow) * Size / 2;
                await Main.Frame();
            }
            if (!pip) return;
            pip.localScale = Vector3.one;
            pip.anchoredPosition = at;
        }
    }
}
