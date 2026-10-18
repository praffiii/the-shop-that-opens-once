using System;
using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// A location to explore: its art, where feet can go, its people and its hotspots.
    /// Walks the courier by keys or clicks and reports when a hotspot is used.
    /// </summary>
    public sealed class Place : MonoBehaviour
    {
        /// <summary>How close the courier must be to use a hotspot with the interact key.</summary>
        public const float Reach = 20f;
        /// <summary>
        /// A place is built in art px and shown at this scale: 64 px to a unit, so the camera stands a few units away
        /// and its lens blurs what is nearer and farther as a miniature's would; heights and depths stretched by the
        /// square root of 2, so the 45 degree camera (Main) shows art pixels square.
        /// </summary>
        public static readonly Vector3 Scale = new Vector3(1, Mathf.Sqrt(2), Mathf.Sqrt(2)) / 64;

        public event Action<Hotspot> Used;

        public PlaceDef Def { get; private set; }
        public BakedArt World { get; private set; }
        public WalkMap Walk { get; private set; }
        public Ant Player { get; private set; }
        /// <summary>Under the mouse, or null.</summary>
        public Hotspot Hover { get; private set; }
        /// <summary>Close enough for the interact key, or null.</summary>
        public Hotspot Near { get; private set; }

        readonly List<Hotspot> hotspots = new();
        readonly Dictionary<string, Ant> people = new();
        bool controls, keys;

        /// <summary>Off while a talk, the bag or a transition has the screen.</summary>
        public bool Controls
        {
            get => controls;
            set
            {
                controls = value;
                if (!value && Player) Player.Stop();
            }
        }

        public static Place Build(PlaceDef def, Transform parent)
        {
            var place = new GameObject(def.Id).AddComponent<Place>();
            place.transform.SetParent(parent, false);
            place.transform.localScale = Scale;
            place.Def = def;
            Grade.Apply(Game.Phase, def.Indoors);
            place.World = BakedArt.Build(def.ArtDir(Game.Phase), place.transform);
            Shader.SetGlobalMatrix("_ArtFromWorld", place.World.transform.worldToLocalMatrix);
            place.Walk = new WalkMap(Art.Texture($"places/{def.Id}/walk"));
            foreach (var p in def.People)
            {
                if (!Here(p.Chapters)) continue;
                var ant = Ant.Create(p.Id, place.World.transform);
                ant.Pose = p.Pose;
                ant.Facing = p.Facing;
                ant.Feet = p.At;
                place.people[p.Id] = ant;
                place.hotspots.Add(new Hotspot { Id = p.Id, Label = p.Label, Area = p.Area, Spot = p.Spot, Owner = ant });
            }
            foreach (var h in def.Hotspots)
                if (Here(h.Chapters))
                    place.hotspots.Add(new Hotspot { Id = h.Id, Label = h.Label, At = h.At, Area = h.Area, Spot = h.Spot, ExitTo = h.ExitTo });
            place.FollowStory();
            return place;
        }

        static bool Here(int[] chapters) => chapters == null || Array.IndexOf(chapters, Game.Chapter) >= 0;

        // Marlow's shop follows the story: a lantern goes out for each night resolved, and each night's keepsake
        // stays on its shelf until Marlow hands it over.
        void FollowStory()
        {
            for (var i = 0; i < 7; i++)
            {
                World.ShowItemIfAny($"lantern_{i}", i >= Game.LanternsOut);
                World.ShowItemIfAny($"shop_lantern_{i}", i >= Game.LanternsOut);
                World.ShowItemIfAny($"keepsake_{i}", i >= Game.Chapter || (i == Game.Chapter - 1 && !Game.Has("keepsake_taken")));
            }
            for (var m = 1; m < 8; m++) World.ShowItemIfAny($"clock_{1817 + m}", false);
        }

        /// <summary>Puts the courier at a spawn point, or else at an exported anchor of that name.</summary>
        public void Enter(Ant courier, string spawn)
        {
            Player = courier;
            courier.transform.SetParent(World.transform, false);
            courier.Feet = Def.Spawns.TryGetValue(spawn, out var at) ? at : World.Anchor(spawn);
        }

        /// <summary>Someone in this place by id ("courier" is the player), or null.</summary>
        public Ant Actor(string id) => id == "courier" ? Player : people.TryGetValue(id, out var ant) ? ant : null;

        public Hotspot Find(string id) => hotspots.Find(h => h.Id == id);

        /// <summary>The hotspots shown now: those with a label.</summary>
        public IEnumerable<Hotspot> Hotspots()
        {
            foreach (var h in hotspots)
                if (h.Label != "" && (h.Owner == null || h.Owner.gameObject.activeSelf))
                    yield return h;
        }

        /// <summary>Hover, nearness, walking by keys and clicks, and exits. <paramref name="input"/> is false when the UI took this frame's clicks and keys.</summary>
        public void Tick(bool input)
        {
            if (!Player) return;
            World.SeeThrough(Player.Feet);
            Hover = controls ? HotspotAt(Shop.Controls.MouseWorld) : null;
            Near = controls ? Nearest() : null;
            Player.Running = controls && input && Shop.Controls.Run;
            if (!controls || !input) return;
            if (Shop.Controls.Click || (Shop.Controls.Interact && Near != null))
            {
                var h = Shop.Controls.Click ? Hover : Near;
                Main.Run(WalkTo(h, h != null ? h.GlobalSpot : Shop.Controls.MouseWorld));
            }
            var dir = Shop.Controls.Move;
            if (dir != Vector2.zero)
            {
                if (!keys)
                {
                    Player.Stop();
                    keys = true;
                }
                Player.MoveBy(Walk.Slide(Player.Feet, dir * (Player.Running ? Ant.RunSpeed : Ant.Speed) * Time.deltaTime) - Player.Feet);
            }
            else if (keys)
            {
                keys = false;
                Player.Stop();
            }
            foreach (var h in Hotspots())
                if (h.ExitTo != null && h.GlobalArea.Contains(Player.Feet))
                {
                    Use(h);
                    return;
                }
        }

        /// <summary>Walks the courier to a hotspot and uses it, as a click on it would. False if there is no such hotspot or no way there.</summary>
        public async Awaitable<bool> WalkAndUse(string id)
        {
            var h = Find(id);
            return h != null && await WalkTo(h, h.GlobalSpot);
        }

        async Awaitable<bool> WalkTo(Hotspot h, Vector2 point)
        {
            var points = Walk.Path(Player.Feet, point);
            if (points.Count == 0) return false;
            var arrived = await Player.Walk(points);
            if (!arrived || h == null || !controls) return false;
            Use(h);
            return true;
        }

        void Use(Hotspot h)
        {
            Controls = false;
            Player.FaceTo(h.GlobalArea.center.x);
            Used?.Invoke(h);
        }

        Hotspot HotspotAt(Vector2 p)
        {
            Hotspot best = null;
            foreach (var h in Hotspots())
                if (h.GlobalArea.Contains(p) && (best == null || h.Position.y > best.Position.y))
                    best = h;
            return best;
        }

        Hotspot Nearest()
        {
            Hotspot best = null;
            var bestD = Reach;
            foreach (var h in Hotspots())
            {
                var d = Vector2.Distance(h.GlobalSpot, Player.Feet);
                var area = h.GlobalArea;
                if (new Rect(area.x - 4, area.y - 4, area.width + 8, area.height + 8).Contains(Player.Feet)) d = 0f;
                if (d <= bestD)
                {
                    best = h;
                    bestD = d;
                }
            }
            return best;
        }
    }
}
