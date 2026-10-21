using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// The talk box: a portrait, the speaker's name, words typed out, and choices.
    /// Await <see cref="Say"/> and <see cref="Choose"/>. Click, Space or Enter shows the whole line, then moves on.
    /// Lines are alive: they type at the speaker's pace and catch their breath at commas and full stops, words written
    /// *like this* stand out in colour, and the line's mood shows on the portrait and in a bubble over the speaker's
    /// head (surprised !, puzzled ?, smile a note, moved a heart, cross a vein, sad a drop), a surprised or cross line
    /// jolting the box.
    /// </summary>
    public sealed class Talk : MonoBehaviour
    {
        /// <summary>Characters typed per second when no one speaks (narration).</summary>
        const float Speed = 50f;
        /// <summary>The voiced ones (the bible's 3.1B): seconds per letter, with a blip each in Art/sound/voice_&lt;id&gt;.
        /// Anyone else speaks as a villager, pitched by their id.</summary>
        static readonly Dictionary<string, float> Voices = new()
        {
            ["courier"] = .035f, ["marlow"] = .055f, ["helen"] = .040f, ["pip"] = .025f, ["nora"] = .048f, ["theo"] = .038f,
            ["sam"] = .032f, ["leo"] = .028f, ["mender"] = .050f, ["baker"] = .028f, ["gardener"] = .042f, ["arlo"] = .045f,
            ["bram"] = .052f, ["mia"] = .033f, ["valdo"] = .034f, ["kid"] = .020f, ["grandkid"] = .020f,
            ["gigi"] = .020f, ["kiko"] = .020f, ["lulu"] = .020f, ["young_helen"] = .040f, ["young_pip"] = .025f,
        };
        /// <summary>Those who speak in someone else's blip: the village's children in the kid's, Helen and Pip in memories in their own.</summary>
        static readonly Dictionary<string, string> Blips = new() { ["grandkid"] = "kid", ["gigi"] = "kid", ["kiko"] = "kid", ["lulu"] = "kid", ["young_helen"] = "helen", ["young_pip"] = "pip" };
        const float VillagerPace = .036f;
        /// <summary>How long the typing waits after a comma and after the end of a sentence, in seconds.</summary>
        const float CommaPause = .12f, StopPause = .32f;
        /// <summary>The emote bubbles' frames in Art/ui/emote, by mood.</summary>
        public static readonly Dictionary<string, int> Emotes = new() { ["surprised"] = 0, ["puzzled"] = 1, ["smile"] = 2, ["moved"] = 3, ["cross"] = 4, ["sad"] = 5 };
        public const float EmoteSeconds = 2f;
        const float ShakeSeconds = .3f;
        /// <summary>How far over the feet a head is, in art px, for the emote bubble.</summary>
        const float HeadHeight = 42f;
        const string Emphasis = "#c4472b"; // roofR2's deep red, readable on the paper
        /// <summary>The box's height for up to three lines; a longer line grows it.</summary>
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
        Image box, nameTag, frame, face, arrow, mark, emote;
        Text nameText, text;
        readonly List<Text> choices = new();
        float width = MaxWidth, height = Height, typed, clock, speed = Speed, pitch = 1f, hold, emoteLeft, shake;
        string full = "", who = "", mood = "", voice = "";
        bool[] marked = System.Array.Empty<bool>(); // which letters of the line stand out
        int shown, sel, picked = -1;
        bool next;
        Ant speaker, talker; // speaker: who is posed talking; talker: whoever says the line, for the emote
        Vector2 at;
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
            talk.emote = Look.Picture("emote", t);
            talk.Close();
            return talk;
        }

        public void Close()
        {
            root.gameObject.SetActive(false);
            list.gameObject.SetActive(false);
            emote.gameObject.SetActive(false);
            StopSpeaker();
            Sound.Speaking = false;
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
            this.who = who;
            this.mood = mood;
            face.gameObject.SetActive(who != "");
            frame.gameObject.SetActive(who != "");
            if (who != "") Look.SetSprite(face, Ant.Portrait(who, mood));
            var left = who != "" ? 62f : 10f;
            Mark(line);
            root.gameObject.SetActive(true);
            // the whole line is laid out from the start (the untyped rest invisible), so the box fits it before it types
            Look.Place(text.rectTransform, new Rect(left, 6, width - left - 10, Height - 12));
            Type(0);
            height = Mathf.Max(Height, Mathf.Ceil(text.preferredHeight) + 12);
            Look.Place(text.rectTransform, new Rect(left, 6, width - left - 10, height - 12));
            Look.Resize(box.rectTransform, new Vector2(width, height));
            Look.Move(arrow.rectTransform, new Vector2(width - 16, height - 13));
            var bottom = view.y - height - Margin;
            var top = Hides(actor, bottom) || Hides(Courier, bottom);
            at = new Vector2((view.x - width) / 2, top ? Margin + 10 : bottom);
            Look.Move(root, at);
            typed = hold = 0f;
            talker = actor;
            emoteLeft = Emotes.ContainsKey(mood) && actor ? EmoteSeconds : 0f;
            if (emoteLeft > 0) Look.SetSprite(emote, Look.Frame("emote", Emotes[mood]), Main.Zoom);
            emote.gameObject.SetActive(false);
            shake = mood is "surprised" or "cross" ? ShakeSeconds : 0f;
            Voice(who);
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
                while (!next)
                {
                    if (Controls.Skim) Type(full.Length); // developer builds only: the line is shown and moves on
                    await Main.Frame();
                    if (Controls.Skim && !Typing) next = true;
                }
        }

        /// <summary>Where the box is on screen, or an empty rect while it is closed.</summary>
        public Rect BoxRect => root.gameObject.activeSelf ? new Rect(Look.Pos(root), new Vector2(width, height)) : default;

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
                Look.Move(list, new Vector2(at.x + width - size.x, below ? at.y + height + 3 : at.y - size.y - 3));
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
            if (Typing && (hold -= Time.deltaTime) <= 0)
            {
                typed += speed * Time.deltaTime;
                var was = shown;
                Type(Mathf.Min((int)typed, full.Length));
                // One blip per frame at most, on the newest letter shown: spaces and punctuation are silent.
                if (voice != "" && shown > was && char.IsLetterOrDigit(full[shown - 1]))
                    Sound.Blip(voice, pitch * (1f + (char.ToLowerInvariant(full[shown - 1]) * 7 % 9 - 4) * .025f));
                // a breath after a comma, a longer one at the end of a sentence (not inside "..." or "?!")
                if (shown > was && shown < full.Length && full[shown] == ' ')
                {
                    var c = full[shown - 1];
                    if (c is ',' or ';' or ':' or '-') hold = CommaPause;
                    else if (c is '.' or '!' or '?') hold = StopPause;
                    if (hold > 0) typed = shown;
                }
            }
            if (!Typing) StopSpeaker();
            Animate();
            Sound.Speaking = voice != "" && Typing;
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

        // The box's jolt, and the emote bubble popping up over the speaker's head and bobbing there a moment.
        void Animate()
        {
            if (shake > 0)
            {
                shake -= Time.deltaTime;
                var d = shake > 0 ? Mathf.Round(Mathf.Sin(shake * 70f) * 3f * shake / ShakeSeconds) : 0f;
                Look.Move(root, at + new Vector2(d, 0));
            }
            var showing = emoteLeft > 0 && talker && talker.isActiveAndEnabled && Main.Instance.Place;
            emote.gameObject.SetActive(showing);
            if (!showing) return;
            emoteLeft -= Time.deltaTime;
            Over(emote, talker, EmoteSeconds - emoteLeft);
        }

        /// <summary>Puts an emote bubble over someone's head, popping up as it appears and bobbing after (<paramref name="age"/> in seconds).</summary>
        public static void Over(Image emote, Ant who, float age)
        {
            var rise = age < .12f ? (1 - age / .12f) * 6 : Mathf.Round(Mathf.Sin(age * 6f));
            var size = emote.rectTransform.sizeDelta;
            var head = Main.ToCanvas(who.Feet + new Vector2(0, -HeadHeight));
            Look.Move(emote.rectTransform, head - new Vector2(size.x / 2, size.y - rise));
        }

        // The line without its *marks*, and which of its letters they made stand out.
        void Mark(string line)
        {
            var plain = new System.Text.StringBuilder();
            var marks = new List<bool>();
            var on = false;
            foreach (var c in line)
            {
                if (c == '*') on = !on;
                else
                {
                    plain.Append(c);
                    marks.Add(on);
                }
            }
            full = plain.ToString();
            marked = marks.ToArray();
        }

        // Picks the voice and pace of who speaks: "" for narration, which is silent and quicker.
        void Voice(string id)
        {
            pitch = 1f;
            if (id == "") (voice, speed) = ("", Speed);
            else if (Voices.TryGetValue(id, out var pace)) (voice, speed) = (Blips.GetValueOrDefault(id, id), 1f / pace);
            else
            {
                (voice, speed) = ("villager", 1f / VillagerPace);
                var h = 0;
                foreach (var c in id) h = h * 31 + c;
                pitch = .85f + (h & 0x7fffffff) % 7 * .05f;
            }
        }

        // The untyped rest is laid out but transparent, so words never jump to the next line mid-way.
        void Type(int n)
        {
            shown = n;
            var s = new System.Text.StringBuilder();
            for (var i = 0; i < n; i++)
            {
                if (marked[i] && (i == 0 || !marked[i - 1])) s.Append("<color=").Append(Emphasis).Append('>');
                s.Append(full[i]);
                if (marked[i] && (i == n - 1 || !marked[i + 1])) s.Append("</color>");
            }
            if (n < full.Length) s.Append("<color=#00000000>").Append(full[n..]).Append("</color>");
            text.text = s.ToString();
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
