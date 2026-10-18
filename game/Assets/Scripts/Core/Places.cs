using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Every place in the game. These come from the Godot build and carry the systems until the GDD's four
    /// zones and nine interiors are drawn; then they are replaced. A place copies its hotspots, so these stay as written.
    /// </summary>
    public static class Places
    {
        public static PlaceDef Get(string id) =>
            All.TryGetValue(id, out var def) ? def : throw new System.ArgumentException($"No place called {id}");

        static Rect R(float x, float y, float w, float h) => new(x, y, w, h);
        static Vector2 V(float x, float y) => new(x, y);

        static readonly Dictionary<string, PlaceDef> All = new()
        {
            ["village"] = new PlaceDef
            {
                Id = "village",
                People = new[]
                {
                    new Person { Id = "baker", At = V(202, 338), Label = "Baker", Spot = V(24, 2) },
                    new Person { Id = "kid", At = V(330, 380), Label = "Village kid", Area = R(-8, -24, 16, 24) },
                },
                Hotspots = new[]
                {
                    new Hotspot { Id = "shop_door", At = V(360, 252), Label = "Marlow's shop", Area = R(-10, -24, 20, 27), Spot = V(0, 0), ExitTo = "shop/door" },
                    new Hotspot { Id = "station_road", At = V(16, 550), Label = "Road to the old station", Area = R(-16, -22, 28, 32), Spot = V(0, 0), ExitTo = "station/village" },
                    new Hotspot { Id = "signpost", At = V(46, 500), Label = "Signpost", Area = R(-8, -28, 16, 30), Spot = V(14, 17) },
                    new Hotspot { Id = "notice_board", At = V(448, 306), Label = "Notice board", Area = R(-12, -26, 26, 26), Spot = V(0, 30) },
                },
                Spawns = new() { ["start"] = V(56, 520), ["from_station"] = V(56, 520), ["from_shop"] = V(360, 272) },
            },
            ["shop"] = new PlaceDef
            {
                Id = "shop",
                Variants = new[] { "night" },
                Mood = "shop",
                Indoors = true,
                WoodFloor = true,
                DoorBell = true,
                People = new[]
                {
                    new Person { Id = "marlow", At = V(200, 151), Label = "Marlow", Area = R(-12, -32, 24, 32), Spot = V(-44, 35), Facing = -1 },
                },
                Hotspots = new[]
                {
                    new Hotspot { Id = "door", At = V(180, 234), Label = "Back outside", Area = R(-14, -6, 28, 10), Spot = V(0, 0), ExitTo = "village/from_shop" },
                    new Hotspot { Id = "lanterns", At = V(180, 41), Label = "Lanterns", Area = R(-160, -14, 320, 26), Spot = V(-70, 159) },
                    new Hotspot { Id = "clock", At = V(180, 74), Label = "Clock", Area = R(-19, -19, 38, 38), Spot = V(-2, 122) },
                },
                Spawns = new() { ["door"] = V(180, 218), ["counter"] = V(156, 186) },
            },
            ["station"] = new PlaceDef
            {
                Id = "station",
                WoodFloor = true,
                People = new[]
                {
                    new Person { Id = "mender", At = V(268, 128), Label = "Mender", Area = R(-16, -36, 32, 38), Spot = V(-20, 24), Facing = -1 },
                    new Person { Id = "helen", At = V(372, 122), Label = "Helen", Area = R(-20, -30, 40, 42), Spot = V(-28, 30), Facing = -1, Pose = "sit" },
                },
                Hotspots = new[]
                {
                    new Hotspot { Id = "village_road", At = V(8, 148), Label = "Back to Bellwood", Area = R(-8, -20, 14, 30), Spot = V(0, 0), ExitTo = "village/from_station" },
                    new Hotspot { Id = "plaque", At = V(79, 83), Label = "Plaque", Area = R(-16, -9, 32, 19), Spot = V(0, 65) },
                    new Hotspot { Id = "timetable", At = V(166, 97), Label = "Timetable", Area = R(-23, -14, 46, 36), Spot = V(0, 51) },
                },
                Spawns = new() { ["village"] = V(30, 148) },
            },
        };
    }
}
