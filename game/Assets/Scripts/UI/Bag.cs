using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// The courier's bag: the keepsakes carried and the notes. A keepsake can be turned over to look at each side,
    /// and noticing something adds it to the notes. Await <see cref="Show"/>.
    /// </summary>
    public sealed class Bag : MonoBehaviour
    {
        static readonly Vector2 Size = new(400, 230);
        const float NotesWidth = 232f;

        RectTransform panel, contents, closer, notes;
        readonly List<RectTransform> slots = new();
        readonly RectTransform[] arrows = new RectTransform[2];
        Text itemName, sideText, closerHint;
        Image big;
        string looking = ""; // the keepsake being looked at, or ""
        int side, pick; // the side turned up, and the slot picked in the bag
        const int PerRow = 5;
        bool closed;

        public static Bag Create(Transform parent)
        {
            var bag = Look.Node("Bag", parent).gameObject.AddComponent<Bag>();
            bag.panel = (RectTransform)Look.Panel("panel", bag.transform, new Rect(Vector2.zero, Size)).transform;
            bag.contents = Look.Node("contents", bag.panel, new Rect(Vector2.zero, Size));
            bag.closer = Look.Node("closer", bag.panel, new Rect(Vector2.zero, Size));
            var c = bag.contents;
            Look.Label("Bag", c, new Rect(12, 10, 100, 12));
            bag.itemName = Look.Label("", c, new Rect(12, 62, 132, 120));
            Look.Label("Notes", c, new Rect(156, 10, 100, 12));
            bag.notes = Look.Node("notes", c, new Rect(156, 28, NotesWidth, 180));
            Look.Label("A / D to pick, I to look closer, E or Esc to close", c, new Rect(12, 208, 376, 12), Look.Soft);
            bag.big = Look.Picture("big", bag.closer, null, 2);
            bag.sideText = Look.Label("", bag.closer, new Rect(30, 156, 340, 30));
            bag.sideText.alignment = TextAnchor.UpperCenter;
            for (var i = 0; i < 2; i++)
                bag.arrows[i] = Look.Label(i == 0 ? "<" : ">", bag.closer, new Rect(110 + i * 170, 84, 12, 12)).rectTransform;
            bag.closerHint = Look.Label("", bag.closer, new Rect(12, 208, 300, 12), Look.Soft);
            bag.gameObject.SetActive(false);
            return bag;
        }

        public bool Open => gameObject.activeSelf;

        public async Awaitable Show()
        {
            looking = "";
            pick = Mathf.Clamp(pick, 0, Mathf.Max(0, Game.Bag.Count - 1));
            Look.Move(panel, (Main.Size - Size) / 2);
            Refresh();
            closed = false;
            gameObject.SetActive(true);
            while (!closed) await Main.Frame();
            gameObject.SetActive(false);
        }

        public bool Handle()
        {
            if (!Open) return false;
            if (Controls.Cancel || Controls.Bag)
            {
                if (looking != "") LookAt("");
                else closed = true;
            }
            else if (looking == "" && (Controls.Inspect || Controls.Interact) && Game.Bag.Count > 0)
                LookAt(Game.Bag[pick]);
            else if (looking == "" && (Controls.Left || Controls.Right) && Game.Bag.Count > 0)
                Pick((pick + (Controls.Left ? -1 : 1) + Game.Bag.Count) % Game.Bag.Count);
            else if (looking == "" && Controls.Click && !Look.Hit(panel)) closed = true; // a click outside puts the bag away
            else if (looking == "")
            {
                // the slot under the mouse is the one picked; a click on it looks closer
                for (var i = 0; i < slots.Count; i++)
                    if (Look.Hit(slots[i]))
                    {
                        if (i != pick) Pick(i);
                        if (Controls.Click) LookAt(Game.Bag[i]);
                        break;
                    }
            }
            else if (looking != "" && (Controls.Left || (Controls.Click && Look.Hit(arrows[0])))) Turn(-1);
            else if (looking != "" && (Controls.Right || (Controls.Click && Look.Hit(arrows[1])))) Turn(1);
            return true;
        }

        /// <summary>Picks up a keepsake to look at closely, or puts it back with "".</summary>
        public void LookAt(string id)
        {
            looking = id;
            side = 0;
            Refresh();
        }

        void Pick(int i)
        {
            pick = i;
            Refresh();
        }

        public void Turn(int step)
        {
            side = (side + step + Keepsakes.All[looking].Sides.Length) % Keepsakes.All[looking].Sides.Length;
            Refresh();
        }

        void Refresh()
        {
            contents.gameObject.SetActive(looking == "");
            closer.gameObject.SetActive(looking != "");
            if (looking != "")
            {
                var sides = Keepsakes.All[looking].Sides;
                var s = sides[side];
                // only something with another side to it can be turned over
                foreach (var a in arrows) a.gameObject.SetActive(sides.Length > 1);
                Look.SetText(closerHint, sides.Length > 1 ? "A / D to turn it over. Esc to put it back." : "Esc to put it back.");
                Look.SetSprite(big, Keepsakes.Art(looking, "lg", s.Variant), 2);
                Look.Move(big.rectTransform, new Vector2(200, 80) - big.rectTransform.sizeDelta / 2);
                Look.SetText(sideText, s.Seen);
                if (s.Note != "") Game.Note(s.Note);
                Game.Mark($"seen_{looking}_{s.Variant}");
                return;
            }
            foreach (var s in slots) Destroy(s.gameObject);
            slots.Clear();
            for (var i = 0; i < Game.Bag.Count; i++)
            {
                var slot = (RectTransform)Look.Panel(i == pick ? "choice" : "slot", contents, new Rect(12 + i % PerRow * 26, 28 + i / PerRow * 26, 22, 22)).transform;
                var art = Look.Picture("art", slot, Keepsakes.Art(Game.Bag[i], "sm"));
                Look.Move(art.rectTransform, (new Vector2(22, 22) - art.rectTransform.sizeDelta) / 2);
                slots.Add(slot);
            }
            // the picked thing's name and what it is, under the slots
            var rows = Mathf.Max(1, (Game.Bag.Count + PerRow - 1) / PerRow);
            Look.Place(itemName.rectTransform, new Rect(12, 28 + rows * 26 + 6, 132, 180 - rows * 26));
            if (Game.Bag.Count == 0) Look.SetText(itemName, "Nothing yet.");
            else
            {
                var k = Keepsakes.All[Game.Bag[pick]];
                Look.SetText(itemName, $"{k.Name}\n<color=#7a452e>{k.Sides[0].Seen}</color>");
            }
            for (var i = notes.childCount - 1; i >= 0; i--) Destroy(notes.GetChild(i).gameObject);
            // the newest notes that fit, oldest of them at the top
            var labels = new List<Text>();
            var room = notes.sizeDelta.y;
            for (var i = Game.Notes.Count - 1; i >= 0; i--)
            {
                var l = Look.Label(Game.Notes[i], notes, new Rect(0, 0, NotesWidth, 0));
                var h = Mathf.Max(Look.Line, Mathf.Ceil(l.preferredHeight));
                if (room < h)
                {
                    Destroy(l.gameObject);
                    break;
                }
                Look.Resize(l.rectTransform, new Vector2(NotesWidth, h));
                room -= h + 5;
                labels.Insert(0, l);
            }
            var y = 0f;
            foreach (var l in labels)
            {
                Look.Move(l.rectTransform, new Vector2(0, y));
                y += l.rectTransform.sizeDelta.y + 5;
            }
            if (Game.Notes.Count == 0) Look.Label("Nothing noted yet.", notes, default, Look.Soft);
        }
    }
}
