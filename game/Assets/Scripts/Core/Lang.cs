using System.Collections.Generic;
using Newtonsoft.Json;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// The language the game talks in: English, as it is written, or Indonesian, set on the settings page and kept between
    /// sessions. Every line stays written in English in the code and is looked up in <c>Resources/Lang/id.json</c> (English to
    /// Indonesian) as it is shown, so changing the language changes what is on screen at once. Words drawn into the world
    /// (signs, the logo) stay English. A line with no Indonesian yet shows in English, and the editor notes it in
    /// <see cref="Missing"/> for the tests.
    /// </summary>
    public static class Lang
    {
        public static readonly string[] Names = { "English", "Bahasa Indonesia" };
        const string Key = "lang";

        /// <summary>0 for English, 1 for Indonesian.</summary>
        public static int Current
        {
            get => Mathf.Clamp(PlayerPrefs.GetInt(Key, 0), 0, Names.Length - 1);
            set
            {
                PlayerPrefs.SetInt(Key, value);
                PlayerPrefs.Save();
                Look.Retranslate();
            }
        }

        public static bool Indonesian => Current == 1;

        /// <summary>Lines shown in Indonesian with nothing to show for them, in the editor and development builds.</summary>
        public static readonly HashSet<string> Missing = new();

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        static void Reset()
        {
            id = null;
            done.Clear();
            Missing.Clear();
        }

        static Dictionary<string, string> id;
        static readonly HashSet<string> done = new(); // lines already as they are shown (the Indonesian ones, and those made by F), so none is missed

        static Dictionary<string, string> Id
        {
            get
            {
                if (id != null) return id;
                id = JsonConvert.DeserializeObject<Dictionary<string, string>>(Resources.Load<TextAsset>("Lang/id").text);
                done.UnionWith(id.Values);
                return id;
            }
        }

        /// <summary>A line in the player's language.</summary>
        public static string T(string en)
        {
            if (!Indonesian || string.IsNullOrEmpty(en)) return en;
            if (Id.TryGetValue(en, out var s)) return s;
            if (Debug.isDebugBuild && !done.Contains(en) && HasWords(en) && Missing.Add(en)) Debug.LogWarning($"No Indonesian for \"{en}\"");
            return en;
        }

        /// <summary>A line with numbers or names in it: the English has {0}, {1}... where they go, and so does its Indonesian.</summary>
        public static string F(string en, params object[] args)
        {
            var s = string.Format(T(en), args);
            done.Add(s); // shown as it is when a label is given it, or shown again in the other language till it is made anew
            return s;
        }

        static bool HasWords(string s)
        {
            var letters = 0;
            foreach (var c in s)
                if (char.IsLetter(c) && ++letters > 2) return true;
            return false;
        }
    }
}
