using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace Shop
{
    /// <summary>The time of day. It moves with the story, never with a clock (Main.MovePhase).</summary>
    public enum Phase { Morning, Midday, Dusk, Night }

    /// <summary>
    /// The story so far: the chapter, the time of day, what the courier carries and has noticed, and saving.
    /// Chapter 0 is the prologue, 1 to 7 are the nights and 8 is the epilogue.
    /// What the courier carries goes on from one chapter to the next. A flag (<see cref="Mark"/>) or a note lasts the
    /// chapter, unless it is a standing fact the later chapters build on (<see cref="Remember"/>, a kept note).
    /// The game saves as each chapter starts and at each checkpoint in it (each turn of the clock), in one JSON value.
    /// </summary>
    public static class Game
    {
        public const int Epilogue = 8;
        const string SaveKey = "save";

        public static int Chapter { get; private set; }
        public static Phase Phase = Phase.Dusk;
        /// <summary>Where in the chapter the last save was made ("" at its start), for the chapter to pick up from.</summary>
        public static string Checkpoint { get; private set; } = "";
        /// <summary>Lanterns already out in Marlow's shop.</summary>
        public static int LanternsOut;
        /// <summary>Keepsakes the courier carries.</summary>
        public static readonly List<string> Bag = new();
        /// <summary>What the courier has noticed, oldest first.</summary>
        public static readonly List<string> Notes = new();
        static readonly HashSet<string> flags = new(), kept = new(), keptNotes = new();

        public static event Action<string> Noted;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        static void Reset()
        {
            NewGame();
            Noted = null;
        }

        /// <summary>Everything as it was before the prologue.</summary>
        public static void NewGame()
        {
            Bag.Clear();
            Notes.Clear();
            kept.Clear();
            keptNotes.Clear();
            StartChapter(0, Phase.Dusk);
        }

        /// <summary>A chapter begins: the clock at its start, the last chapter's flags and passing notes gone.</summary>
        public static void StartChapter(int n, Phase phase)
        {
            Chapter = n;
            LanternsOut = Mathf.Clamp(n - 1, 0, 7);
            Phase = phase;
            Checkpoint = "";
            flags.Clear();
            Notes.RemoveAll(note => !keptNotes.Contains(note));
        }

        public static bool Has(string flag) => flags.Contains(flag) || kept.Contains(flag);

        /// <summary>Something that happened in this chapter.</summary>
        public static void Mark(string flag) => flags.Add(flag);

        /// <summary>A standing fact that later chapters build on (Helen leaves her lantern lit, Theo opens his door).</summary>
        public static void Remember(string flag) => kept.Add(flag);

        /// <summary>Notes something; a kept note stays in the notes from chapter to chapter.</summary>
        public static void Note(string text, bool keep = false)
        {
            if (keep) keptNotes.Add(text);
            if (Notes.Contains(text)) return;
            Notes.Add(text);
            Noted?.Invoke(text);
        }

        /// <summary>Saves where the story is, at a checkpoint in the chapter ("" for its start).</summary>
        public static void Save(string checkpoint = "")
        {
            Checkpoint = checkpoint;
            Raw = new JObject
            {
                ["chapter"] = Chapter,
                ["phase"] = Phase.ToString(),
                ["checkpoint"] = checkpoint,
                ["bag"] = new JArray(Bag),
                ["notes"] = new JArray(Notes),
                ["keptNotes"] = new JArray(keptNotes),
                ["flags"] = new JArray(flags),
                ["kept"] = new JArray(kept),
            }.ToString(Newtonsoft.Json.Formatting.None);
        }

        /// <summary>Picks the story up where it was saved. False when there is no save.</summary>
        public static bool Load()
        {
            if (Raw is not { } raw) return false;
            var s = JObject.Parse(raw);
            NewGame();
            StartChapter((int)s["chapter"], Enum.Parse<Phase>((string)s["phase"]));
            Checkpoint = (string)s["checkpoint"];
            void Fill(ICollection<string> into, JToken from) { foreach (var x in from) into.Add((string)x); }
            Fill(Bag, s["bag"]);
            Fill(Notes, s["notes"]);
            Fill(keptNotes, s["keptNotes"]);
            Fill(flags, s["flags"]);
            Fill(kept, s["kept"]);
            return true;
        }

        /// <summary>The chapter a saved game continues from, or -1 when there is no save.</summary>
        public static int SavedChapter() => Raw is { } raw ? (int)JObject.Parse(raw)["chapter"] : -1;

        /// <summary>The save as it is stored, or null when there is none (tests put it back as they found it).</summary>
        public static string Raw
        {
            get => PlayerPrefs.HasKey(SaveKey) ? PlayerPrefs.GetString(SaveKey) : null;
            set
            {
                if (value == null) PlayerPrefs.DeleteKey(SaveKey);
                else PlayerPrefs.SetString(SaveKey, value);
                PlayerPrefs.Save();
            }
        }
    }
}
