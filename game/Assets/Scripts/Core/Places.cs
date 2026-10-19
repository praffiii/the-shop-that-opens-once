using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Every place in the game: Bellwood outdoors, one area per part of town (ArtSource/areas.js), and the interiors
    /// (ArtSource/inside.js). A place copies its hotspots, so these stay as written.
    /// </summary>
    public static class Places
    {
        public static PlaceDef Get(string id) =>
            All.TryGetValue(id, out var def) ? def : throw new System.ArgumentException($"No place called {id}");

        public static IEnumerable<PlaceDef> Every => All.Values;

        static Rect R(float x, float y, float w, float h) => new(x, y, w, h);
        static Vector2 V(float x, float y) => new(x, y);

        // The Prologue's Day 0, and every chapter after it.
        static readonly int[] DayZero = { 0 }, AfterDayZero = { 1, 2, 3, 4, 5, 6, 7, 8 };

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
                    // Two neighbours who come by to chat on the platform: he stands and listens, she talks, wanders off to read
                    // the notices or look in at Helen's stall, and comes back with more to say. At dusk they sit together on
                    // the platform's other bench.
                    new Person
                    {
                        Id = "neighbour_a", Label = "Neighbour", Spot = V(-20, 6), Phases = new[] { Phase.Morning, Phase.Midday },
                        Round = new[]
                        {
                            new Stop { At = V(470, 336), Pose = "talk", Facing = 1, Wait = 7f },
                            new Stop { At = V(626, 322), Pose = "look", Facing = 1, Wait = 5f },
                            new Stop { At = V(470, 336), Pose = "talk", Facing = 1, Wait = 7f },
                            new Stop { At = V(380, 334), Facing = -1, Wait = 4f },
                        },
                        Line = "Have you heard? The Baker's trying a new rye. Again. We'll all be very polite about it.",
                    },
                    new Person
                    {
                        Id = "neighbour_b", At = V(494, 338), Label = "Neighbour", Spot = V(20, 6), Facing = -1, Phases = new[] { Phase.Morning, Phase.Midday },
                        Line = "Fine day for standing about. Trains or no trains, a station's the place for it.",
                    },
                    new Person
                    {
                        Id = "neighbour_a", At = V(572, 277), Seat = 9, Label = "Neighbour", Spot = V(-22, 8), Pose = "sit", Facing = 1, Phases = new[] { Phase.Dusk },
                        Line = "We sit here every evening. A habit, that's all. You never know who might step off.",
                    },
                    new Person
                    {
                        Id = "neighbour_b", At = V(590, 277), Seat = 9, Label = "Neighbour", Spot = V(22, 8), Pose = "sit", Facing = -1, Phases = new[] { Phase.Dusk },
                        Line = "Evening already. My knees say bench, and my knees are usually right.",
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
                    // The flower seller waters the white and the yellow flowers out on the west lawn, then sets her pots
                    // straight at her stall, while a shopper goes round the stalls with her basket: home, the bread
                    // stall, the flowers, Mia's vegetables, and home again. At dusk the flower seller
                    // carries her pots home and the shopper rests on the bench under the oak.
                    new Person
                    {
                        Id = "florist", Label = "Flower seller", Spot = V(-16, 6), Phases = new[] { Phase.Morning, Phase.Midday },
                        Round = new[]
                        {
                            new Stop { At = V(406, 692), Pose = "water", Facing = 1, Wait = 5f },
                            new Stop { At = V(136, 692), Pose = "water", Facing = 1, Wait = 5f },
                            new Stop { At = V(520, 748), Pose = "lift", Facing = 1, Wait = 4f },
                        },
                        Line = "Little and often, that's the trick with pots. Too much water and they sulk.",
                    },
                    new Person
                    {
                        Id = "shopper", Label = "Shopper", Spot = V(-16, 6), Phases = new[] { Phase.Morning, Phase.Midday },
                        Round = new[]
                        {
                            new Stop { At = V(1110, 628), Pose = "lift", Facing = -1, Wait = 3f, Carry = true },
                            new Stop { At = V(760, 750), Pose = "lift", Facing = -1, Wait = 4f, Carry = true },
                            new Stop { At = V(594, 750), Pose = "lift", Facing = -1, Wait = 4f, Carry = true },
                            new Stop { At = V(500, 576), Pose = "lift", Facing = 1, Wait = 4f, Carry = true },
                        },
                        Line = "Bread, carrots, and something pretty for the table. A basket's not full till it has flowers in it.",
                    },
                    new Person
                    {
                        Id = "florist", Label = "Flower seller", Spot = V(-16, 6), Phases = new[] { Phase.Dusk },
                        Round = new[]
                        {
                            new Stop { At = V(520, 750), Pose = "lift", Facing = 1, Wait = 3f, Carry = true },
                            new Stop { At = V(140, 628), Pose = "lift", Facing = -1, Wait = 3f },
                        },
                        Line = "Pots in for the night. They'd keep out here, but I sleep better with them indoors.",
                    },
                    // Day 0's dusk: Helen buying the last loaves at the bread stall and Leo chatting by the bench under the
                    // oak, there when Satria comes home.
                    new Person
                    {
                        Id = "helen", At = V(760, 752), Label = "Helen", Spot = V(18, 4), Away = true, Chapters = DayZero, Phases = new[] { Phase.Dusk },
                        Line = "Go on home and rest, Satria. The key's under the geranium pot, same as ever.",
                    },
                    new Person
                    {
                        Id = "leo", At = V(1088, 764), Label = "Leo", Spot = V(18, 4), Pose = "talk", Facing = -1, Chapters = DayZero, Phases = new[] { Phase.Dusk },
                        Line = "Go on, city legs. Your house won't walk to you.",
                    },
                    new Person
                    {
                        Id = "shopper", At = V(1040, 755), Seat = 8, Label = "Shopper", Spot = V(0, 20), Pose = "sit", Facing = 1, Phases = new[] { Phase.Dusk },
                        Line = "Basket full, feet tired. I'll sit under the oak a while before I go in.",
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
                    // Morning: Nenek Nora weaves at the loom out on her deck, the Gardener waters the chamomile rows, and Leo
                    // runs laps of the lane. Midday: Nora still weaves, the Gardener tends the rows behind his glasshouse,
                    // Leo looks out from his lookout. Dusk: Nora sits on her steps, the Gardener rests on the orchard bench,
                    // Leo watches the far road through the telescope.
                    new Person
                    {
                        Id = "nora", At = V(260, 401), Floor = 16, Label = "Nenek Nora", Spot = V(0, 45), Pose = "weave", Facing = 1, Phases = new[] { Phase.Morning },
                        Line = "Sit a while if you like, child. The loom goes at its own pace, and so do I.",
                    },
                    new Person
                    {
                        Id = "nora", At = V(260, 401), Floor = 16, Label = "Nenek Nora", Spot = V(0, 45), Pose = "weave", Facing = 1, Phases = new[] { Phase.Midday },
                        Line = "My mother taught me this pattern, and her mother before her. The thread remembers what we forget.",
                    },
                    new Person
                    {
                        Id = "nora", At = V(323, 422), Seat = 8, Label = "Nenek Nora", Spot = V(-23, 24), Pose = "sit", Facing = 1, Phases = new[] { Phase.Dusk },
                        Line = "Evenings are the best part. The river talks, and I listen. Sit, if your legs are tired.",
                    },
                    new Person
                    {
                        Id = "gardener", Label = "Gardener", Spot = V(0, 12), Phases = new[] { Phase.Morning },
                        Round = new[]
                        {
                            new Stop { At = V(378, 153), Pose = "water", Facing = -1, Wait = 5f },
                            new Stop { At = V(378, 211), Pose = "water", Facing = 1, Wait = 5f },
                            new Stop { At = V(378, 268), Pose = "water", Facing = -1, Wait = 5f },
                        },
                        Line = "Chamomile won't be hurried. Water, wait, and one morning it simply opens.",
                    },
                    new Person
                    {
                        Id = "gardener", At = V(790, 604), Label = "Gardener", Spot = V(18, 0), Pose = "tend", Facing = -1, Phases = new[] { Phase.Midday },
                        Line = "Tomatoes under glass, cabbages out here. Everything mends at its own pace. People too.",
                    },
                    new Person
                    {
                        Id = "gardener", At = V(513, 447), Seat = 8, Label = "Gardener", Spot = V(36, 8), Pose = "sit", Facing = 1, Phases = new[] { Phase.Dusk },
                        Line = "The watering's done. Now I sit, and the orchard grows without my help.",
                    },
                    new Person
                    {
                        Id = "leo", Label = "Leo", Spot = V(0, 12), Phases = new[] { Phase.Morning },
                        Round = new[]
                        {
                            new Stop { At = V(120, 472), Facing = 1, Wait = 2f, Run = true },
                            new Stop { At = V(880, 482), Facing = -1, Wait = 2f, Run = true },
                        },
                        Line = "Lap nine! Still the fastest legs in Bellwood. Ask anyone. Well, anyone old enough to remember.",
                    },
                    new Person
                    {
                        Id = "leo", At = V(856, 236), Label = "Leo", Spot = V(-20, 4), Pose = "look", Facing = -1, Phases = new[] { Phase.Midday },
                        Line = "Up here I can see every road in the valley. Every road a runner could take.",
                    },
                    new Person
                    {
                        Id = "leo", At = V(882, 157), Floor = 30, Label = "Leo", Spot = V(-4, 55), Pose = "peer", Facing = 1, Chapters = AfterDayZero, Phases = new[] { Phase.Dusk },
                        Line = "Sun's going. I watch the far road till the lamps come on. Old habit. Don't ask.",
                    },
                    // A farmhand gathers the windfall apples under the orchard's trees and empties the basket into the crates;
                    // the aphid herder tends the pen and carries a pail of honeydew up the lane to Nora's steps. At dusk the
                    // farmhand sits by the Gardener on the orchard bench and the herder shuts up the pen.
                    new Person
                    {
                        Id = "farmhand", Label = "Farmhand", Spot = V(0, 14), Phases = new[] { Phase.Morning, Phase.Midday },
                        Round = new[]
                        {
                            new Stop { At = V(452, 404), Pose = "lift", Facing = -1, Wait = 3f, Carry = true },
                            new Stop { At = V(534, 414), Pose = "lift", Facing = -1, Wait = 3f, Carry = true },
                            new Stop { At = V(484, 452), Pose = "lift", Facing = -1, Wait = 3f },
                        },
                        Line = "The wind does half my picking. I just come along after and say thank you.",
                    },
                    new Person
                    {
                        Id = "herder", Label = "Aphid herder", Spot = V(0, 14), Phases = new[] { Phase.Morning, Phase.Midday },
                        Round = new[]
                        {
                            new Stop { At = V(500, 714), Pose = "tend", Facing = 1, Wait = 5f },
                            new Stop { At = V(548, 714), Pose = "tend", Facing = -1, Wait = 5f, Carry = true },
                            new Stop { At = V(330, 478), Pose = "lift", Facing = -1, Wait = 3f },
                        },
                        Line = "Fresh honeydew for Nenek Nora. She says it keeps her fingers quick at the loom.",
                    },
                    new Person
                    {
                        Id = "farmhand", At = V(541, 447), Seat = 8, Label = "Farmhand", Spot = V(20, 8), Pose = "sit", Facing = -1, Phases = new[] { Phase.Dusk },
                        Line = "Twelve crates today. The Gardener says eleven. We'll argue it out till dark.",
                    },
                    new Person
                    {
                        Id = "herder", Label = "Aphid herder", Spot = V(0, 14), Phases = new[] { Phase.Dusk },
                        Round = new[]
                        {
                            new Stop { At = V(500, 714), Pose = "tend", Facing = 1, Wait = 5f },
                            new Stop { At = V(548, 714), Pose = "tend", Facing = -1, Wait = 5f },
                        },
                        Line = "Counting them in for the night. They wander, the little ones, same as children.",
                    },
                    // Day 0's dusk: Theo at the bridge's rail, there to wave Satria in.
                    new Person
                    {
                        Id = "theo", At = V(186, 456), Label = "Theo", Spot = V(-18, 6), Pose = "look", Facing = 1, Chapters = DayZero, Phases = new[] { Phase.Dusk },
                        Line = "The sea wind never changes here, Satria. Nor do we, much.",
                    },
                    // Day 0, once the square has welcomed Satria: Valdo, the city's land agent, waiting by the waymark at
                    // the road's turn into the East to catch him on his way home.
                    new Person
                    {
                        Id = "valdo", At = V(72, 452), Label = "Valdo", Spot = V(18, 6), Facing = -1, After = "welcomed", Chapters = DayZero, Phases = new[] { Phase.Dusk },
                        Line = "The morning of Day Eight, Saudara Satria. The investors don't like waiting. Nor do I.",
                    },
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
                Hotspots = new[]
                {
                    West("to_square", 470, "To the square", "square/from_east"),
                    East("to_road", 1024, 740, "To the bus stop", "eastroad/from_east"),
                    new Hotspot { Id = "home_door", At = V(877, 440), Label = "Home", Area = R(-10, -30, 20, 36), Spot = V(0, 10), ExitTo = "satria_home/door" },
                    new Hotspot { Id = "geranium", At = V(902, 452), Label = "Geranium pot", Area = R(-8, -22, 16, 22), Spot = V(0, 9), Chapters = DayZero },
                    // Day 0: the yard gate, pushed open on the way in
                    new Hotspot { Id = "gate", At = V(877, 470), Area = R(-8, -8, 16, 12), Step = true, Chapters = DayZero },
                    // Day 0, on Satria's way in: a band across the East west of his home, which every way from the bus stop
                    // crosses, where he looks back at the house; and the bridge
                    new Hotspot { Id = "glimpse", At = V(620, 640), Area = R(-8, -260, 16, 452), Step = true, Chapters = DayZero },
                    new Hotspot { Id = "bridge", At = V(176, 470), Area = R(-6, -24, 12, 48), Step = true, Chapters = DayZero },
                },
            },
            // The road into Bellwood, past the East: the bus stop where Satria arrives. Nobody lives out here.
            ["eastroad"] = new PlaceDef
            {
                Id = "eastroad",
                Variants = new[] { "day" },
                // round the bend in the trees past the area's east edge, where the bus pulls up out of sight
                Spawns = new() { ["off_bus"] = V(1090, 234) },
                Hotspots = new[]
                {
                    West("to_east", 262, "To the east", "east/from_road"),
                    new Hotspot { Id = "bus_bench", At = V(696, 232), Label = "Bench", Area = R(-20, -14, 36, 14), Spot = V(0, 16) },
                    new Hotspot { Id = "bus_poster", At = V(711, 232), Label = "Poster", Area = R(-6, -32, 12, 14), Spot = V(0, 16) },
                    new Hotspot { Id = "bus_bin", At = V(654, 234), Label = "Bin", Area = R(-7, -18, 14, 18), Spot = V(0, 12) },
                },
            },
            ["coast"] = new PlaceDef
            {
                Id = "coast",
                Variants = new[] { "day" },
                People = new[]
                {
                    // Theo photographs the sea from the bluff in the morning, waits out the flat noon light at his studio door,
                    // and shoots the sunset by the rope bridge's remains. Arlo fishes off the jetty, mends his net on the
                    // street at midday, and sits at the jetty's end at dusk.
                    new Person
                    {
                        Id = "theo", At = V(400, 228), Label = "Theo", Spot = V(-18, 4), Pose = "photo", Facing = 1, Phases = new[] { Phase.Morning },
                        Line = "The light off the sea is honest at this hour. It doesn't flatter anyone.",
                    },
                    new Person
                    {
                        Id = "theo", At = V(278, 216), Label = "Theo", Spot = V(-16, 2), Pose = "look", Facing = -1, Phases = new[] { Phase.Midday },
                        Line = "Too bright. Everything goes flat at noon. I'll wait for the light to come back.",
                    },
                    new Person
                    {
                        Id = "theo", At = V(124, 226), Label = "Theo", Spot = V(-22, 4), Pose = "photo", Facing = -1, Phases = new[] { Phase.Dusk },
                        Line = "Sunsets are easy to photograph. That's why I keep trying to get one right.",
                    },
                    new Person
                    {
                        Id = "arlo", At = V(514, 754), Label = "Arlo", Spot = V(-16, -6), Pose = "fish", Facing = 1, Phases = new[] { Phase.Morning },
                        Line = "Tide's turning. Fish bite when the water changes its mind. Sit quiet and you'll see.",
                    },
                    new Person
                    {
                        Id = "arlo", At = V(606, 452), Label = "Arlo", Spot = V(-18, 6), Pose = "tend", Facing = 1, Phases = new[] { Phase.Midday },
                        Line = "Every knot's a promise to the next storm. I keep my promises.",
                    },
                    new Person
                    {
                        Id = "arlo", At = V(506, 759), Label = "Arlo", Spot = V(-8, -10), Pose = "sit", Facing = 1, Phases = new[] { Phase.Dusk },
                        Line = "End of the day, the sea goes quiet. Best time to think, if you've got thinking to do.",
                    },
                    // A fisher carries the catch landed at the jetty's foot, crate by crate, to the fish rack; the salt worker
                    // rakes the salt pans on the sand and carries the sacks to the salt store. At dusk the fisher sits on the rowboat pulled up on the
                    // sand and the salt worker sweeps the store's step.
                    new Person
                    {
                        Id = "fisher", Label = "Fisher", Spot = V(14, 0), Phases = new[] { Phase.Morning, Phase.Midday },
                        Round = new[]
                        {
                            new Stop { At = V(486, 606), Pose = "lift", Facing = -1, Wait = 3f, Carry = true },
                            new Stop { At = V(820, 536), Pose = "lift", Facing = -1, Wait = 3f },
                        },
                        Line = "Arlo catches them, I carry them. He says that makes him the brains. I say it makes me the back.",
                    },
                    new Person
                    {
                        Id = "salter", Label = "Salt worker", Spot = V(0, 14), Phases = new[] { Phase.Morning, Phase.Midday },
                        Round = new[]
                        {
                            new Stop { At = V(186, 528), Pose = "rake", Facing = 1, Wait = 5f },
                            new Stop { At = V(242, 530), Pose = "rake", Facing = 1, Wait = 5f, Carry = true },
                            new Stop { At = V(236, 470), Pose = "lift", Facing = 1, Wait = 3f },
                        },
                        Line = "The sea leaves the salt and I fetch it in. A fair arrangement. The sea's never once complained.",
                    },
                    new Person
                    {
                        Id = "fisher", At = V(230, 592), Seat = 6, Label = "Fisher", Spot = V(0, -14), Pose = "sit", Facing = 1, Phases = new[] { Phase.Dusk },
                        Line = "Crates washed, rack full. Now I sit and watch the water do nothing for a while.",
                    },
                    new Person
                    {
                        Id = "salter", At = V(236, 470), Label = "Salt worker", Spot = V(0, 14), Pose = "sweep", Facing = 1, Phases = new[] { Phase.Dusk },
                        Line = "Salt gets everywhere. Into the step, into the door, into my dreams.",
                    },
                },
                Hotspots = new[] { North("to_square", 480, "Up to the square", "square/from_coast") },
            },
            ["grove"] = new PlaceDef
            {
                Id = "grove",
                Variants = new[] { "day" },
                Hotspots = new[]
                {
                    new Hotspot { Id = "shop_door", At = V(300, 236), Label = "A small door", Area = R(-10, -30, 20, 36), Spot = V(0, 14), ExitTo = "shop/door" },
                    new Hotspot { Id = "to_station", At = V(636, 500), Label = "To the station", Area = R(-12, -24, 16, 48), Spot = V(-6, 0), ExitTo = "station/from_grove" },
                },
            },
            // Satria's childhood home in the east, cut open as HD-2D shows a room (ArtSource/inside.js).
            ["satria_home"] = new PlaceDef
            {
                Id = "satria_home",
                Variants = new[] { "day" },
                Indoors = true,
                Open = true,
                WoodFloor = true,
                Hotspots = new[]
                {
                    new Hotspot { Id = "door", At = V(877, 440), Label = "Outside", Area = R(-16, -10, 32, 12), Spot = V(0, -6), ExitTo = "east/satria_home_door" },
                    // what Satria finds of his family on Day 0: their photo over the sofa, Ayah's radio, Ibu's sewing
                    // machine, the kitchen's water jar, and the bed he sleeps in
                    new Hotspot { Id = "photo", At = V(892, 349), Label = "Family photo", Area = R(-24, -86, 48, 32), Spot = V(0, 26), Chapters = DayZero },
                    new Hotspot { Id = "radio", At = V(905, 393), Label = "Radio", Area = R(-9, -31, 18, 18), Spot = V(0, 11), Chapters = DayZero },
                    new Hotspot { Id = "sewing", At = V(785, 408), Label = "Sewing machine", Area = R(-24, -29, 48, 30), Spot = V(14, 10), Chapters = DayZero },
                    new Hotspot { Id = "water_jar", At = V(979, 418), Label = "Water jar", Area = R(-10, -24, 20, 24), Spot = V(0, 10), Chapters = DayZero },
                    new Hotspot { Id = "bed", At = V(785, 378), Label = "Bed", Area = R(-36, -56, 55, 54), Spot = V(14, 6), Chapters = DayZero },
                },
            },
            // Marlow's shop at the end of the grove path, cut open the same way: Marlow behind the counter, the clock
            // and the cabinet of the seven boxes and their lanterns against the back wall. The counter anchor is the
            // customer's side.
            ["shop"] = new PlaceDef
            {
                Id = "shop",
                Variants = new[] { "day" },
                Mood = "shop",
                Indoors = true,
                Open = true,
                WoodFloor = true,
                DoorBell = true,
                People = new[]
                {
                    // Marlow's day in his shop: a cup polished behind the counter, the lanterns looked over, the clock
                    // checked, a curio taken out of its case, the floor swept, and back to the counter
                    new Person
                    {
                        Id = "marlow", At = V(310, 136), Label = "Marlow", Area = R(-12, -32, 24, 32), Spot = V(0, 28), Facing = -1,
                        Round = new[]
                        {
                            // he minds his shop from behind the counter: polishing a cup with an eye on the courier,
                            // now and then a glance back at the lanterns, or a look in the ledger at the counter's end
                            new Stop { At = V(310, 136), Pose = "polish", Watch = true, Wait = 9f },
                            new Stop { At = V(310, 136), Pose = "idle", Away = true, Wait = 3f },
                            new Stop { At = V(310, 136), Pose = "polish", Watch = true, Wait = 7f },
                            new Stop { At = V(276, 136), Pose = "inspect", Facing = -1, Wait = 4f },
                        },
                    },
                },
                Hotspots = new[]
                {
                    new Hotspot { Id = "door", At = V(300, 236), Label = "Back outside", Area = R(-16, -10, 32, 12), Spot = V(0, -6), ExitTo = "grove/shop_door" },
                    new Hotspot { Id = "lanterns", At = V(308, 104), Label = "Lanterns", Area = R(-42, -48, 84, 48), Spot = V(-28, 58) },
                    new Hotspot { Id = "clock", At = V(257, 106), Label = "Clock", Area = R(-8, -62, 16, 64), Spot = V(0, 10) },
                },
            },
        };
    }
}
