using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Every place in the game: Bellwood outdoors (for now its West: the old gate, drawn in west.js) and the interiors.
    /// The shop still comes from the Godot build until the nine interiors are drawn. A place copies its hotspots, so these stay as written.
    /// </summary>
    public static class Places
    {
        public static PlaceDef Get(string id) =>
            All.TryGetValue(id, out var def) ? def : throw new System.ArgumentException($"No place called {id}");

        static Rect R(float x, float y, float w, float h) => new(x, y, w, h);
        static Vector2 V(float x, float y) => new(x, y);

        static readonly Dictionary<string, PlaceDef> All = new()
        {
            ["world"] = new PlaceDef
            {
                Id = "world",
                Variants = new[] { "day" },
                People = new[]
                {
                    new Person { Id = "helen", At = V(536, 1146), Label = "Helen", Area = R(-10, -30, 20, 30), Spot = V(-22, 2), Facing = -1 },
                },
                Hotspots = new[]
                {
                    new Hotspot { Id = "shop_door", At = V(650, 1930), Label = "Marlow's shop", Area = R(-12, -42, 24, 44), Spot = V(0, 16), ExitTo = "shop/door" },
                    new Hotspot { Id = "station_clock", At = V(760, 994), Label = "Station clock", Area = R(-16, -16, 32, 32), Spot = V(0, 190) },
                    new Hotspot { Id = "info_board", At = V(1030, 1196), Label = "Notice board", Area = R(-20, -46, 40, 48), Spot = V(0, 18) },
                },
                Spawns = new() { ["start"] = V(760, 1192), ["from_shop"] = V(650, 1950) },
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
                    new Hotspot { Id = "door", At = V(180, 234), Label = "Back outside", Area = R(-14, -6, 28, 10), Spot = V(0, 0), ExitTo = "world/from_shop" },
                    new Hotspot { Id = "lanterns", At = V(180, 41), Label = "Lanterns", Area = R(-160, -14, 320, 26), Spot = V(-70, 159) },
                    new Hotspot { Id = "clock", At = V(180, 74), Label = "Clock", Area = R(-19, -19, 38, 38), Spot = V(-2, 122) },
                },
                Spawns = new() { ["door"] = V(180, 218), ["counter"] = V(156, 186) },
            },
        };
    }
}
