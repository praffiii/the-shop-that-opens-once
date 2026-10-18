using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// The talk box: a portrait, the speaker's name, words typed out, and choices.
    /// Await <see cref="Say"/> and <see cref="Choose"/>. Click, Space or Enter shows the whole line, then moves on.
    /// </summary>
    public sealed class Talk : MonoBehaviour
    {
        /// <summary>Characters typed per second.</summary>
        const float Speed = 50f;
        const float Height = 62f;
        /// <summary>The box spans the screen up to this width.</summary>
        const float MaxWidth = 560f;
        /// <summary>Gap between the box and the bottom of the screen.</summary>
        const float Margin = 6f;

        /// <summary>Set by Main: the box moves to the top of the screen rather than hide the courier (null while the camera looks elsewhere).</summary>
        public Ant Courier;
        /// <summary>For tests in <see cref="Main.Auto"/> mode: the options to pick next, in order; otherwise the first one.</summary>
        public readonly Queue<string> Picks = new();

        RectTransform root, list;
        Image box, nameTag, frame, face, arrow, mark;
        Text nameText, text;
        readonly List<Text> choices = new();
        float width = MaxWidth, typed, clock;
        string full = "", who = "", mood = "";
        int shown, sel, picked = -1;
        bool next;
        Ant speaker;
        Vector2 lastMouse;

        public static Talk Create(Transform parent)
        {
            var talk = Look.Node("Talk", parent).gameObject.AddComponent<Talk>();
            var t = talk.transform;
            talk.root = Look.Node("box", t);
            talk.box = Look.Panel("panel", talk.root);
            talk.nameTag = Look.Panel("name", talk.root);
            talk.nameText = Look.Label("", talk.nameTag.transform, default, Art.Color((string)Look.Ui["name"]["text"]));
            talk.text = Look.Label("", talk.root, new Rect(0, 6, 1, 50));
            talk.frame = Look.Panel("slot", talk.root, new Rect(5, 5, 52, 52));
            talk.face = Look.Picture("face", talk.root);
            Look.Move(talk.face.rectTransform, new Vector2(7, 7));
            talk.arrow = Look.Picture("next", talk.root);
            talk.list = (RectTransform)Look.Panel("panel", t).transform;
            talk.mark = Look.Panel("choice", talk.list);
            talk.Close();
            return talk;
        }

        public void Close()
        {
            root.gameObject.SetActive(false);
            list.gameObject.SetActive(false);
            StopSpeaker();
        }

        public bool Open => root.gameObject.activeSelf || list.gameObject.activeSelf;

        /// <summary>
        /// Shows one line and returns when the player moves on. <paramref name="who"/> is a character id for the
        /// portrait ("" for none); <paramref name="speakerName"/> is the name shown ("" for none).
        /// </summary>
        public async Awaitable Say(string speakerName, string who, string line, string mood = "neutral", Ant actor = null)
        {
            list.gameObject.SetActive(false);
            var view = Main.Size;
            width = Mathf.Min(view.x - 2 * Margin, MaxWidth);
            Look.Resize(box.rectTransform, new Vector2(width, Height));
            Look.Move(arrow.rectTransform, new Vector2(width - 16, Height - 13));
            var bottom = view.y - Height - Margin;
            var top = Hides(actor, bottom) || Hides(Courier, bottom);
            Look.Move(root, new Vector2((view.x - width) / 2, top ? Margin + 10 : bottom));
            root.gameObject.SetActive(true);
            this.who = who;
            this.mood = mood;
            face.gameObject.SetActive(who != "");
            frame.gameObject.SetActive(who != "");
            if (who != "") Look.SetSprite(face, Ant.Portrait(who, mood));
            var left = who != "" ? 62f : 10f;
            Look.Place(text.rectTransform, new Rect(left, 6, width - left - 10, 50));
            full = line;
            typed = 0f;
            Type(0);
            nameTag.gameObject.SetActive(speakerName != "");
            Look.SetText(nameText, speakerName);
            Look.Move(nameText.rectTransform, new Vector2(5, 1));
            Look.Place(nameTag.rectTransform, new Rect(left - 4, -10, Look.Width(nameText) + 10, 14));
            StopSpeaker();
            if (actor && actor.Pose == "idle")
            {
                speaker = actor;
                actor.Pose = "talk";
            }
            next = false;
            if (Main.Auto) await Main.Frame();
            else
                while (!next) await Main.Frame();
        }

        /// <summary>Where the box is on screen, or an empty rect while it is closed.</summary>
        public Rect BoxRect => root.gameObject.activeSelf ? new Rect(Look.Pos(root), new Vector2(width, Height)) : default;

        /// <summary>
        /// Lists <paramref name="options"/> and returns the index picked. The list sits by the talk box's right end,
        /// or centred under <paramref name="topCenter"/> when given.
        /// </summary>
        public async Awaitable<int> Choose(string[] options, Vector2? topCenter = null)
        {
            foreach (var c in choices) Destroy(c.gameObject);
            choices.Clear();
            var w = 0f;
            foreach (var o in options)
            {
                var l = Look.Label(o, list);
                choices.Add(l);
                w = Mathf.Max(w, Look.Width(l));
            }
            var size = new Vector2(w + 22, options.Length * Look.Line + 10);
            Look.Resize(list, size);
            if (topCenter is { } tc)
                Look.Move(list, new Vector2(tc.x - size.x / 2, tc.y));
            else
            {
                var at = Look.Pos(root);
                var below = at.y < Main.Size.y / 2;
                Look.Move(list, new Vector2(at.x + width - size.x, below ? at.y + Height + 3 : at.y - size.y - 3));
            }
            for (var i = 0; i < choices.Count; i++) Look.Move(choices[i].rectTransform, new Vector2(12, 4 + i * Look.Line));
            arrow.gameObject.SetActive(false);
            Select(0);
            list.gameObject.SetActive(true);
            picked = -1;
            if (Main.Auto)
            {
                await Main.Frame();
                picked = Picks.Count > 0 ? System.Array.IndexOf(options, Picks.Dequeue()) : 0;
                if (picked < 0) throw new System.InvalidOperationException($"None of [{string.Join(", ", options)}] was the expected pick");
            }
            else
                while (picked < 0) await Main.Frame();
            Sound.Play("pop");
            list.gameObject.SetActive(false);
            return picked;
        }

        /// <summary>Takes this frame's clicks and keys while the box or a list is open.</summary>
        public bool Handle()
        {
            if (list.gameObject.activeSelf)
            {
                if (Controls.Up) Select((sel + choices.Count - 1) % choices.Count);
                else if (Controls.Down) Select((sel + 1) % choices.Count);
                else if (Controls.Interact) picked = sel;
                else if (Controls.Click)
                    for (var i = 0; i < choices.Count; i++)
                        if (Look.Hit(choices[i].rectTransform)) picked = i;
                return true;
            }
            if (!root.gameObject.activeSelf) return false;
            if (Controls.Interact || Controls.Click)
            {
                if (Typing) Type(full.Length);
                else next = true;
            }
            return true;
        }

        public void Tick()
        {
            clock += Time.deltaTime;
            if (list.gameObject.activeSelf && Controls.MouseCanvas != lastMouse)
                for (var i = 0; i < choices.Count; i++)
                    if (Look.Hit(choices[i].rectTransform)) Select(i);
            lastMouse = Controls.MouseCanvas;
            if (!root.gameObject.activeSelf) return;
            if (Typing)
            {
                typed += Speed * Time.deltaTime;
                Type(Mathf.Min((int)typed, full.Length));
            }
            else StopSpeaker();
            arrow.gameObject.SetActive(!list.gameObject.activeSelf && !Typing);
            // Portrait frames: 0 rests, 1 has the mouth open, 2 blinks.
            if (who != "")
            {
                var mouth = Typing && (int)(clock * 8) % 2 == 1;
                var blink = !Typing && clock % 3.5f < 0.15f;
                face.sprite = Ant.Portrait(who, mood, mouth ? 1 : blink ? 2 : 0);
            }
            if (arrow.gameObject.activeSelf) arrow.sprite = Look.Frame("next", (int)(clock * 6));
        }

        bool Typing => shown < full.Length;

        // The untyped rest is laid out but transparent, so words never jump to the next line mid-way.
        void Type(int n)
        {
            shown = n;
            text.text = n >= full.Length ? full : full[..n] + "<color=#00000000>" + full[n..] + "</color>";
        }

        // True when a box at box y would cover a good part of someone on screen (more than their feet).
        static bool Hides(Ant someone, float boxY)
        {
            if (!someone || !someone.isActiveAndEnabled) return false;
            var feet = Main.ToCanvas(someone.Feet).y;
            return feet > boxY + 24 && feet < Main.Size.y + 32;
        }

        void Select(int i)
        {
            sel = i;
            Look.Place(mark.rectTransform, new Rect(5, 3 + i * Look.Line, list.sizeDelta.x - 10, Look.Line + 2));
        }

        void StopSpeaker()
        {
            if (speaker && speaker.Pose == "talk") speaker.Pose = "idle";
            speaker = null;
        }
    }
}
