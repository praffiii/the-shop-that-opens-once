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
        Text itemName, sideText;
        Image big;
        string looking = ""; // the keepsake being looked at, or ""
        int side;
        bool closed;

        public static Bag Create(Transform parent)
        {
            var bag = Look.Node("Bag", parent).gameObject.AddComponent<Bag>();
            bag.panel = (RectTransform)Look.Panel("panel", bag.transform, new Rect(Vector2.zero, Size)).transform;
            bag.contents = Look.Node("contents", bag.panel, new Rect(Vector2.zero, Size));
            bag.closer = Look.Node("closer", bag.panel, new Rect(Vector2.zero, Size));
            var c = bag.contents;
            Look.Label("Bag", c, new Rect(12, 10, 100, 12));
            bag.itemName = Look.Label("", c, new Rect(12, 62, 130, 30));
            Look.Label("Notes", c, new Rect(156, 10, 100, 12));
            bag.notes = Look.Node("notes", c, new Rect(156, 28, NotesWidth, 180));
            Look.Label("E or Esc to close", c, new Rect(12, 208, 150, 12), Look.Soft);
            bag.big = Look.Picture("big", bag.closer, null, 2);
            bag.sideText = Look.Label("", bag.closer, new Rect(30, 156, 340, 30));
            bag.sideText.alignment = TextAnchor.UpperCenter;
            for (var i = 0; i < 2; i++)
                bag.arrows[i] = Look.Label(i == 0 ? "<" : ">", bag.closer, new Rect(110 + i * 170, 84, 12, 12)).rectTransform;
            Look.Label("A / D to turn it over. Esc to put it back.", bag.closer, new Rect(12, 208, 300, 12), Look.Soft);
            bag.gameObject.SetActive(false);
            return bag;
        }

        public bool Open => gameObject.activeSelf;

        public async Awaitable Show()
        {
            looking = "";
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
                LookAt(Game.Bag[0]);
            else if (looking == "" && Controls.Click)
            {
                for (var i = 0; i < slots.Count; i++)
                    if (Look.Hit(slots[i])) LookAt(Game.Bag[i]);
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
                var s = Keepsakes.All[looking].Sides[side];
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
                var slot = (RectTransform)Look.Panel("slot", contents, new Rect(12 + i * 26, 28, 22, 22)).transform;
                var art = Look.Picture("art", slot, Keepsakes.Art(Game.Bag[i], "sm"));
                Look.Move(art.rectTransform, (new Vector2(22, 22) - art.rectTransform.sizeDelta) / 2);
                slots.Add(slot);
            }
            Look.SetText(itemName, Game.Bag.Count == 0 ? "Nothing yet." : $"{Keepsakes.All[Game.Bag[0]].Name}\nClick it or press I to look closer.");
            for (var i = notes.childCount - 1; i >= 0; i--) Destroy(notes.GetChild(i).gameObject);
            var y = 0f;
            foreach (var note in Game.Notes)
            {
                var l = Look.Label(note, notes, new Rect(0, y, NotesWidth, 0));
                var h = Mathf.Max(Look.Line, Mathf.Ceil(l.preferredHeight));
                Look.Resize(l.rectTransform, new Vector2(NotesWidth, h));
                y += h + 5;
            }
            if (Game.Notes.Count == 0) Look.Label("Nothing noted yet.", notes, default, Look.Soft);
        }
    }
}
