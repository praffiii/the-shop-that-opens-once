using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// What sits over the world while exploring: the day-and-phase dial at the top left, the bag button, the name of
    /// whatever is under the mouse, a bubble over whatever is close enough to use, short hints, and the pixel mouse cursor.
    /// </summary>
    public sealed class Hud : MonoBehaviour
    {
        const float ToastSeconds = 4f;
        /// <summary>How long the dial hops when the time of day moves on, in seconds.</summary>
        const float HopSeconds = 0.6f;

        /// <summary>Set by Main whenever the place changes.</summary>
        public Place Place;
        /// <summary>Set by Main: hints move below the talk box when it sits at the top.</summary>
        public Talk Talk;
        /// <summary>Hints and the cursor, above every panel. Main keeps it last on the screen.</summary>
        public RectTransform Top { get; private set; }

        Image bag, hoverTag, prompt, toastBox, cursor, dial, dialIcon;
        Text hover, toast, dialText;
        float toastLeft, clock, hop;
        (int, Phase) shown = (-1, Phase.Dusk); // the day and phase on the dial

        public static Hud Create(Transform parent)
        {
            var hud = Look.Node("Hud", parent).gameObject.AddComponent<Hud>();
            var t = hud.transform;
            hud.dial = Look.Panel("panel", t);
            hud.dialIcon = Look.Picture("phase", hud.dial.transform);
            hud.dialText = Look.Label("", hud.dial.transform);
            hud.bag = Look.Picture("bag", t, Art.Sprite(Art.Texture("icons/bag")));
            hud.hoverTag = Look.Panel("name", t);
            hud.hover = Look.Label("", hud.hoverTag.transform, default, Art.Color((string)Look.Ui["name"]["text"]));
            hud.prompt = Look.Picture("prompt", t);
            hud.Top = Look.Node("Top", parent);
            hud.toastBox = Look.Panel("panel", hud.Top);
            hud.toast = Look.Label("", hud.toastBox.transform);
            hud.cursor = Look.Picture("cursor", hud.Top);
            hud.toastBox.gameObject.SetActive(false);
            Cursor.visible = false;
            return hud;
        }

        void OnDestroy() => Cursor.visible = true;

        bool Exploring => Place && Place.Player && Place.Controls;

        public void Toast(string text)
        {
            Look.SetText(toast, text);
            Look.Move(toast.rectTransform, new Vector2(8, 4));
            var size = new Vector2(Look.Width(toast) + 16, Look.Line + 9);
            Look.Place(toastBox.rectTransform, new Rect(Mathf.Round((Main.Size.x - size.x) / 2), 6, size.x, size.y));
            toastBox.gameObject.SetActive(true);
            toastLeft = ToastSeconds;
        }

        /// <summary>A click on the bag button while exploring.</summary>
        public bool Handle() => Exploring && Controls.Click && Look.Hit(bag.rectTransform);

        // The day and the time of day, top left: a little window on the sky and "Day 1 · Morning". It hops when the
        // story moves the time on.
        void Dial(bool exploring)
        {
            dial.gameObject.SetActive(exploring);
            if (!exploring) return;
            var now = (Game.Chapter, Game.Phase);
            if (now != shown)
            {
                if (shown.Item1 >= 0) hop = HopSeconds;
                shown = now;
                Look.SetSprite(dialIcon, Art.Sprite(Art.Texture("icons/" + Game.Phase.ToString().ToLowerInvariant())));
                Look.SetText(dialText, $"Day {Game.Chapter} · {Game.Phase}");
                Look.Move(dialIcon.rectTransform, new Vector2(4, 3));
                Look.Move(dialText.rectTransform, new Vector2(24, 5));
                Look.Resize(dial.rectTransform, new Vector2(Look.Width(dialText) + 30, 22));
            }
            hop = Mathf.Max(0, hop - Time.deltaTime);
            Look.Move(dial.rectTransform, new Vector2(8, 8 - Mathf.Round(Mathf.Sin(hop / HopSeconds * Mathf.PI) * 4)));
        }

        public void Tick()
        {
            clock += Time.deltaTime;
            var view = Main.Size;
            var mouse = Controls.MouseCanvas;
            var exploring = Exploring;
            var pointing = exploring && (Place.Hover != null || Look.Hit(bag.rectTransform));
            var piece = pointing ? "cursor_hand" : "cursor";
            var hotspot = Art.Point(Look.Ui[piece]["hotspot"]);
            Look.SetSprite(cursor, Look.Piece(piece));
            Look.Move(cursor.rectTransform, mouse - hotspot);
            cursor.gameObject.SetActive(Application.isFocused);

            bag.gameObject.SetActive(exploring);
            Dial(exploring);
            Look.Move(bag.rectTransform, new Vector2(view.x - 24, 8));
            hoverTag.gameObject.SetActive(exploring && Place.Hover != null);
            if (hoverTag.gameObject.activeSelf)
            {
                Look.SetText(hover, Place.Hover.Label);
                Look.Move(hover.rectTransform, new Vector2(5, 1));
                var size = new Vector2(Look.Width(hover) + 10, 14);
                var at = Vector2.Min(Vector2.Max(mouse + new Vector2(10, 8), Vector2.zero), view - size);
                Look.Place(hoverTag.rectTransform, new Rect(Mathf.Round(at.x), Mathf.Round(at.y), size.x, size.y));
            }

            prompt.gameObject.SetActive(exploring && Place.Near != null && Place.Near != Place.Hover);
            if (prompt.gameObject.activeSelf)
            {
                // The bubble belongs to the world, so it is drawn with world-sized pixels.
                Look.SetSprite(prompt, Look.Frame("prompt", (int)(clock * 3)), Main.Zoom);
                var area = Place.Near.GlobalArea;
                var top = Main.ToCanvas(new Vector2(area.center.x, area.y));
                var size = prompt.rectTransform.sizeDelta;
                Look.Move(prompt.rectTransform, top - new Vector2(size.x / 2, size.y + Main.Zoom));
            }

            if (toastLeft > 0)
            {
                toastLeft -= Time.deltaTime;
                toastBox.gameObject.SetActive(toastLeft > 0);
                var box = Talk ? Talk.BoxRect : default;
                var y = box.height > 0 && box.y < 40 ? box.yMax + 4 : 6f;
                // below the dial when a long hint would run into it
                var dialEdge = Look.Pos(dial.rectTransform).x + dial.rectTransform.sizeDelta.x + 4;
                if (dial.gameObject.activeSelf && Look.Pos(toastBox.rectTransform).x < dialEdge) y = Mathf.Max(y, 8 + dial.rectTransform.sizeDelta.y + 4);
                Look.Move(toastBox.rectTransform, new Vector2(Look.Pos(toastBox.rectTransform).x, y));
            }
        }
    }
}
