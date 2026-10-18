using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Every place in the game: Bellwood outdoors, one area per part of town (ArtSource/areas.js), and the interiors.
    /// The shop still comes from the Godot build until the nine interiors are drawn. A place copies its hotspots, so these stay as written.
    /// </summary>
    public static class Places
    {
        public static PlaceDef Get(string id) =>
            All.TryGetValue(id, out var def) ? def : throw new System.ArgumentException($"No place called {id}");

        static Rect R(float x, float y, float w, float h) => new(x, y, w, h);
        static Vector2 V(float x, float y) => new(x, y);

        // Exits at an area's edges: a strip along the edge where a road leaves it, walked to just inside the edge.
        static Hotspot West(string id, float y, string label, string to) => new() { Id = id, At = V(0, y), Label = label, Area = R(0, -24, 24, 48), Spot = V(12, 0), ExitTo = to };
        static Hotspot East(string id, float w, float y, string label, string to) => new() { Id = id, At = V(w, y), Label = label, Area = R(-24, -24, 24, 48), Spot = V(-12, 0), ExitTo = to };
        static Hotspot North(string id, float x, string label, string to) => new() { Id = id, At = V(x, 0), Label = label, Area = R(-24, 0, 48, 24), Spot = V(0, 12), ExitTo = to };
        static Hotspot South(string id, float x, float h, string label, string to) => new() { Id = id, At = V(x, h), Label = label, Area = R(-24, -24, 48, 24), Spot = V(0, -12), ExitTo = to };

        static readonly Dictionary<string, PlaceDef> All = new()
        {
            ["station"] = new PlaceDef
            {
                Id = "station",
                Variants = new[] { "day" },
                People = new[]
                {
                    new Person { Id = "helen", At = V(366, 318), Label = "Helen", Area = R(-10, -30, 20, 30), Spot = V(-22, 2), Facing = -1 },
                },
                Hotspots = new[]
                {
                    West("to_grove", 690, "Into the trees", "grove/from_station"),
                    East("to_square", 960, 686, "To the square", "square/from_station"),
                    new Hotspot { Id = "station_clock", At = V(530, 160), Label = "Station clock", Area = R(-16, -16, 32, 32), Spot = V(0, 190) },
                    new Hotspot { Id = "info_board", At = V(740, 368), Label = "Notice board", Area = R(-20, -46, 40, 48), Spot = V(0, 18) },
                },
            },
            ["square"] = new PlaceDef
            {
                Id = "square",
                Variants = new[] { "day" },
                Hotspots = new[]
                {
                    West("to_station", 640, "To the station", "station/from_square"),
                    East("to_east", 1280, 640, "To the east", "east/from_square"),
                    South("to_coast", 640, 1040, "Down to the coast", "coast/from_square"),
                },
            },
            ["east"] = new PlaceDef
            {
                Id = "east",
                Variants = new[] { "day" },
                Hotspots = new[] { West("to_square", 470, "To the square", "square/from_east") },
            },
            ["coast"] = new PlaceDef
            {
                Id = "coast",
                Variants = new[] { "day" },
                Hotspots = new[] { North("to_square", 480, "Up to the square", "square/from_coast") },
            },
            ["grove"] = new PlaceDef
            {
                Id = "grove",
                Variants = new[] { "day" },
                Hotspots = new[]
                {
                    new Hotspot { Id = "shop_door", At = V(300, 236), Label = "A small door", Area = R(-10, -30, 20, 32), Spot = V(0, 14), ExitTo = "shop/door" },
                    new Hotspot { Id = "to_station", At = V(636, 500), Label = "To the station", Area = R(-12, -24, 16, 48), Spot = V(-6, 0), ExitTo = "station/from_grove" },
                },
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
                    new Hotspot { Id = "door", At = V(180, 234), Label = "Back outside", Area = R(-14, -6, 28, 10), Spot = V(0, 0), ExitTo = "grove/from_shop" },
                    new Hotspot { Id = "lanterns", At = V(180, 41), Label = "Lanterns", Area = R(-160, -14, 320, 26), Spot = V(-70, 159) },
                    new Hotspot { Id = "clock", At = V(180, 74), Label = "Clock", Area = R(-19, -19, 38, 38), Spot = V(-2, 122) },
                },
                Spawns = new() { ["door"] = V(180, 218), ["counter"] = V(156, 186) },
            },
        };
    }
}
