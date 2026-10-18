using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// An ant drawn from its exported sheet (Art/chars/&lt;id&gt;). <see cref="Feet"/> is where it stands, in art pixels.
    /// Plays a pose, faces left or right, can hold a small item, and walks through a list of points. Walking mostly up or
    /// down the screen it turns away from the camera or toward it, where its sheet has that view of the pose (pose_back,
    /// pose_front).
    /// </summary>
    public sealed class Ant : MonoBehaviour
    {
        /// <summary>Walking pace in art px per second.</summary>
        public const float Speed = 56f, RunSpeed = 104f;
        static readonly string[] Walks = { "walk", "carryWalk", "run" }; // poses whose frames advance with distance, not time
        /// <summary>How far toward the camera (art px) an ant stands from its feet line, and its hand from its body.</summary>
        const float Nudge = 0.3f;
        const int Tall = 30; // art px, cap included
        static JObject cast;
        // Which way it is turned: across the screen (Facing says which side), toward the camera or away from it.
        enum Heading { Side, Front, Back }
        static readonly string[] Views = { "", "_front", "_back" };

        /// <summary>A foot touched the ground while walking.</summary>
        public event Action Stepped;

        public string Id { get; private set; }

        SpriteRenderer body, hand;
        JObject info;
        Texture2D sheet;
        string pose = "idle";
        int facing = 1;
        float seat, floor;
        Heading heading;
        Sprite held;
        float time, step;
        int frame;
        Vector2 feet, exact; // exact: where it really is while walking; it stands on the nearest whole pixel
        readonly List<Vector2> path = new();
        readonly List<AwaitableCompletionSource> waiting = new();
        int walkId;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        static void Reset() => cast = null;

        /// <summary>chars.json: every character's poses, frame counts, speeds and hand positions.</summary>
        public static JObject Cast => cast ??= Art.Json("chars/chars");

        /// <summary>A 48x48 portrait frame of a character in a mood (falls back to neutral). Frame 0 rests, 1 talks, 2 blinks.</summary>
        public static Sprite Portrait(string id, string mood = "neutral", int frame = 0)
        {
            var moods = (JArray)Cast["chars"][id]["moods"];
            var row = 0;
            for (var i = 0; i < moods.Count; i++)
                if ((string)moods[i] == mood) row = i;
            return Art.Sprite(Art.Texture($"chars/portraits/{id}"), new RectInt(frame * 48, row * 48, 48, 48));
        }

        public static Ant Create(string id, Transform parent)
        {
            var ant = new GameObject(id).AddComponent<Ant>();
            ant.transform.SetParent(parent, false);
            ant.transform.localRotation = Art.Leaning;
            ant.transform.localScale = Art.LeaningScale;
            ant.body = Part("body", ant.transform);
            ant.hand = Part("hand", ant.transform);
            ant.SetId(id);
            return ant;
        }

        static SpriteRenderer Part(string name, Transform parent)
        {
            var sr = new GameObject(name).AddComponent<SpriteRenderer>();
            sr.transform.SetParent(parent, false);
            sr.sharedMaterial = Art.SpriteMaterial;
            sr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
            sr.receiveShadows = true;
            return sr;
        }

        public void SetId(string id)
        {
            Id = id;
            name = id;
            info = (JObject)Cast["chars"][id];
            sheet = Art.Texture($"chars/{id}");
            Refresh();
        }

        public Vector2 Feet
        {
            get => feet;
            set
            {
                feet = new Vector2(Mathf.Round(value.x), Mathf.Round(value.y));
                exact = value;
                Place();
            }
        }

        public string Pose
        {
            get => pose;
            set
            {
                if (value == pose) return;
                pose = value;
                time = step = 0f;
                frame = 0;
                Refresh();
            }
        }

        /// <summary>1 faces right, -1 faces left.</summary>
        public int Facing
        {
            get => facing;
            set
            {
                facing = value;
                Refresh();
            }
        }

        /// <summary>How high the seat it sits on is, in art px; it is raised by that while it sits.</summary>
        public float Seat
        {
            get => seat;
            set
            {
                seat = value;
                Place();
            }
        }

        /// <summary>How high the floor it stands on is, in art px (a deck): it is always raised by that.</summary>
        public float Floor
        {
            get => floor;
            set
            {
                floor = value;
                Place();
            }
        }

        /// <summary>A small item shown in the hand, or null.</summary>
        public Sprite Held
        {
            get => held;
            set
            {
                held = value;
                Show(frame);
            }
        }

        public bool Walking => path.Count > 0;

        /// <summary>Walks at <see cref="RunSpeed"/> with the run pose, by keys or along a path.</summary>
        public bool Running { get; set; }

        /// <summary>Carries its load: walks with carryWalk and stands with carry.</summary>
        public bool Carrying { get; set; }

        string Gait => Running ? "run" : Carrying ? "carryWalk" : "walk";

        /// <summary>Walks through <paramref name="points"/>. True on arrival, false if another walk or <see cref="Stop"/> took over.</summary>
        public async Awaitable<bool> Walk(List<Vector2> points)
        {
            var mine = ++walkId;
            if (points.Count == 0) return true;
            path.Clear();
            path.AddRange(points);
            Pose = Gait;
            var done = new AwaitableCompletionSource();
            waiting.Add(done);
            await done.Awaitable;
            return mine == walkId;
        }

        /// <summary>Stops walking, stands still, and releases anyone awaiting <see cref="Walk"/> with false.</summary>
        public void Stop()
        {
            walkId++;
            path.Clear();
            Arrive();
        }

        /// <summary>Steps by <paramref name="motion"/> (keyboard walking): faces the way it goes and moves the legs by distance.</summary>
        public void MoveBy(Vector2 motion)
        {
            if (Mathf.Abs(motion.y) > Mathf.Abs(motion.x)) Turn(motion.y > 0 ? Heading.Front : Heading.Back);
            else if (Mathf.Abs(motion.x) > 0.01f)
            {
                heading = Heading.Side;
                Facing = motion.x > 0 ? 1 : -1;
            }
            var to = Here() + motion;
            Feet = to;
            exact = to;
            if (pose != Gait) Pose = Gait;
            step += motion.magnitude;
            var p = Current();
            var stride = (float)p["stride"];
            var frames = (int)p["frames"];
            while (step >= stride)
            {
                step -= stride;
                Show(frame + 1);
                if (frame % (frames / 2) == 0) Stepped?.Invoke();
            }
        }

        /// <summary>Turns its back to the camera.</summary>
        public void FaceAway() => Turn(Heading.Back);

        public void FaceTo(float x)
        {
            heading = Heading.Side;
            if (Mathf.Abs(x - feet.x) > 1f) Facing = x > feet.x ? 1 : -1;
            else Refresh();
        }

        void Turn(Heading to)
        {
            if (to == heading) return;
            heading = to;
            Refresh();
        }

        void Update()
        {
            if (path.Count > 0)
            {
                var to = path[0];
                MoveBy(Vector2.ClampMagnitude(to - Here(), (Running ? RunSpeed : Speed) * Time.deltaTime));
                if (Vector2.Distance(exact, to) < 0.001f)
                {
                    path.RemoveAt(0);
                    if (path.Count == 0) Arrive();
                }
            }
            else if (Array.IndexOf(Walks, pose) < 0)
            {
                time += Time.deltaTime;
                Show((int)(time * (float)Current()["fps"]));
            }
        }

        void Arrive()
        {
            if (Array.IndexOf(Walks, pose) >= 0) Pose = Carrying ? "carry" : "idle";
            var done = waiting.ToArray();
            waiting.Clear();
            foreach (var w in done) w.SetResult();
        }

        // Where it really is: its exact walking position, unless something has moved it since.
        Vector2 Here() => new Vector2(Mathf.Round(exact.x), Mathf.Round(exact.y)) == feet ? exact : feet;

        // The pose's frames as it is turned, if its sheet has that view; else the side view, which faces and flips.
        JToken Turned() => heading == Heading.Side ? null : info["poses"][pose + Views[(int)heading]];
        JToken Current() => Turned() ?? info["poses"][pose] ?? info["poses"]["idle"];

        void Show(int f)
        {
            var p = Current();
            frame = f % (int)p["frames"];
            var cell = Art.Point(Cast["cell"]);
            var feetAt = Art.Point(Cast["feet"]);
            int w = (int)cell.x, h = (int)cell.y;
            body.sprite = Art.Sprite(sheet, new RectInt(frame * w, (int)p["row"] * h, w, h), Vector2Int.RoundToInt(feetAt));
            var side = Turned() == null ? facing : 1;
            // Mirrored by its scale, as the shader takes no sprite flip. That mirrors around the feet pixel's left
            // edge; one pixel over keeps the feet on the same column.
            body.transform.localScale = new Vector3(side, 1, 1);
            body.transform.localPosition = new Vector3(side < 0 ? 1 : 0, 0);
            var handAt = Art.Point(p["hand"][frame]);
            // turned away, what it holds is in front of it, out of sight
            hand.enabled = held != null && !(heading == Heading.Back && Turned() != null);
            hand.sprite = held;
            hand.transform.localPosition = Art.Card(new Vector2(handAt.x * side, handAt.y)) + Vector3.back * Nudge;
            Place();
        }

        // Stands on the ground of the place it is in, a little toward the camera from things on the same feet line.
        void Place()
        {
            var world = transform.parent ? transform.parent.GetComponent<BakedArt>() : null;
            transform.localPosition = Art.World(feet, (world ? world.Relief.Stand(feet, Tall) : 0) + floor + (pose == "sit" ? seat : 0) + Nudge);
        }

        void Refresh()
        {
            if (info == null) return;
            Show(frame);
        }
    }
}
