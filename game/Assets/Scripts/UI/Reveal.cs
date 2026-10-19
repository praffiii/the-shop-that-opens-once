using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// A keepsake's box opened up close: the box in the middle of the darkened screen, its clasp flicked open and its
    /// lid lifted, and the keepsake rising out of it with its name under it. Await <see cref="Show"/>.
    /// </summary>
    public sealed class Reveal : MonoBehaviour
    {
        /// <summary>Each art pixel is this many canvas pixels.</summary>
        const int Scale = 3;
        /// <summary>The box's rows (art px from its top) where the keepsake's top starts, hidden behind the box's front, and where its bottom ends up, just sunk in the box.</summary>
        const float From = 22f, SunkTo = 26f;
        const float Dim = 0.95f, DimSeconds = 0.3f, RiseSeconds = 0.9f;

        Image shade, back, item, front;
        RectTransform well; // what the keepsake shows through: it is cut off at the box's bottom
        Text label;
        bool next;

        public static Reveal Create(Transform parent)
        {
            var reveal = Look.Node("Reveal", parent).gameObject.AddComponent<Reveal>();
            var t = reveal.transform;
            reveal.shade = Look.Picture("shade", t);
            reveal.shade.enabled = true;
            reveal.back = Look.Picture("back", t);
            reveal.well = Look.Node("well", t);
            reveal.well.gameObject.AddComponent<RectMask2D>();
            reveal.item = Look.Picture("item", reveal.well);
            reveal.front = Look.Picture("front", t);
            reveal.label = Look.Label("", t, default, Look.Cream);
            reveal.label.alignment = TextAnchor.UpperCenter;
            reveal.gameObject.SetActive(false);
            return reveal;
        }

        public bool Open => gameObject.activeSelf;

        public async Awaitable Show(int box, string keepsake)
        {
            var view = Main.Size;
            Look.Place(shade.rectTransform, new Rect(Vector2.zero, view));
            Look.SetSprite(back, Box(box, "closed"), Scale);
            front.enabled = item.enabled = false;
            Look.SetText(label, "");
            var size = back.rectTransform.sizeDelta;
            var at = new Vector2(Mathf.Round((view.x - size.x) / 2), Mathf.Round((view.y - size.y) / 2 + 24));
            Look.Move(back.rectTransform, at);
            Look.Move(front.rectTransform, at);
            Look.Place(well, new Rect(0, 0, view.x, at.y + size.y - 2 * Scale));
            gameObject.SetActive(true);
            for (var t = 0f; t < DimSeconds; t += Time.deltaTime)
            {
                shade.color = new Color(Look.Ink.r, Look.Ink.g, Look.Ink.b, Dim * t / DimSeconds);
                await Main.Frame();
            }
            shade.color = new Color(Look.Ink.r, Look.Ink.g, Look.Ink.b, Dim);
            await Main.Wait(0.5f);

            Sound.Play("latch");
            Look.SetSprite(back, Box(box, "open"), Scale);
            Look.SetSprite(front, Box(box, "front"), Scale);
            await Main.Wait(0.4f);

            Look.SetSprite(item, Keepsakes.Art(keepsake, "lg"), Scale);
            var high = item.rectTransform.sizeDelta.y;
            float x = Mathf.Round((view.x - item.rectTransform.sizeDelta.x) / 2), y0 = at.y + From * Scale, y1 = at.y + SunkTo * Scale - high;
            Sound.Play("motif");
            for (var t = 0f; t < RiseSeconds; t += Time.deltaTime)
            {
                Look.Move(item.rectTransform, new Vector2(x, Mathf.Lerp(y0, y1, Mathf.SmoothStep(0f, 1f, t / RiseSeconds))));
                await Main.Frame();
            }
            Look.Move(item.rectTransform, new Vector2(x, y1));
            Look.SetText(label, Keepsakes.All[keepsake].Name);
            Look.Move(label.rectTransform, new Vector2(Mathf.Round((view.x - label.rectTransform.sizeDelta.x) / 2), at.y + size.y + 8));

            next = false;
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

        static Sprite Box(int box, string variant) => Art.Sprite(Art.Texture($"items/box_{box}_lg_{variant}"));
    }
}
