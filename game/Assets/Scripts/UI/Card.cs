using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// A full-screen card on the cream. A chapter's title ("Night 1: The Stopped Watch") comes as a courier's postcard:
    /// it slides up, its stamp holding the night's keepsake (Marlow's lantern for the prologue and the epilogue), then
    /// the postmark thumps down on it with the day. Any other card (the time moving on) is the postmark alone over its
    /// lines. Await <see cref="Show"/>; a click hurries it, then moves on.
    /// </summary>
    public sealed class Card : MonoBehaviour
    {
        const float SlideSeconds = 0.45f, StampDelay = 0.2f, JoltSeconds = 0.08f;
        /// <summary>The postcard's message side (left of its dotted line), where its title is written.</summary>
        const float Left = 22f, Column = 166f;
        /// <summary>The address side's ruled lines, and where on the card the stamp sits.</summary>
        static readonly float[] Rules = { 130, 148, 166 };
        static readonly Vector2 StampAt = new(275, 22);
        /// <summary>The middle of the postmark's ring, from its left edge (the cancellation trails off to the right).</summary>
        const float Ring = 21f;

        Image paper;
        readonly List<Graphic> parts = new();
        bool next;

        public static Card Create(Transform parent)
        {
            var card = Look.Node("Card", parent).gameObject.AddComponent<Card>();
            card.paper = Look.Picture("paper", card.transform);
            card.paper.color = Look.Cream;
            card.paper.enabled = true;
            card.gameObject.SetActive(false);
            return card;
        }

        public bool Open => gameObject.activeSelf;

        public async Awaitable Show(string[] lines)
        {
            foreach (var p in parts) Destroy(p.gameObject);
            parts.Clear();
            var view = Main.Size;
            Look.Place(paper.rectTransform, new Rect(Vector2.zero, view));
            var title = lines[0].Split(": ");
            next = false;
            gameObject.SetActive(true);
            if (title.Length == 2) await Postcard(title[0], title[1], lines.Length > 1 ? lines[1] : null, view);
            else await TimeMoves(lines, view);
            next = false; // a click that hurried it on does not also close it
            if (Main.Auto) await Main.Frame();
            else
                while (!next) await Main.Frame();
            gameObject.SetActive(false);
        }

        // The postcard slides up into the middle of the screen; once it rests, the postmark thumps down on its stamp.
        async Awaitable Postcard(string kicker, string title, string line, Vector2 view)
        {
            var card = Add(Look.Picture("postcard", transform, Look.Piece("postcard")));
            var size = card.rectTransform.sizeDelta;
            var rest = new Vector2(Mathf.Round((view.x - size.x) / 2), Mathf.Round((view.y - size.y) / 2));
            var t = card.transform;

            Write(kicker, t, new Vector2(Left, 26), Look.Soft);
            var big = Write(title, t, new Vector2(Left, 40), Look.Ink, Column);
            big.fontSize = Look.FontSize * 2; // twice the font's grid, as crisp
            var below = 40 + Mathf.Ceil(big.preferredHeight);
            Add(Look.Block("rule", t, new Rect(Left, below + 6, 40, 1), Look.Soft));
            if (line != null) Write(line, t, new Vector2(Left, below + 16), Look.Soft, Column);
            // addressed to the courier
            Write("Satria,", t, new Vector2(210, Rules[0] - 12), Look.Ink);
            Write("Bellwood.", t, new Vector2(224, Rules[1] - 12), Look.Ink);

            var stamp = Add(Look.Picture("stamp", t, Look.Piece("stamp")));
            Look.Move(stamp.rectTransform, StampAt);
            var id = Main.Instance.Story?.Stamp;
            var art = id != null ? Keepsakes.Art(id, "sm") : Art.Sprite(Art.Texture("icons/lantern"));
            var keepsake = Add(Look.Picture("keepsake", stamp.transform, art));
            Look.Move(keepsake.rectTransform, new Vector2(20, 20) - keepsake.rectTransform.sizeDelta / 2);
            var mark = Postmark(t, StampAt + new Vector2(-40, 36));
            mark.gameObject.SetActive(false);

            // slide up from below the screen, easing to rest
            for (var s = 0f; s < SlideSeconds && !next && !Main.Auto; s += Time.deltaTime)
            {
                var k = 1 - Mathf.Pow(1 - s / SlideSeconds, 3);
                Look.Move(card.rectTransform, new Vector2(rest.x, Mathf.Lerp(view.y + 4, rest.y, k)));
                await Main.Frame();
            }
            Look.Move(card.rectTransform, rest);
            for (var s = 0f; s < StampDelay && !next && !Main.Auto; s += Time.deltaTime) await Main.Frame();
            await Thump(mark, card.rectTransform, rest);
        }

        // The time moving on: the postmark thumps down over the card's lines.
        async Awaitable TimeMoves(string[] lines, Vector2 view)
        {
            var labels = new List<Text>();
            foreach (var line in lines)
            {
                var l = Write(line, transform, default, labels.Count == 0 ? Look.Ink : Look.Soft);
                l.alignment = TextAnchor.UpperCenter;
                labels.Add(l);
            }
            var markSize = Look.Piece("postmark").rect.size;
            var total = markSize.y + 4;
            foreach (var l in labels) total += l.rectTransform.sizeDelta.y + 6;
            var y = Mathf.Round((view.y - total) / 2);
            var mark = Postmark(transform, new Vector2(Mathf.Round(view.x / 2 - Ring), y)); // its ring in the middle
            mark.gameObject.SetActive(false);
            y += markSize.y + 10;
            foreach (var l in labels)
            {
                Look.Move(l.rectTransform, new Vector2((view.x - l.rectTransform.sizeDelta.x) / 2, y));
                y += l.rectTransform.sizeDelta.y + 6;
            }
            for (var s = 0f; s < StampDelay && !next && !Main.Auto; s += Time.deltaTime) await Main.Frame();
            await Thump(mark, mark.rectTransform, Look.Pos(mark.rectTransform));
        }

        // The rubber stamp: its ring round BELLWOOD, with the day written in under it.
        Image Postmark(Transform parent, Vector2 at)
        {
            var mark = Add(Look.Picture("postmark", parent, Look.Piece("postmark")));
            Look.Move(mark.rectTransform, at);
            var day = Write($"Day {Game.Chapter}", mark.transform, default, Art.Color((string)Look.Ui["postmark"]["text"]));
            Look.Move(day.rectTransform, new Vector2(Ring - day.rectTransform.sizeDelta.x / 2, 18));
            return mark;
        }

        // The postmark lands: it shows with the stamp's thump, and what it lands on jolts down a pixel and back.
        static async Awaitable Thump(Image mark, RectTransform jolted, Vector2 rest)
        {
            mark.gameObject.SetActive(true);
            if (Main.Auto) return;
            Sound.Play("stamp");
            Look.Move(jolted, rest + new Vector2(0, 2));
            for (var s = 0f; s < JoltSeconds; s += Time.deltaTime) await Main.Frame();
            Look.Move(jolted, rest);
        }

        Text Write(string text, Transform parent, Vector2 at, Color color, float width = 0)
        {
            var l = Add(Look.Label(text, parent, width > 0 ? new Rect(at.x, at.y, width, Look.Line) : default, color));
            if (width <= 0) Look.Move(l.rectTransform, at);
            return l;
        }

        T Add<T>(T part) where T : Graphic
        {
            parts.Add(part);
            return part;
        }

        public bool Handle()
        {
            if (!Open) return false;
            if (Controls.Interact || Controls.Click) next = true;
            return true;
        }
    }
}
