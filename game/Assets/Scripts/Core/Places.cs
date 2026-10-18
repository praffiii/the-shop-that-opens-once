using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Every place in the game: Bellwood outdoors (one seamless world of the GDD's four zones) and the interiors.
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
                    new Person { Id = "helen", At = V(390, 576), Label = "Helen", Area = R(-10, -30, 20, 30), Spot = V(14, 2), Facing = -1 },
                    new Person { Id = "baker", At = V(632, 498), Label = "Baker", Spot = V(24, 2) },
                    new Person { Id = "kid", At = V(740, 566), Label = "Village kid", Area = R(-8, -24, 16, 24) },
                },
                Hotspots = new[]
                {
                    new Hotspot { Id = "shop_door", At = V(334, 372), Label = "Marlow's shop", Area = R(-10, -20, 20, 22), Spot = V(0, 0), ExitTo = "shop/door" },
                    new Hotspot { Id = "station_clock", At = V(206, 424), Label = "Station clock", Area = R(-12, -12, 24, 24), Spot = V(0, 136) },
                    new Hotspot { Id = "info_board", At = V(394, 529), Label = "Platform board", Area = R(-12, -24, 24, 26), Spot = V(0, 9) },
                    new Hotspot { Id = "notice_board", At = V(690, 474), Label = "Notice board", Area = R(-12, -26, 26, 26), Spot = V(0, 8) },
                },
                Spawns = new() { ["start"] = V(300, 470), ["from_shop"] = V(334, 384) },
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
