using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Music, the evening wind, the time of day's ambience and small sound effects. Every sound is synthesized in
    /// ArtSource/audio.js and exported to Art/sound. Music cross-fades between moods, and ambience between phases.
    /// </summary>
    public sealed class Sound : MonoBehaviour
    {
        /// <summary>Seconds for one mood's music to cross-fade into the next.</summary>
        const float Fade = 1.2f;
        /// <summary>The wind's volume indoors, as a fraction of outdoors.</summary>
        const float IndoorWind = 0.2f;
        /// <summary>The ambience's volume indoors, heard through the walls.</summary>
        const float IndoorAmbience = 0.35f;
        /// <summary>The music and wind while someone speaks: 3.5 dB down, under their voice.</summary>
        const float Duck = 0.67f;

        public static Sound Instance { get; private set; }

        readonly Dictionary<string, AudioClip> clips = new();
        readonly AudioSource[] music = new AudioSource[2], ambience = new AudioSource[2];
        readonly float[] target = new float[5]; // the two music players, the wind, then the two ambience players
        AudioSource[] beds; // the same, in the same order
        readonly List<AudioSource> effects = new();
        AudioSource wind, voice;
        int front, ambFront, steps;
        string mood = "", amb = "";
        bool muted;

        /// <summary>Set by Talk while a voice is speaking: the music and wind duck under it.</summary>
        public static bool Speaking;

        /// <summary>Silences everything (the pause menu's sound switch).</summary>
        public static bool Muted
        {
            get => Instance && Instance.muted;
            set
            {
                if (!Instance) return;
                Instance.muted = value;
                AudioListener.volume = value ? 0f : 1f;
            }
        }

        public static Sound Create(Transform parent)
        {
            var go = new GameObject("Sound");
            go.transform.SetParent(parent, false);
            Instance = go.AddComponent<Sound>();
            return Instance;
        }

        void Awake()
        {
            for (var i = 0; i < 2; i++) music[i] = Source(true);
            wind = Source(true);
            wind.clip = Clip("wind");
            for (var i = 0; i < 2; i++) ambience[i] = Source(true);
            beds = new[] { music[0], music[1], wind, ambience[0], ambience[1] };
            voice = Source(false);
            voice.volume = 1f;
            for (var i = 0; i < 6; i++) effects.Add(Source(false));
        }

        void OnDestroy()
        {
            if (Instance == this) Instance = null;
            AudioListener.volume = 1f;
        }

        AudioSource Source(bool loop)
        {
            var s = gameObject.AddComponent<AudioSource>();
            s.playOnAwake = false;
            s.loop = loop;
            s.volume = 0f;
            return s;
        }

        AudioClip Clip(string name)
        {
            if (!clips.TryGetValue(name, out var clip))
                clip = clips[name] = Resources.Load<AudioClip>("Art/sound/" + name);
            return clip;
        }

        /// <summary>Cross-fades to a mood's music (music_&lt;mood&gt;) and to the time of day's ambience. Indoors, the wind and the ambience drop.</summary>
        public static void Mood(string newMood, bool indoors)
        {
            if (Instance) Instance.SetMood(newMood, indoors);
        }

        void SetMood(string newMood, bool indoors)
        {
            if (!wind.isPlaying) wind.Play();
            target[2] = indoors ? IndoorWind : 1f;
            var phase = Main.Raining ? "amb_rain" : "amb_" + Game.Phase.ToString().ToLowerInvariant();
            if (phase != amb)
            {
                amb = phase;
                target[3 + ambFront] = 0f;
                ambFront = 1 - ambFront;
                var bed = ambience[ambFront];
                bed.clip = Clip(phase);
                bed.volume = 0f;
                bed.Play();
            }
            target[3 + ambFront] = indoors ? IndoorAmbience : 1f;
            if (newMood == mood) return;
            mood = newMood;
            target[front] = 0f;
            front = 1 - front;
            var player = music[front];
            player.clip = Clip("music_" + newMood);
            player.volume = 0f;
            player.Play();
            target[front] = 1f;
        }

        public static void Play(string name)
        {
            if (!Instance) return;
            var player = Instance.effects[0];
            foreach (var p in Instance.effects)
                if (!p.isPlaying)
                {
                    player = p;
                    break;
                }
            player.volume = 1f;
            player.clip = Instance.Clip(name);
            player.Play();
        }

        /// <summary>One blip of a voice (voice_&lt;id&gt;), at a pitch around 1. Each overlaps the last one's tail.</summary>
        public static void Blip(string id, float pitch)
        {
            if (!Instance) return;
            Instance.voice.pitch = pitch;
            Instance.voice.PlayOneShot(Instance.Clip("voice_" + id));
        }

        /// <summary>One footstep, cycling through its four variations.</summary>
        public static void Step(bool wood)
        {
            if (!Instance) return;
            Play($"{(wood ? "step_wood" : "step")}_{Instance.steps % 4}");
            Instance.steps++;
        }

        void Update()
        {
            var duck = Speaking ? Duck : 1f;
            for (var i = 0; i < beds.Length; i++)
            {
                var s = beds[i];
                s.volume = Mathf.MoveTowards(s.volume, target[i] * duck, Time.unscaledDeltaTime / Fade);
                if (i != 2 && target[i] == 0f && s.volume == 0f && s.isPlaying) s.Stop();
            }
        }
    }
}
