using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// The UI's shared look: colours from the art palette, the pixel font, and the pieces in Art/ui.
    /// UI positions are screen-canvas pixels from the top-left, y down, like the art.
    /// </summary>
    public static class Look
    {
        public static readonly Color Ink = Art.Color("#2a1b22");
        public static readonly Color Soft = Art.Color("#7a452e"); // wood4, for quieter text
        public static readonly Color Cream = Art.Color("#fff1d2"); // dirt0: the curtain and the cards
        /// <summary>Pixelify Sans is drawn on an 11 px grid: at this size each of its pixels is one canvas px, and with
        /// the font imported as hinted raster (no smoothing) the letters stay crisp at any scale. Any other size smears them.</summary>
        public const int FontSize = 11;
        /// <summary>Line pitch of text, in canvas px.</summary>
        public const int Line = 14;

        static Font font;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        static void Reset()
        {
            font = null;
            english.Clear();
        }

        /// <summary>ui.json: sizes, 9-slice margins, frame counts and cursor hotspots of the UI pieces.</summary>
        public static JObject Ui => Art.Json("ui/ui");

        public static Font Font
        {
            get
            {
                if (font) return font;
                font = Resources.Load<Font>("Fonts/PixelifySans");
                Font.textureRebuilt -= Sharpen;
                Font.textureRebuilt += Sharpen;
                Sharpen(font);
                return font;
            }
        }

        // Glyphs are drawn to the font's texture as they are needed; keep it unfiltered so letters stay crisp.
        static void Sharpen(Font f)
        {
            if (f == font && f.material.mainTexture) f.material.mainTexture.filterMode = FilterMode.Point;
        }

        /// <summary>An empty UI node covering <paramref name="rect"/> in its parent.</summary>
        public static RectTransform Node(string name, Transform parent, Rect rect = default)
        {
            var rt = new GameObject(name, typeof(RectTransform)).GetComponent<RectTransform>();
            rt.SetParent(parent, false);
            rt.gameObject.layer = parent.gameObject.layer; // the UI camera draws only the UI layer
            Place(rt, rect);
            return rt;
        }

        /// <summary>Puts a UI node at <paramref name="rect"/> (top-left origin, y down) inside its parent.</summary>
        public static void Place(RectTransform rt, Rect rect)
        {
            rt.anchorMin = rt.anchorMax = rt.pivot = new Vector2(0, 1);
            rt.anchoredPosition = new Vector2(rect.x, -rect.y);
            rt.sizeDelta = rect.size;
        }

        public static void Move(RectTransform rt, Vector2 at) => rt.anchoredPosition = new Vector2(Mathf.Round(at.x), -Mathf.Round(at.y));

        public static void Resize(RectTransform rt, Vector2 size) => rt.sizeDelta = size;

        public static Vector2 Pos(RectTransform rt) => new(rt.anchoredPosition.x, -rt.anchoredPosition.y);

        /// <summary>A picture at its own size (times <paramref name="scale"/>).</summary>
        public static Image Picture(string name, Transform parent, Sprite sprite = null, int scale = 1)
        {
            var img = Node(name, parent).gameObject.AddComponent<Image>();
            img.raycastTarget = false;
            SetSprite(img, sprite, scale);
            return img;
        }

        /// <summary>A solid block of colour covering <paramref name="rect"/>.</summary>
        public static Image Block(string name, Transform parent, Rect rect, Color color)
        {
            var img = Picture(name, parent);
            img.enabled = true;
            img.color = color;
            Place(img.rectTransform, rect);
            return img;
        }

        public static void SetSprite(Image img, Sprite sprite, int scale = 1)
        {
            img.sprite = sprite;
            img.enabled = sprite != null;
            if (sprite) img.rectTransform.sizeDelta = sprite.rect.size * scale;
        }

        /// <summary>A 9-slice panel from Art/ui/&lt;piece&gt;, covering <paramref name="rect"/>.</summary>
        public static Image Panel(string piece, Transform parent, Rect rect = default)
        {
            var tex = Art.Texture("ui/" + piece);
            var m = Ui[piece]["margins"]; // left, top, right, bottom
            var border = new Vector4((float)m[0], (float)m[3], (float)m[2], (float)m[1]);
            var img = Node(piece, parent, rect).gameObject.AddComponent<Image>();
            img.raycastTarget = false;
            img.sprite = Art.Sprite(tex, new RectInt(0, 0, tex.width, tex.height), default, border);
            img.type = Image.Type.Sliced;
            return img;
        }

        /// <summary>Frame <paramref name="i"/> of a horizontal strip in Art/ui/&lt;piece&gt;.</summary>
        public static Sprite Frame(string piece, int i)
        {
            var tex = Art.Texture("ui/" + piece);
            var frames = (int)Ui[piece]["frames"];
            var w = tex.width / frames;
            return Art.Sprite(tex, new RectInt(w * (i % frames), 0, w, tex.height));
        }

        public static Sprite Piece(string piece) => Art.Sprite(Art.Texture("ui/" + piece));

        /// <summary>Text in the pixel font. With a width it wraps; without, it is sized to its text.</summary>
        public static Text Label(string text, Transform parent, Rect rect = default, Color? color = null)
        {
            var t = Node("label", parent, rect).gameObject.AddComponent<Text>();
            t.raycastTarget = false;
            t.font = Font;
            t.fontSize = FontSize;
            t.color = color ?? Ink;
            t.supportRichText = true;
            t.alignment = TextAnchor.UpperLeft;
            t.horizontalOverflow = rect.width > 0 ? HorizontalWrapMode.Wrap : HorizontalWrapMode.Overflow;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            SetText(t, text);
            return t;
        }

        /// <summary>
        /// Changes a label's text, in the player's language (<see cref="Lang"/>); a label with no wrapping width is resized
        /// to fit it. The label keeps its English, so a change of language shows it again in the new one.
        /// </summary>
        public static void SetText(Text t, string text)
        {
            if (english.Count > pruneAt)
            {
                Prune();
                pruneAt = english.Count * 2 + 256;
            }
            english[t] = text;
            Show(t);
        }

        static readonly Dictionary<Text, string> english = new(); // each label's text as written
        static int pruneAt = 256;

        static void Show(Text t)
        {
            t.text = Lang.T(english[t]);
            if (t.horizontalOverflow == HorizontalWrapMode.Overflow)
                t.rectTransform.sizeDelta = new Vector2(Width(t), Mathf.Max(Line, Mathf.Ceil(t.preferredHeight)));
        }

        // Forgets the labels gone with their screens.
        static void Prune()
        {
            foreach (var t in new List<Text>(english.Keys))
                if (!t) english.Remove(t);
        }

        /// <summary>Shows every label again in the language now set.</summary>
        public static void Retranslate()
        {
            Prune();
            foreach (var (t, text) in english)
                if (text != "") Show(t); // a label that is typed out letter by letter (the talk box, the journal) is left as it is
        }

        /// <summary>How wide a label's text is, in canvas px.</summary>
        public static float Width(Text t) => Mathf.Ceil(t.preferredWidth);

        /// <summary>True when the mouse is over a rect of the screen canvas (top-left origin, y down).</summary>
        public static bool Hit(Rect r) => r.Contains(Controls.MouseCanvas);

        /// <summary>True when the mouse is over this UI node and it is showing.</summary>
        public static bool Hit(RectTransform rt) =>
            rt.gameObject.activeInHierarchy && RectTransformUtility.RectangleContainsScreenPoint(rt, Main.UiPoint, Main.Instance.Camera);
    }
}
