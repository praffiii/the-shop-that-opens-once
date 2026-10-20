using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// What sits over the world while exploring: the day-and-phase dial at the top left, the bag button, the name of
    /// whatever is under the mouse, a bubble over whatever is close enough to use, short hints, the bubbles of villagers going about their day, and the pixel mouse cursor.
    /// Coming into a place, its name drops in on a sign hung from the top of the screen and goes back up. When
    /// something new goes in the bag (a thing or a note) the bag hops and wears a dot until it is opened.
    /// </summary>
    public sealed class Hud : MonoBehaviour
    {
        const float ToastSeconds = 4f, HopSeconds = 0.6f;
        /// <summary>The place sign: how long it takes to drop in, how long it hangs, how long it takes to go back up, and where it hangs.</summary>
        const float SignDrop = 0.4f, SignHang = 3f, SignRise = 0.35f, SignY = 12f, SignHeight = 18f;

        /// <summary>Set by Main whenever the place changes.</summary>
        public Place Place;
        /// <summary>Set by Main: hints move below the talk box when it sits at the top.</summary>
        public Talk Talk;
        /// <summary>Hints and the cursor, above every panel. Main keeps it last on the screen.</summary>
        public RectTransform Top { get; private set; }

        Image bag, badge, hoverTag, prompt, toastBox, cursor, sign;
        readonly Image[] ropes = new Image[2];
        Text hover, toast, signText;
        Dial dial;
        float toastLeft, clock, signAge = -1, bagHop;
        string signed; // the place the sign last named
        readonly HashSet<string> seen = new(); // what the bag has held (things and notes) when it was open
        bool looked;
        int fresh;
        // a villager's bubble and how long it has shown (Villager: a note as they hum, a "!" as the courier comes by)
        readonly Dictionary<Ant, (Image image, float age)> bubbles = new();
        // a villager's word in passing, in its balloon (Villager: a hello as the courier comes by); two at most at once
        readonly Dictionary<Ant, (Image image, float age)> barks = new();
        const float BarkSeconds = 2.6f;
        const int BarksAtOnce = 2;

        public static Hud Create(Transform parent)
        {
            var hud = Look.Node("Hud", parent).gameObject.AddComponent<Hud>();
            var t = hud.transform;
            hud.dial = Dial.Create(t);
            hud.bag = Look.Picture("bag", t, Art.Sprite(Art.Texture("icons/bag")));
            hud.badge = Look.Picture("badge", hud.bag.transform, Look.Piece("badge"));
            Look.Move(hud.badge.rectTransform, new Vector2(12, -2));
            hud.sign = Look.Panel("sign", t);
            for (var i = 0; i < 2; i++) hud.ropes[i] = Look.Picture("rope", hud.sign.transform, Look.Piece("sign_rope"));
            hud.signText = Look.Label("", hud.sign.transform, default, Art.Color((string)Look.Ui["sign"]["text"]));
            hud.sign.gameObject.SetActive(false);
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

        /// <summary>A mood's bubble over someone's head for a moment, as over a speaker's (Talk.Emotes).</summary>
        public void Emote(Ant ant, string mood)
        {
            var image = bubbles.TryGetValue(ant, out var b) ? b.image : Look.Picture("emote", transform);
            Look.SetSprite(image, Look.Frame("emote", Talk.Emotes[mood]), Main.Zoom);
            bubbles[ant] = (image, 0f);
        }

        /// <summary>A word over someone's head for a moment, in a small paper balloon round it.</summary>
        public void Bark(Ant ant, string text)
        {
            if (!barks.TryGetValue(ant, out var b) && barks.Count >= BarksAtOnce) return;
            var box = b.image ? b.image : Look.Panel("bark", transform);
            var label = box.GetComponentInChildren<Text>() ?? Look.Label("", box.transform, default, Art.Color((string)Look.Ui["bark"]["text"]));
            var tail = box.transform.Find("tail") ?? Look.Picture("tail", box.transform, Look.Piece("bark_tail")).transform;
            Look.SetText(label, text);
            var size = new Vector2(Look.Width(label) + 10, Look.Line + 4);
            Look.Resize(box.rectTransform, size);
            Look.Move(label.rectTransform, new Vector2(5, 2));
            Look.Move((RectTransform)tail, new Vector2(Mathf.Floor(size.x / 2) - 1, size.y - 1));
            barks[ant] = (box, 0f);
        }

        void Bubbles(bool exploring)
        {
            Show(bubbles, Talk.EmoteSeconds, exploring);
            Show(barks, BarkSeconds, exploring);
        }

        // Keeps each bubble over its head while it lasts, and only while the courier is free to walk.
        void Show(Dictionary<Ant, (Image image, float age)> shown, float seconds, bool exploring)
        {
            foreach (var ant in new List<Ant>(shown.Keys))
            {
                var (image, age) = shown[ant];
                age += Time.deltaTime;
                if (!ant || age > seconds)
                {
                    Destroy(image.gameObject);
                    shown.Remove(ant);
                    continue;
                }
                shown[ant] = (image, age);
                image.gameObject.SetActive(exploring && ant.isActiveAndEnabled);
                Talk.Over(image, ant, age);
            }
        }

        // The place's name, once each time the courier comes into a place: the sign drops in on its ropes, overshooting
        // a little, hangs, and goes back up. It waits, paused, while a scene plays.
        void Sign(bool exploring, Vector2 view)
        {
            if (exploring && Place.Def.Id != signed)
            {
                signed = Place.Def.Id;
                signAge = Place.Def.Name != null ? 0 : -1;
                Look.SetText(signText, Place.Def.Name ?? "");
            }
            var showing = exploring && signAge >= 0;
            sign.gameObject.SetActive(showing);
            if (!showing) return;
            signAge += Time.deltaTime;
            if (signAge > SignDrop + SignHang + SignRise)
            {
                signAge = -1;
                sign.gameObject.SetActive(false);
                return;
            }
            var size = new Vector2(Look.Width(signText) + 16, SignHeight);
            var up = -SignHeight - 2;
            var y = signAge < SignDrop ? Mathf.LerpUnclamped(up, SignY, Back(signAge / SignDrop))
                : signAge < SignDrop + SignHang ? SignY
                : Mathf.Lerp(SignY, up, (signAge - SignDrop - SignHang) / SignRise);
            Look.Place(sign.rectTransform, new Rect(Mathf.Round((view.x - size.x) / 2), Mathf.Round(y), size.x, size.y));
            Look.Move(signText.rectTransform, new Vector2(8, 3));
            // the ropes run up from its two top nails to the top of the screen
            Look.Move(ropes[0].rectTransform, new Vector2(2, -12));
            Look.Move(ropes[1].rectTransform, new Vector2(size.x - 5, -12));
        }

        // Ease out with a little overshoot past the end, as a dropped sign bounces on its ropes.
        static float Back(float k)
        {
            const float c = 1.70158f;
            return 1 + (c + 1) * Mathf.Pow(k - 1, 3) + c * Mathf.Pow(k - 1, 2);
        }

        // Something in the bag the player has not opened it to see yet.
        void Bag(bool exploring)
        {
            // what the courier set out with counts as seen
            if (!looked || Main.Instance.Bag.Open)
            {
                looked = true;
                seen.UnionWith(Game.Bag);
                seen.UnionWith(Game.Notes);
            }
            var news = 0;
            foreach (var id in Game.Bag) if (!seen.Contains(id)) news++;
            foreach (var note in Game.Notes) if (!seen.Contains(note)) news++;
            if (news > fresh) bagHop = HopSeconds;
            fresh = news;
            badge.gameObject.SetActive(news > 0);
            if (exploring) bagHop = Mathf.Max(0, bagHop - Time.deltaTime); // it hops where the player can see it
        }

        /// <summary>A click on the bag button while exploring.</summary>
        public bool Handle() => Exploring && Controls.Click && Look.Hit(bag.rectTransform);

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
            dial.Tick(exploring);
            Bubbles(exploring);
            Sign(exploring, view);
            Bag(exploring);
            var tip = exploring ? Place.Hover?.Label ?? (Look.Hit(dial.Area) ? dial.Tip : null) : null;
            Look.Move(bag.rectTransform, new Vector2(view.x - 24, 8 - Mathf.Round(Mathf.Sin(bagHop / HopSeconds * Mathf.PI) * 3)));
            hoverTag.gameObject.SetActive(tip != null);
            if (hoverTag.gameObject.activeSelf)
            {
                Look.SetText(hover, tip);
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
                var clear = dial.Area;
                if (dial.isActiveAndEnabled && Look.Pos(toastBox.rectTransform).x < clear.xMax + 4) y = Mathf.Max(y, clear.yMax + 4);
                if (sign.gameObject.activeSelf) y = Mathf.Max(y, Look.Pos(sign.rectTransform).y + SignHeight + 4); // under the place's sign
                Look.Move(toastBox.rectTransform, new Vector2(Look.Pos(toastBox.rectTransform).x, y));
            }
        }
    }
}
