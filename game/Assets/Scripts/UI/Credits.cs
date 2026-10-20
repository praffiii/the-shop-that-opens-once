using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// The credits at the end of Day 8: under a veil over the last shot the title and who made the game roll slowly up
    /// the screen, to <i>Uncut Letter</i>, and the last line, "Thank you for playing.", stops in the middle and waits for a
    /// click. A click or Space hurries the roll. Await <see cref="Show"/>.
    /// </summary>
    public sealed class Credits : MonoBehaviour
    {
        /// <summary>Px a second the roll climbs, and how much faster it goes hurried.</summary>
        const float Speed = 16f, Hurry = 6f;
        /// <summary>Space under a line, and under a section's last line.</summary>
        const float Line = 4f, Section = 22f;

        /// <summary>The roll, a section at a time: its heading (in ink) and its lines.</summary>
        static readonly (string Heading, string[] Lines)[] Roll =
        {
            ("A story of Bellwood", new[] { "Seven nights, seven keepsakes,", "and a village that waited." }),
            ("Made by SE.3 Kelompok 1", new[] { "Andika Rafa Akbar", "Praffi Ramadhani", "Khairul Insan", "Dara Dwi Hidayat", "Piere Valkyrie" }),
            ("For", new[] { "Pengembangan Aplikasi Permainan" }),
            ("Every pixel drawn in code,", new[] { "every note played in code." }),
            ("For Daniel and Ratih,", new[] { "who chose to stay." }),
        };

        Image veil;
        RectTransform column;
        readonly List<Graphic> parts = new();
        bool hurry, next, waiting;

        public static Credits Create(Transform parent)
        {
            var credits = Look.Node("Credits", parent).gameObject.AddComponent<Credits>();
            credits.veil = Look.Picture("Veil", credits.transform);
            credits.veil.enabled = true;
            credits.veil.color = new Color(Look.Ink.r, Look.Ink.g, Look.Ink.b, 0.7f);
            credits.column = Look.Node("Roll", credits.transform);
            credits.gameObject.SetActive(false);
            return credits;
        }

        public bool Open => gameObject.activeSelf;

        public async Awaitable Show()
        {
            foreach (var p in parts) Destroy(p.gameObject);
            parts.Clear();
            var view = Main.Size;
            Look.Place(veil.rectTransform, new Rect(Vector2.zero, view));
            Look.Place(column, new Rect(Vector2.zero, view));
            // the title, then each section, then the last line, one under another in the column
            var y = 0f;
            void Add(Graphic g, float gap)
            {
                var size = g.rectTransform.sizeDelta;
                Look.Move(g.rectTransform, new Vector2((view.x - size.x) / 2, y));
                parts.Add(g);
                y += size.y + gap;
            }
            var title = Look.Picture("Title", column);
            Look.SetSprite(title, Art.Sprite(Art.Texture("ui/title")), Main.Zoom);
            Add(title, Section);
            foreach (var (heading, lines) in Roll)
            {
                Add(Label(heading, Look.Cream), Line);
                for (var i = 0; i < lines.Length; i++) Add(Label(lines[i], Look.Cream * new Color(1, 1, 1, 0.75f)), i == lines.Length - 1 ? Section : Line);
            }
            var last = Label("Thank you for playing.", Look.Cream);
            Add(last, 0);
            // up from under the screen till the last line stands in the middle
            var end = view.y / 2 - Look.Pos(last.rectTransform).y - last.rectTransform.sizeDelta.y / 2;
            var at = view.y;
            hurry = next = waiting = false;
            gameObject.SetActive(true);
            while (!Main.Auto && at > end)
            {
                at = Mathf.Max(end, at - Speed * (hurry ? Hurry : 1f) * Time.deltaTime);
                Look.Move(column, new Vector2(0, at));
                await Main.Frame();
            }
            waiting = true;
            if (!Main.Auto)
                while (!next) await Main.Frame();
            gameObject.SetActive(false);
        }

        Text Label(string text, Color color)
        {
            var l = Look.Label(text, column, default, color);
            l.alignment = TextAnchor.UpperCenter;
            return l;
        }

        public bool Handle()
        {
            if (!Open) return false;
            if (Controls.Interact || Controls.Click)
            {
                if (waiting) next = true;
                else hurry = true;
            }
            return true;
        }
    }
}
