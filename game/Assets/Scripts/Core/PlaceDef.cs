using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Something the courier can click or walk up to: a person, a sign, a door. Its id is what the chapter
    /// script receives. With <see cref="ExitTo"/> set, stepping into its area goes to another place instead.
    /// All positions are in art pixels, y down.
    /// </summary>
    public sealed class Hotspot
    {
        public string Id;
        /// <summary>Shown next to the mouse. Chapter scripts may change it (a stranger's name, once learned).</summary>
        public string Label = "";
        public Vector2 At;
        /// <summary>Clickable area, relative to <see cref="At"/>.</summary>
        public Rect Area = new(-8, -16, 16, 16);
        /// <summary>Where the courier stands to use it, relative to <see cref="At"/>.</summary>
        public Vector2 Spot = new(0, 8);
        /// <summary>"place/spawn": stepping into the area goes to that place, arriving at that spawn point.</summary>
        public string ExitTo;
        /// <summary>The chapters it is there; null means every chapter.</summary>
        public int[] Chapters;
        /// <summary>The person it belongs to, whose feet it follows; null for a fixed hotspot.</summary>
        public Ant Owner;

        public Vector2 Position => Owner ? Owner.Feet : At;
        public Rect GlobalArea => new(Position + Area.position, Area.size);
        public Vector2 GlobalSpot => Position + Spot;
    }

    /// <summary>Someone in a place at their activity, with the hotspot to talk to them.</summary>
    public sealed class Person
    {
        public string Id;
        public Vector2 At;
        public string Label = "";
        public Rect Area = new(-10, -30, 20, 30);
        public Vector2 Spot = new(24, 0);
        public int Facing = 1;
        /// <summary>They stand with their back to the camera, at a door, say.</summary>
        public bool Away;
        /// <summary>What they are doing where they stand (brew, hammer...).</summary>
        public string Pose = "idle";
        /// <summary>How high the seat they sit on is, in art px (a bench's is 9).</summary>
        public float Seat;
        /// <summary>How high the floor they stand on is, in art px (a deck's); At is where its picture shows them.</summary>
        public float Floor;
        /// <summary>The chapters they are there; null means every chapter.</summary>
        public int[] Chapters;
        /// <summary>The times of day they are there; null means at any time.</summary>
        public Phase[] Phases;
        /// <summary>Stops they walk round in turn, starting at the first, instead of staying at <see cref="At"/>.</summary>
        public Stop[] Round;
        /// <summary>What they say when the chapter has nothing for them.</summary>
        public string Line;
    }

    /// <summary>A stop on someone's round: they walk there and keep a pose for a while.</summary>
    public sealed class Stop
    {
        public Vector2 At;
        public string Pose = "idle";
        /// <summary>1 faces right, -1 left, 0 keeps the way they came.</summary>
        public int Facing;
        /// <summary>They keep turned to the courier while they stay, like a shopkeeper minding their shop.</summary>
        public bool Watch;
        /// <summary>They turn their back to the camera, to something behind them (only poses with a back view: idle, walk, run, carry).</summary>
        public bool Away;
        /// <summary>Seconds they stay.</summary>
        public float Wait = 4f;
        /// <summary>They carry their load on the walk from here to the next stop.</summary>
        public bool Carry;
        /// <summary>They run on the walk from here to the next stop.</summary>
        public bool Run;
    }

    /// <summary>A place to explore: its art, the people in it, its hotspots and where the courier can arrive.</summary>
    public sealed class PlaceDef
    {
        public string Id;
        /// <summary>The exported art variants (places/&lt;id&gt;/&lt;variant&gt;). The one named after the time of day is used, else the first.</summary>
        public string[] Variants = { "dusk" };
        /// <summary>The music here: dusk, shop, memory or resolved.</summary>
        public string Mood = "dusk";
        /// <summary>Indoors, the evening wind is quiet.</summary>
        public bool Indoors;
        /// <summary>A room cut open where its house stands in its area: the area round it is graded and sunlit as outdoors, while the room keeps its own light (Pixel.shader's _Room).</summary>
        public bool Open;
        /// <summary>Footsteps sound on wood rather than ground.</summary>
        public bool WoodFloor;
        /// <summary>A bell rings when the courier comes in or goes out.</summary>
        public bool DoorBell;
        public Person[] People = { };
        public Hotspot[] Hotspots = { };
        public Dictionary<string, Vector2> Spawns = new();

        public string ArtDir(Phase phase)
        {
            var wanted = phase.ToString().ToLowerInvariant();
            return $"places/{Id}/{(System.Array.IndexOf(Variants, wanted) >= 0 ? wanted : Variants[0])}";
        }
    }
}
