using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
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
        /// and its lens blurs what is nearer and farther as a miniature's would; heights stretched by 1 / cos and depths
        /// by 1 / sin of the camera's tilt (<see cref="Art.Pitch"/>), so it shows art pixels square, on the ground and
        /// up a wall alike.
        /// </summary>
        public static readonly Vector3 Scale = new Vector3(1, 1 / Mathf.Cos(Art.Pitch * Mathf.Deg2Rad), 1 / Mathf.Sin(Art.Pitch * Mathf.Deg2Rad)) / 64;

        /// <summary>The half width of the dark spot each ant casts on what it stands on, in world units (art px times scale).</summary>
        static readonly float SpotWidth = 7 * Scale.x;
        static readonly int RoomId = Shader.PropertyToID("_Room");
        static readonly int FeetId = Shader.PropertyToID("_Feet"), FeetCountId = Shader.PropertyToID("_FeetCount");

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
        readonly Dictionary<string, Person> here = new(); // who each of them is now
        readonly Vector4[] spots = new Vector4[16]; // as many as Pixel.shader's _Feet holds
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
            // its houses are shaded by the sun of its own grade
            Grade.Apply(Game.Phase, def.Indoors && !def.Open);
            place.World = BakedArt.Build(def.ArtDir(Game.Phase), place.transform, def.Underground);
            place.Walk = new WalkMap(Art.Texture($"places/{def.Id}/walk"));
            foreach (var p in def.People)
            {
                if (!Here(p.Chapters) || !Now(p.Phases) || (p.After != null && !Game.Has(p.After))) continue;
                var ant = Ant.Create(p.Id, place.World.transform);
                Villager.Add(ant, p, place);
                place.people[p.Id] = ant;
                place.here[p.Id] = p;
                place.hotspots.Add(new Hotspot { Id = p.Id, Label = p.Label, Area = p.Area, Spot = p.Spot, Owner = ant });
            }
            foreach (var h in def.Hotspots)
                if (Here(h.Chapters))
                    place.hotspots.Add(new Hotspot { Id = h.Id, Label = h.Label, At = h.At, Area = h.Area, Spot = h.Spot, ExitTo = h.ExitTo, Step = h.Step, Text = h.Text });
            return place;
        }

        /// <summary>Makes this the place on screen: its grade, where the shaders find its art, its lights, the room that keeps its own light and the story's marks.</summary>
        public void Show()
        {
            gameObject.SetActive(true);
            Grade.Apply(Game.Phase, Def.Indoors && !Def.Open);
            Shader.SetGlobalMatrix("_ArtFromWorld", World.transform.worldToLocalMatrix);
            Shader.SetGlobalMatrix("_WorldFromArt", World.transform.localToWorldMatrix);
            World.Glow();
            Shader.SetGlobalVector(RoomId, World.Data["room"] is JArray r ? new Vector4((float)r[0], (float)r[1], (float)r[2], (float)r[3]) : Vector4.zero);
            FollowStory();
        }

        // The lights nearest the courier, and the spots under the courier and whoever else is shown, for Pixel.shader.
        void LateUpdate()
        {
            var n = 0;
            if (Player)
            {
                World.LightNear(Player.transform.position);
                spots[n++] = Spot(Player);
            }
            foreach (var ant in people.Values)
                if (n < spots.Length && ant.gameObject.activeInHierarchy) spots[n++] = Spot(ant);
            Shader.SetGlobalVectorArray(FeetId, spots);
            Shader.SetGlobalFloat(FeetCountId, n);
        }

        static Vector4 Spot(Ant ant)
        {
            var at = ant.transform.position;
            return new Vector4(at.x, at.y, at.z, SpotWidth);
        }

        static bool Here(int[] chapters) => chapters == null || Array.IndexOf(chapters, Game.Chapter) >= 0;

        static bool Now(Phase[] phases) => phases == null || Array.IndexOf(phases, Game.Phase) >= 0;

        /// <summary>Shows what the story has changed in the place's art (call it again after changing a flag it reads).</summary>
        // Marlow's shop follows the story: a lantern goes out for each night resolved and the clock moves on a minute
        // from 10:17. Each night's box stays shut in the cabinet until Marlow hands it over; its cubby is empty while
        // the courier has it, and once the night is resolved it is back, open and empty. Satria's yard gate is shut
        // until he first pushes it open, coming home on Day 0. The platform's oil lanterns are lit by the story. At home the
        // coil and the night's box follow the routine. Theo's studio is chained shut till Night 3 opens it.
        /// <summary>The frames of Daniel's last reel on Theo's screen (inside.js footage).</summary>
        const int Film = 8;

        /// <summary>Shows one frame of the reel on Theo's screen, or none (-1).</summary>
        public void ShowFilm(int frame)
        {
            for (var k = 0; k < Film; k++) World.ShowItemIfAny($"screen_film_{k}", k == frame);
        }

        public void FollowStory()
        {
            var shut = Game.Chapter == 0 && !Game.Has("stepped_gate");
            World.ShowItemIfAny("satria_gate", shut);
            World.ShowItemIfAny("satria_gate_open", !shut);
            for (var i = 0; i < 7; i++)
            {
                World.ShowItemIfAny($"lantern_{i}", i >= Game.LanternsOut);
                World.ShowItemIfAny($"shop_lantern_{i}", i >= Game.LanternsOut);
                var boxed = i >= Game.Chapter || (i == Game.Chapter - 1 && !Game.Has("keepsake_taken"));
                World.ShowItemIfAny($"keepsake_{i}", boxed);
                World.ShowItemIfAny($"box_open_{i}", i < Game.LanternsOut);
            }
            for (var m = 0; m < 8; m++) World.ShowItemIfAny($"clock_{1017 + m}", m == Game.LanternsOut);
            // the platform's oil lanterns, dark since the storm until Satria lights them (lantern_post_<i>); from Night 2
            // Helen keeps the one by her bench lit
            for (var i = 0; i < 3; i++) World.ShowItemIfAny($"lantern_post_{i}_lit_0", Game.Has($"lantern_post_{i}") || (i == 1 && Game.Chapter >= 2));
            // Night 2's marble game on the square's east lawn
            World.ShowItemIfAny("marble_ring", Game.Chapter == 2);
            // Theo's studio door is chained from inside until Night 3's mint tea on its vent's sill brings him out; the
            // film shows on his screen only while the projector runs
            World.ShowItemIfAny("theo_studio_chain", Game.Chapter < 3 || (Game.Chapter == 3 && !Game.Has("studio_open")));
            World.ShowItemIfAny("theo_studio_cup", Game.Chapter == 3 && Game.Has("tea_set"));
            for (var k = 0; k < Film; k++) World.ShowItemIfAny($"screen_film_{k}", false); // the screening runs them (ShowFilm)
            // the hall: its stair roped off till Captain Bram names the door the key is for; the roof drips into the
            // buckets while it rains; under it the seep water stands till the pump drains it, and vault No. 7 is shut
            // till the key turns, its archive box on Sam's table after
            var drained = Game.Chapter > 4 || Game.Has("drained");
            World.ShowItemIfAny("stair_rope", Game.Chapter < 4 || (Game.Chapter == 4 && !Game.Has("bram_lead")));
            for (var i = 0; i < 3; i++) World.ShowItemIfAny($"drip_{i}", Main.Raining);
            World.ShowItemIfAny("flood_0", !drained);
            World.ShowItemIfAny("flood_1", !drained);
            World.ShowItemIfAny("vault_shut", !drained);
            World.ShowItemIfAny("vault_open", drained);
            World.ShowItemIfAny("vault_open_door", drained);
            World.ShowItemIfAny("archive_box", drained);
            // at home: the coil lit before sleep, and the night's box on the table once brought home
            World.ShowItemIfAny("coil_lit", Game.Has("coil_lit"));
            for (var i = 0; i < 7; i++) World.ShowItemIfAny($"box_on_table_{i}", i == Game.Chapter - 1 && Game.Has("box_home"));
            // Night 7: home from the last box to a dark, cold house, till Satria lights the lamp and the kitchen fire
            if (Game.Chapter == 7 && Game.Phase == Phase.Night && Game.Has("boxed"))
            {
                World.ShowItemIfAny("lamp_lit", Game.Has("lit_lamp"));
                World.ShowItemIfAny("stove_fire", Game.Has("lit_fire"));
            }
            // Day 8: the shop gone from the grove, the roots grown shut where it stood; the new board on Satria's railings
            // once he and the Mender nail it up
            var gone = Game.Chapter == Game.Epilogue;
            foreach (var part in new[] { "shop", "shop_closed", "shop_lit", "shop_smoke_0" }) World.ShowItemIfAny(part, !gone);
            for (var i = 0; i < 7; i++) World.ShowItemIfAny($"shop_lantern_{i}_day", !gone);
            World.ShowItemIfAny("shop_gone", gone);
            World.ShowItemIfAny("post_board", gone && Game.Has("board_up"));
        }

        /// <summary>Puts the courier at a spawn point, or else at an exported anchor of that name.</summary>
        public void Enter(Ant courier, string spawn) => Enter(courier, Def.Spawns.TryGetValue(spawn, out var at) ? at : World.Anchor(spawn));

        /// <summary>Puts the courier at a point.</summary>
        public void Enter(Ant courier, Vector2 at)
        {
            Player = courier;
            courier.transform.SetParent(World.transform, false);
            courier.Feet = at;
        }

        /// <summary>Someone in this place by id ("courier" is the player), or null.</summary>
        public Ant Actor(string id) => id == "courier" ? Player : people.TryGetValue(id, out var ant) ? ant : null;

        /// <summary>Someone brought into the place for a scene, a memory's people say, until <see cref="Leave"/>; no hotspot, no activity.</summary>
        public Ant Bring(string id, Vector2 at)
        {
            var ant = Ant.Create(id, World.transform);
            ant.Feet = at;
            people[id] = ant;
            return ant;
        }

        public void Leave(string id)
        {
            if (people.Remove(id, out var ant)) Destroy(ant.gameObject);
        }

        /// <summary>Everyone in this place but the courier.</summary>
        public IEnumerable<Ant> People => people.Values;

        /// <summary>Who someone in this place is now (their activity and line), or null.</summary>
        public Person Who(string id) => here.GetValueOrDefault(id);

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
            if (controls && input && Shop.Controls.Pace)
            {
                Shop.Controls.Running = !Shop.Controls.Running;
                Main.Instance.Hud.Toast(!Shop.Controls.Running ? "Walking." : Def.Indoors ? "Running, once outdoors." : "Running.");
            }
            // indoors the courier walks: a room is a few steps across, seen close
            Player.Running = controls && input && Shop.Controls.Running && !Def.Indoors;
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
            foreach (var h in hotspots)
                if (h.Step && h.GlobalArea.Contains(Player.Feet) && !Game.Has($"stepped_{h.Id}"))
                {
                    Game.Mark($"stepped_{h.Id}");
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
            if (h != null && h.Owner && h.Owner.TryGetComponent<Villager>(out var villager)) villager.Expect();
            var points = Walk.Path(Player.Feet, point);
            if (points.Count == 0) return false;
            var arrived = await Player.Walk(points);
            if (!arrived || h == null || !controls) return false;
            // someone on their round has walked on meanwhile, maybe to their next stop already: follow them
            if (h.Owner && Vector2.Distance(point, h.GlobalSpot) > Reach) return await WalkTo(h, h.GlobalSpot);
            Use(h);
            return true;
        }

        void Use(Hotspot h)
        {
            Controls = false;
            if (!h.Step) Player.FaceTo(h.GlobalArea.center.x);
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
