using System;
using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>The time of day. It moves with the story, never with a clock (Main.MovePhase).</summary>
    public enum Phase { Morning, Midday, Dusk, Night }

    /// <summary>
    /// The story so far: the chapter, the time of day, what the courier carries and has noticed, and saving.
    /// Chapter 0 is the prologue, 1 to 7 are the nights and 8 is the epilogue.
    /// </summary>
    public static class Game
    {
        public const int Epilogue = 8;
        const string SaveKey = "chapter";

        public static int Chapter { get; private set; }
        public static Phase Phase = Phase.Dusk;
        /// <summary>Lanterns already out in Marlow's shop.</summary>
        public static int LanternsOut;
        /// <summary>Keepsakes the courier carries.</summary>
        public static readonly List<string> Bag = new();
        /// <summary>What the courier has noticed, oldest first.</summary>
        public static readonly List<string> Notes = new();
        static readonly HashSet<string> flags = new();

        public static event Action<string> Noted;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        static void Reset()
        {
            StartChapter(0);
            Noted = null;
        }

        public static void StartChapter(int n)
        {
            Chapter = n;
            LanternsOut = Mathf.Clamp(n - 1, 0, 7);
            Phase = n == 0 ? Phase.Dusk : Phase.Night; // the prologue arrives at dusk; a night begins at the midnight bell
            flags.Clear();
            Bag.Clear();
            Notes.Clear();
        }

        public static bool Has(string flag) => flags.Contains(flag);

        public static void Mark(string flag) => flags.Add(flag);

        public static void Note(string text)
        {
            if (Notes.Contains(text)) return;
            Notes.Add(text);
            Noted?.Invoke(text);
        }

        public static void Save(int chapter)
        {
            PlayerPrefs.SetInt(SaveKey, chapter);
            PlayerPrefs.Save();
        }

        /// <summary>The chapter a saved game continues from, or -1 when there is no save.</summary>
        public static int SavedChapter() => PlayerPrefs.GetInt(SaveKey, -1);

        public static void DeleteSave() => PlayerPrefs.DeleteKey(SaveKey);
    }
}
