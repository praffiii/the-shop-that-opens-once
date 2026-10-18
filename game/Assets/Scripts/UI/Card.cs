using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>A full-screen card of a few centred lines, such as a night's title. Await <see cref="Show"/>.</summary>
    public sealed class Card : MonoBehaviour
    {
        /// <summary>Space between the lantern and each line.</summary>
        const float Gap = 6f;

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
            parts.Add(Look.Picture("lantern", transform, Art.Sprite(Art.Texture("icons/lantern"))));
            for (var i = 0; i < lines.Length; i++)
            {
                var l = Look.Label(lines[i], transform, default, i == 0 ? Look.Ink : Look.Soft);
                l.alignment = TextAnchor.UpperCenter;
                parts.Add(l);
            }
            var total = -Gap;
            foreach (var p in parts) total += p.rectTransform.sizeDelta.y + Gap;
            var y = (view.y - total) / 2;
            foreach (var p in parts)
            {
                var size = p.rectTransform.sizeDelta;
                Look.Move(p.rectTransform, new Vector2((view.x - size.x) / 2, y));
                y += size.y + Gap;
            }
            next = false;
            gameObject.SetActive(true);
            if (Main.Auto) await Main.Frame();
            else
                while (!next) await Main.Frame();
            gameObject.SetActive(false);
        }

        public bool Handle()
        {
            if (!Open) return false;
            if (Controls.Interact || Controls.Click) next = true;
            return true;
        }
    }
}
