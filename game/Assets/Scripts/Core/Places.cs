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

        public static IEnumerable<PlaceDef> Every => All.Values;

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
                    // Morning: Helen brews at her stall, Kapten Bram paces between the frozen clock and the timetable,
                    // a porter carries sacks up from the yard to Helen's stall, and the Mender is at the anvil.
                    // Midday: Helen wipes cups, Bram polishes the whistle by his carriage, the Mender taps the old
                    // engine's wheels. Dusk: Helen waits on the bench facing the tunnel, Bram stands by the engine,
                    // the Mender is back at the forge and the porter has gone home.
                    new Person
                    {
                        Id = "helen", At = V(352, 316), Label = "Helen", Spot = V(18, 2), Pose = "brew", Facing = -1, Phases = new[] { Phase.Morning },
                        Line = "Morning, love. The first cup always goes on the end of the counter, in case the train comes in.",
                    },
                    new Person
                    {
                        Id = "bram", Label = "Kapten Bram", Spot = V(-20, 4), Phases = new[] { Phase.Morning },
                        Round = new[]
                        {
                            new Stop { At = V(810, 340), Pose = "look", Facing = -1, Wait = 6f },
                            new Stop { At = V(664, 318), Facing = -1, Wait = 4f },
                        },
                        Line = "The board still says the morning train is due. I check it anyway. Forty years on the footplate does that.",
                    },
                    new Person
                    {
                        Id = "porter", Label = "Porter", Spot = V(0, -10), Phases = new[] { Phase.Morning, Phase.Midday },
                        // a sack from the pile in the yard up to Helen's stall, set down by her crates, and back for the next
                        Round = new[]
                        {
                            new Stop { At = V(432, 432), Pose = "lift", Facing = -1, Wait = 2.5f, Carry = true },
                            new Stop { At = V(252, 326), Pose = "lift", Facing = -1, Wait = 2.5f },
                        },
                        Line = "Sugar and tea for Helen's stall. She goes through a sack a week, pouring for a train that never comes.",
                    },
                    new Person
                    {
                        Id = "mender", At = V(566, 626), Label = "Mender", Spot = V(0, 14), Pose = "hammer", Phases = new[] { Phase.Morning },
                        Line = "Morning. Mind the sparks.",
                    },
                    new Person
                    {
                        Id = "helen", At = V(352, 316), Label = "Helen", Spot = V(18, 2), Pose = "polish", Facing = -1, Phases = new[] { Phase.Midday },
                        Line = "Every cup gets a wipe, used or not. You never know who'll step off that train.",
                    },
                    new Person
                    {
                        Id = "bram", At = V(232, 632), Label = "Kapten Bram", Spot = V(18, 4), Pose = "polish", Facing = -1, Phases = new[] { Phase.Midday },
                        Line = "Brass goes green if you let it. I give the whistle a rub every day, in case she needs it.",
                    },
                    new Person
                    {
                        Id = "mender", At = V(520, 266), Label = "Mender", Spot = V(20, 6), Pose = "hammer", Phases = new[] { Phase.Midday },
                        Line = "Wheels are sound. Bearings too. She could run tomorrow, if anyone let her.",
                    },
                    new Person
                    {
                        Id = "helen", At = V(430, 277), Label = "Helen", Spot = V(26, 6), Pose = "sit", Seat = 9, Facing = -1, Phases = new[] { Phase.Dusk },
                        Line = "I sit here every evening. The tunnel's dark, but I like to be the first face they see.",
                    },
                    new Person
                    {
                        Id = "bram", At = V(612, 268), Label = "Kapten Bram", Spot = V(20, 4), Pose = "look", Facing = -1, Phases = new[] { Phase.Dusk },
                        Line = "The old girl's still got steam in her somewhere. You can hear it, if the evening's quiet.",
                    },
                    new Person
                    {
                        Id = "mender", At = V(566, 626), Label = "Mender", Spot = V(0, 14), Pose = "hammer", Phases = new[] { Phase.Dusk },
                        Line = "One more piece before dark. The forge doesn't like to go cold.",
                    },
                },
                Hotspots = new[]
                {
                    West("to_grove", 690, "Into the trees", "grove/from_station"),
                    East("to_square", 960, 686, "To the square", "square/from_station"),
                    new Hotspot { Id = "station_clock", At = V(810, 221), Label = "Station clock", Area = R(-16, -16, 32, 32), Spot = V(0, 120) },
                    new Hotspot { Id = "info_board", At = V(640, 306), Label = "Notice board", Area = R(-20, -46, 40, 48), Spot = V(0, 18) },
                },
            },
            ["square"] = new PlaceDef
            {
                Id = "square",
                Variants = new[] { "day" },
                People = new[]
                {
                    // Morning: the Baker carries trays of loaves down from the bakery to the bread stall, Mia carries
                    // crates from home to set out her vegetable stall, Pip runs letters from the shut post office's
                    // steps to the neighbours' doors, and Sam sweeps outside the hall's door.
                    // Midday: the Baker trades gossip at Mia's stall, Sam reads the notice board (Pip is at the east's
                    // playground). Dusk: the Baker sweeps before the bakery, Mia and Pip are at their door before
                    // dark, and Sam locks the hall.
                    new Person
                    {
                        Id = "baker", Label = "Baker", Spot = V(0, 12), Phases = new[] { Phase.Morning },
                        Round = new[]
                        {
                            new Stop { At = V(438, 404), Pose = "lift", Facing = -1, Wait = 2.5f, Carry = true },
                            new Stop { At = V(800, 738), Pose = "lift", Facing = -1, Wait = 2.5f },
                        },
                        Line = "Morning! First batch is out. Take a roll, they're better warm. So is the news.",
                    },
                    new Person
                    {
                        Id = "mia", Label = "Mia", Spot = V(0, 12), Phases = new[] { Phase.Morning },
                        Round = new[]
                        {
                            new Stop { At = V(950, 628), Pose = "lift", Facing = -1, Wait = 2.5f, Carry = true },
                            new Stop { At = V(562, 568), Pose = "lift", Facing = -1, Wait = 3f },
                        },
                        Line = "Cabbages up front, carrots behind. If Pip runs past you, tell him to stop for breakfast.",
                    },
                    new Person
                    {
                        Id = "pip", Label = "Pip", Spot = V(0, 12), Phases = new[] { Phase.Morning },
                        Round = new[]
                        {
                            new Stop { At = V(310, 628), Pose = "lift", Facing = -1, Wait = 2f, Carry = true },
                            new Stop { At = V(1110, 628), Pose = "lift", Facing = -1, Wait = 2f },
                            new Stop { At = V(310, 628), Pose = "lift", Facing = 1, Wait = 2f, Carry = true },
                            new Stop { At = V(140, 628), Pose = "lift", Facing = -1, Wait = 2f },
                        },
                        Line = "Letters! The post office is shut, so I carry them myself. One day I'll be a real courier, like you!",
                    },
                    new Person
                    {
                        Id = "sam", At = V(614, 404), Label = "Sam", Spot = V(-18, -4), Pose = "sweep", Facing = 1, Phases = new[] { Phase.Morning },
                        Line = "Steps first, then the ledgers. Everything in its order, or nothing can ever be found again.",
                    },
                    new Person
                    {
                        Id = "baker", At = V(588, 570), Label = "Baker", Spot = V(10, 14), Pose = "talk", Facing = -1, Phases = new[] { Phase.Midday },
                        Line = "Mia's carrots, my rolls, and a bit of news for both. That's a fair trade in Bellwood.",
                    },
                    new Person
                    {
                        Id = "mia", At = V(562, 568), Label = "Mia", Spot = V(-6, 16), Pose = "talk", Facing = 1, Phases = new[] { Phase.Midday },
                        Line = "Two cabbages for one of his rolls. He thinks he's winning. He isn't.",
                    },
                    new Person
                    {
                        Id = "sam", At = V(838, 572), Label = "Sam", Spot = V(-18, 4), Pose = "look", Facing = 1, Phases = new[] { Phase.Midday },
                        Line = "Three notices pinned out of line. I've written to the hall about it. I am the hall, but procedure is procedure.",
                    },
                    new Person
                    {
                        Id = "baker", At = V(470, 404), Label = "Baker", Spot = V(18, -4), Pose = "sweep", Facing = -1, Phases = new[] { Phase.Dusk },
                        Line = "Last crumbs swept, last loaf sold. Tomorrow the oven's lit before the birds are up.",
                    },
                    new Person
                    {
                        Id = "mia", At = V(1000, 630), Label = "Mia", Spot = V(-18, 8), Facing = 1, Phases = new[] { Phase.Dusk },
                        Line = "Home before dark, that's our rule. Pip knows why.",
                    },
                    new Person
                    {
                        Id = "pip", At = V(1018, 632), Label = "Pip", Spot = V(18, 8), Facing = -1, Phases = new[] { Phase.Dusk },
                        Line = "Mum says we go in before the sky goes grey. I don't mind. Much.",
                    },
                    new Person
                    {
                        Id = "sam", At = V(648, 402), Label = "Sam", Spot = V(-22, 2), Away = true, Phases = new[] { Phase.Dusk },
                        Line = "Doors locked, lamps out, ledgers shelved. A day properly closed.",
                    },
                },
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
                People = new[]
                {
                    // Midday: Pip on his break at the playground, dashing between the slide and the swing.
                    new Person
                    {
                        Id = "pip", Label = "Pip", Spot = V(0, 12), Phases = new[] { Phase.Midday },
                        Round = new[]
                        {
                            new Stop { At = V(360, 628), Facing = 1, Wait = 3f, Run = true },
                            new Stop { At = V(474, 622), Facing = -1, Wait = 4f, Run = true },
                        },
                        Line = "I'm not playing, I'm on my break! Couriers get breaks, don't they?",
                    },
                },
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
