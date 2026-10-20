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
        static readonly int[] DayZero = { 0 }, AfterDayZero = { 1, 2, 3, 4, 5, 6, 7, 8 }, Nights = { 1, 2, 3, 4, 5, 6, 7 };
        // Night 2 keeps Pip at Grandma Nora's all day, Mia at her stall and the Gardener at his chamomile; the other days
        // they go about as usual
        static readonly int[] NightTwo = { 2 }, NotNightTwo = { 0, 1, 3, 4, 5, 6, 7, 8 };
        // the days the story takes the Mender into his forge at midday (Night 1's watch, Night 5's shoes); the others he
        // tinkers with the old engine on the platform
        static readonly int[] ForgeDays = { 1, 5 }, EngineDays = { 0, 2, 3, 4, 6, 7, 8 };

        // One of the platform's oil lanterns on its post, the post's foot at x.
        static Hotspot Lantern(int i, float x) => new()
        {
            Id = $"lantern_post_{i}", At = V(x, 262), Label = "Lantern", Area = R(-8, -40, 16, 42), Spot = V(0, 16),
            Text = "An old oil lantern on an iron post. Its glass is clean: someone still wipes it, though it hasn't been lit since the storm.",
        };

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
                    // Night: Captain Bram cannot sleep and walks the platform between the frozen clock and the board, as
                    // he has every night since the trains stopped.
                    new Person
                    {
                        Id = "bram", Label = "Captain Bram", Spot = V(-20, 4), Chapters = AfterDayZero, Phases = new[] { Phase.Night },
                        Round = new[]
                        {
                            new Stop { At = V(810, 340), Pose = "look", Facing = -1, Wait = 7f },
                            new Stop { At = V(664, 318), Facing = -1, Wait = 5f },
                            new Stop { At = V(470, 330), Pose = "look", Facing = -1, Wait = 6f },
                        },
                        Lines = new[]
                        {
                            "Can't sleep. Never could, on a still night. The rails used to sing me off.",
                            "Midnight, near enough. The 23:40 would have been in by now, in my day.",
                            "Go on, courier. An old man walking a platform is no business of yours. Mind the edge.",
                        },
                    },
                    // Morning: Helen brews at her stall, Captain Bram paces between the frozen clock and the timetable,
                    // a porter carries sacks up from the yard to Helen's stall, and the Mender is at the anvil.
                    // Midday: Helen wipes cups, Bram polishes the whistle by his carriage, the Mender taps the old
                    // engine's wheels. Dusk: Helen waits on the bench facing the tunnel, Bram stands by the engine,
                    // the Mender is back at the forge and the porter has gone home.
                    new Person
                    {
                        Id = "helen", At = V(352, 316), Label = "Helen", Spot = V(18, 2), Pose = "brew", Facing = -1, Phases = new[] { Phase.Morning },
                        Lines = new[]
                        {
                            "Morning, love. The first cup always goes on the end of the counter, in case the train comes in.",
                            "Sugar? No? You look like a two-sugar sort to me. I'll put one in anyway.",
                            "The kettle's older than you are. It whistles flat, but it's never once let me down.",
                        },
                    },
                    new Person
                    {
                        Id = "bram", Label = "Captain Bram", Spot = V(-20, 4), Phases = new[] { Phase.Morning },
                        Round = new[]
                        {
                            new Stop { At = V(810, 340), Pose = "look", Facing = -1, Wait = 6f },
                            new Stop { At = V(664, 318), Facing = -1, Wait = 4f },
                        },
                        Lines = new[]
                        {
                            "The board still says the morning train is due. I check it anyway. Forty years on the footplate does that.",
                            "Ten past the hour, the board says. It's said that a long while now.",
                            "I drove the line forty years. Never late once. Well. Once.",
                        },
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
                        Lines = new[]
                        {
                            "Sugar and tea for Helen's stall. She goes through a sack a week, pouring for a train that never comes.",
                            "Mind your feet, these sacks don't stop for anyone.",
                            "Heavy today. Helen says it's the damp. I say it's my age.",
                        },
                    },
                    new Person
                    {
                        Id = "mender", At = V(566, 626), Label = "Mender", Spot = V(0, 14), Pose = "hammer", Phases = new[] { Phase.Morning },
                        Lines = new[]
                        {
                            "Morning. Mind the sparks.",
                            "Hinges for the hall, a hoop for the Gardener's barrel. Small work keeps the fire honest.",
                            "You've your mother's way of standing in a doorway. Come in or go out, lad.",
                        },
                    },
                    new Person
                    {
                        Id = "helen", At = V(352, 316), Label = "Helen", Spot = V(18, 2), Pose = "polish", Facing = -1, Phases = new[] { Phase.Midday },
                        Lines = new[]
                        {
                            "Every cup gets a wipe, used or not. You never know who'll step off that train.",
                            "Twelve cups, twelve saucers. I count them every noon, though no one's ever taken one.",
                            "Midday's slow. I like it. The steam has the platform to itself.",
                        },
                    },
                    new Person
                    {
                        Id = "bram", At = V(232, 632), Label = "Captain Bram", Spot = V(18, 4), Pose = "polish", Facing = -1, Phases = new[] { Phase.Midday },
                        Lines = new[]
                        {
                            "Brass goes green if you let it. I give the whistle a rub every day, in case she needs it.",
                            "She'll want coal and a crew, if she ever runs again. I'd still know every lever blind.",
                            "Hand me that rag? No, the other one. The clean one is for the whistle only.",
                        },
                    },
                    new Person
                    {
                        Id = "mender", At = V(520, 266), Label = "Mender", Spot = V(20, 6), Pose = "hammer", Chapters = EngineDays, Phases = new[] { Phase.Midday },
                        Lines = new[]
                        {
                            "Wheels are sound. Bearings too. She could run tomorrow, if anyone let her.",
                            "I oil her once a month. Nobody asked me to. Nobody asked me not to, either.",
                            "An engine left standing rusts from the inside first. Same as people.",
                        },
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
                        Lines = new[]
                        {
                            "Have you heard? The Baker's trying a new rye. Again. We'll all be very polite about it.",
                            "They say the hall's roof leaks again. Sam's written to himself about it twice.",
                            "Mia's boy ran past with a letter for me. Two years since I had one. It was a bill.",
                        },
                    },
                    new Person
                    {
                        Id = "neighbour_b", At = V(494, 338), Label = "Neighbour", Spot = V(20, 6), Facing = -1, Phases = new[] { Phase.Morning, Phase.Midday },
                        Lines = new[]
                        {
                            "Fine day for standing about. Trains or no trains, a station's the place for it.",
                            "She does the talking. I do the nodding. Forty years married, it works.",
                            "Don't let her start on the rye. We'll be here till dusk.",
                        },
                    },
                    new Person
                    {
                        Id = "neighbour_a", At = V(572, 277), Seat = 9, Label = "Neighbour", Spot = V(-22, 8), Pose = "sit", Facing = 1, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "We sit here every evening. A habit, that's all. You never know who might step off.",
                            "The lamps come on one by one along the platform. Like someone's walking down it.",
                            "Sit, if you like. There's room. There's always room on this bench.",
                        },
                    },
                    new Person
                    {
                        Id = "neighbour_b", At = V(590, 277), Seat = 9, Label = "Neighbour", Spot = V(22, 8), Pose = "sit", Facing = -1, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "Evening already. My knees say bench, and my knees are usually right.",
                            "She says I snore on this bench. I say I'm listening to the rails with my eyes shut.",
                            "Another day the train didn't come. Still. A good day.",
                        },
                    },
                    new Person
                    {
                        Id = "helen", At = V(430, 277), Label = "Helen", Spot = V(26, 6), Pose = "sit", Seat = 9, Facing = -1, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "I sit here every evening. The tunnel's dark, but I like to be the first face they see.",
                            "You'll catch a chill, love. Go on home. I'll be here a while yet.",
                            "Some evenings I think I hear it. Then it's only the wind in the cutting.",
                        },
                    },
                    new Person
                    {
                        Id = "bram", At = V(612, 268), Label = "Captain Bram", Spot = V(20, 4), Pose = "look", Facing = -1, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "The old girl's still got steam in her somewhere. You can hear it, if the evening's quiet.",
                            "Dusk's when she looks her best. All that green paint goes gold.",
                            "My father drove her before me. I'd like to see her move once more, that's all.",
                        },
                    },
                    new Person
                    {
                        Id = "mender", At = V(566, 626), Label = "Mender", Spot = V(0, 14), Pose = "hammer", Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "One more piece before dark. The forge doesn't like to go cold.",
                            "Bank the coals right and they'll wake warm. It's all in the banking.",
                            "Off with you before the light goes. The road's darker than it looks.",
                        },
                    },
                },
                Hotspots = new[]
                {
                    West("to_grove", 690, "Into the trees", "grove/from_station"),
                    East("to_square", 960, 686, "To the square", "square/from_station"),
                    new Hotspot { Id = "forge_door", At = V(504, 630), Label = "Forge", Area = R(-10, -30, 20, 36), Spot = V(0, 14), ExitTo = "forge/door", Chapters = AfterDayZero },
                    // the platform's three oil lanterns on their posts, dark since the storm (Night 1 lights them)
                    Lantern(0, 352), Lantern(1, 470), Lantern(2, 660),
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
                    // Night: Sam walks the square's lamps, checking each is lit, and the Baker hauls the morning's flour in
                    // from the cart, since the oven is lit before the birds are up.
                    new Person
                    {
                        Id = "sam", Label = "Sam", Spot = V(-18, 4), Chapters = AfterDayZero, Phases = new[] { Phase.Night },
                        Round = new[]
                        {
                            new Stop { At = V(482, 534), Pose = "look", Facing = -1, Wait = 4f },
                            new Stop { At = V(798, 534), Pose = "look", Facing = 1, Wait = 4f },
                            new Stop { At = V(798, 778), Pose = "look", Facing = 1, Wait = 4f },
                            new Stop { At = V(482, 778), Pose = "look", Facing = -1, Wait = 4f },
                        },
                        Lines = new[]
                        {
                            "Lamp four flickers. I've noted it. I note everything after dark; the dark forgets.",
                            "The hall rule says the square stays lit till dawn. I wrote the rule. I keep it.",
                            "Out late, courier? Mind the fountain's rim. It has claimed better ankles than yours.",
                        },
                    },
                    new Person
                    {
                        Id = "baker", Label = "Baker", Spot = V(0, 12), Chapters = AfterDayZero, Phases = new[] { Phase.Night },
                        Round = new[]
                        {
                            new Stop { At = V(262, 654), Pose = "lift", Facing = -1, Wait = 2.5f, Carry = true },
                            new Stop { At = V(438, 404), Pose = "lift", Facing = -1, Wait = 3f },
                        },
                        Lines = new[]
                        {
                            "Flour for the morning. The oven's lit at four, and four comes sooner than you'd think.",
                            "Shh. The square's asleep. Well, except Sam. Sam is never asleep.",
                            "Here, a heel of yesterday's loaf. Night walking makes a body hungry.",
                        },
                    },
                    // Morning: the Baker is at work in his bakery (see "bakery"), Mia carries crates from home to set
                    // out her vegetable stall, Pip runs letters from the shut post office's
                    // steps to the neighbours' doors, and Sam sweeps outside the hall's door.
                    // Midday: the Baker trades gossip at Mia's stall, Sam reads the notice board (Pip is at the east's
                    // playground). Dusk: the Baker sweeps before the bakery, Mia and Pip are at their door before
                    // dark, and Sam locks the hall.
                    new Person
                    {
                        Id = "mia", Label = "Mia", Spot = V(0, 12), Chapters = NotNightTwo, Phases = new[] { Phase.Morning },
                        Round = new[]
                        {
                            new Stop { At = V(950, 628), Pose = "lift", Facing = -1, Wait = 2.5f, Carry = true },
                            new Stop { At = V(562, 568), Pose = "lift", Facing = -1, Wait = 3f },
                        },
                        Lines = new[]
                        {
                            "Cabbages up front, carrots behind. If Pip runs past you, tell him to stop for breakfast.",
                            "Heavy crate, light heart. That's what my mother said. She never lifted a crate.",
                            "You're the courier? Pip's not stopped talking about you since you came.",
                        },
                    },
                    new Person
                    {
                        Id = "pip", Label = "Pip", Spot = V(0, 12), Chapters = NotNightTwo, Phases = new[] { Phase.Morning },
                        Round = new[]
                        {
                            new Stop { At = V(310, 628), Pose = "lift", Facing = -1, Wait = 2f, Carry = true },
                            new Stop { At = V(1110, 628), Pose = "lift", Facing = -1, Wait = 2f },
                            new Stop { At = V(310, 628), Pose = "lift", Facing = 1, Wait = 2f, Carry = true },
                            new Stop { At = V(140, 628), Pose = "lift", Facing = -1, Wait = 2f },
                        },
                        Lines = new[]
                        {
                            "Letters! The post office is shut, so I carry them myself. One day I'll be a real courier, like you!",
                            "This one's for the hall. Sam always says thank you very properly. I like that.",
                            "Can't stop! Mail waits for no one! That's what couriers say, right?",
                        },
                    },
                    new Person
                    {
                        Id = "sam", At = V(614, 404), Label = "Sam", Spot = V(-18, -4), Pose = "sweep", Facing = 1, Phases = new[] { Phase.Morning },
                        Lines = new[]
                        {
                            "Steps first, then the ledgers. Everything in its order, or nothing can ever be found again.",
                            "Mind the wet step. I've only swept it once, and once is not finished.",
                            "The hall opens at nine. It has opened at nine since 1931. I see no reason to change it.",
                        },
                    },
                    new Person
                    {
                        Id = "baker", At = V(588, 570), Label = "Baker", Spot = V(10, 14), Pose = "talk", Facing = -1, Phases = new[] { Phase.Midday },
                        Lines = new[]
                        {
                            "Mia's carrots, my rolls, and a bit of news for both. That's a fair trade in Bellwood.",
                            "You heard about the city man with the papers? Valdo. Smiles like a shut door.",
                            "Have a roll. No, take it. Ratih's boy doesn't pay in my square.",
                        },
                    },
                    new Person
                    {
                        Id = "mia", At = V(562, 568), Label = "Mia", Spot = V(-6, 16), Pose = "talk", Facing = 1, Phases = new[] { Phase.Midday },
                        Lines = new[]
                        {
                            "Two cabbages for one of his rolls. He thinks he's winning. He isn't.",
                            "Pip's at the playground. If you see him, he's to eat his lunch, not trade it.",
                            "The Baker hears everything first. I hear it second, but I hear it right.",
                        },
                    },
                    new Person
                    {
                        Id = "sam", At = V(838, 572), Label = "Sam", Spot = V(-18, 4), Pose = "look", Facing = 1, Phases = new[] { Phase.Midday },
                        Lines = new[]
                        {
                            "Three notices pinned out of line. I've written to the hall about it. I am the hall, but procedure is procedure.",
                            "The notice board is the village's memory. Somebody has to keep it tidy.",
                            "A lost glove, a found glove. Different gloves. I've pinned them side by side, in hope.",
                        },
                    },
                    new Person
                    {
                        Id = "baker", At = V(470, 404), Label = "Baker", Spot = V(18, -4), Pose = "sweep", Facing = -1, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "Last crumbs swept, last loaf sold. Tomorrow the oven's lit before the birds are up.",
                            "The oven's still warm. I sit by it some nights, like my father did.",
                            "Don't tell Mia, but I keep her carrot loaf for myself on Fridays.",
                        },
                    },
                    new Person
                    {
                        Id = "mia", At = V(1000, 630), Label = "Mia", Spot = V(-18, 8), Facing = 1, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "Home before dark, that's our rule. Pip knows why.",
                            "The sky goes heavy some evenings. Pip holds my hand tighter then.",
                            "Ratih used to sew for half the square. Your mother had the kindest hands in Bellwood.",
                        },
                    },
                    new Person
                    {
                        Id = "pip", At = V(1018, 632), Label = "Pip", Spot = V(18, 8), Facing = -1, Chapters = NotNightTwo, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "Mum says we go in before the sky goes grey. I don't mind. Much.",
                            "Do couriers ever get scared of thunder? Not that I am. I'm just asking.",
                            "Tomorrow I'll carry twice as many letters. You'll see.",
                        },
                    },
                    new Person
                    {
                        Id = "sam", At = V(648, 402), Label = "Sam", Spot = V(-22, 2), Away = true, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "Doors locked, lamps out, ledgers shelved. A day properly closed.",
                            "Good night, Satria. Mind the third step down, it wobbles. I've written to myself about it.",
                            "The archive keeps. Paper is patient, if you let it be.",
                        },
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
                        Lines = new[]
                        {
                            "Little and often, that's the trick with pots. Too much water and they sulk.",
                            "Geraniums like the sun, ferns like the shade, and I like a bit of both.",
                            "Your mother bought red geraniums every spring. Never once let one die.",
                        },
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
                        Lines = new[]
                        {
                            "Bread, carrots, and something pretty for the table. A basket's not full till it has flowers in it.",
                            "The Baker's given me two rolls again. I think he fancies my basket.",
                            "Market days are better than the city. In the city, nobody asks how your knee is.",
                        },
                    },
                    new Person
                    {
                        Id = "florist", Label = "Flower seller", Spot = V(-16, 6), Phases = new[] { Phase.Dusk },
                        Round = new[]
                        {
                            new Stop { At = V(520, 750), Pose = "lift", Facing = 1, Wait = 3f, Carry = true },
                            new Stop { At = V(140, 628), Pose = "lift", Facing = -1, Wait = 3f },
                        },
                        Lines = new[]
                        {
                            "Pots in for the night. They'd keep out here, but I sleep better with them indoors.",
                            "Smell that? Night-scented stock. It saves itself for the evening.",
                            "One more trip and I'm done. My back says two is too many.",
                        },
                    },
                    // Night 1's morning: Valdo on the bench under the oak with his coffee and his land plans.
                    new Person
                    {
                        Id = "valdo", At = V(1040, 755), Seat = 8, Label = "Valdo", Spot = V(0, 20), Pose = "sit", Facing = 1, Chapters = new[] { 1 }, Phases = new[] { Phase.Morning },
                        Lines = new[]
                        {
                            "The investors want the boundary to the inch, Mr Satria. An inch is money.",
                            "Coffee in the country is like everything else here: slow, and slightly cold.",
                        },
                    },
                    // Night 2's morning: Valdo outside the hall with his papers, Mia tying spinach at her stall, and the
                    // marble trio crouched round their ring on the east lawn.
                    new Person
                    {
                        Id = "valdo", At = V(668, 404), Label = "Valdo", Spot = V(18, -4), Pose = "talk", Facing = 1, Chapters = NightTwo, Phases = new[] { Phase.Morning },
                        Lines = new[] { "Papers, Mr Satria. Boundaries, certificates, signatures. The real world." },
                    },
                    new Person
                    {
                        Id = "mia", At = V(552, 570), Label = "Mia", Spot = V(10, 16), Facing = -1, Chapters = NightTwo, Phases = new[] { Phase.Morning },
                        Lines = new[] { "Spinach, three bunches for a coin. Pip's at Grandma Nora's. He won't come out." },
                    },
                    new Person
                    {
                        Id = "gigi", At = V(1068, 892), Label = "Gigi", Spot = V(-24, 6), Pose = "crouch", Facing = 1, Chapters = NightTwo, Phases = new[] { Phase.Morning },
                        Lines = new[] { "Shh! Kiko's aiming. If he misses, it's my go." },
                    },
                    new Person
                    {
                        Id = "kiko", At = V(1126, 890), Label = "Kiko", Spot = V(4, 14), Pose = "crouch", Facing = -1, Chapters = NightTwo, Phases = new[] { Phase.Morning },
                        Lines = new[] { "That big blue one's my shooter. Nobody touches it." },
                    },
                    new Person
                    {
                        Id = "lulu", At = V(1110, 916), Label = "Lulu", Spot = V(0, 16), Pose = "crouch", Facing = 1, Chapters = NightTwo, Phases = new[] { Phase.Morning },
                        Lines = new[] { "I'm not playing. I'm the judge. Judges don't lose." },
                    },
                    // Day 0's dusk: Helen buying the last loaves at the bread stall and Leo chatting by the bench under the
                    // oak, there when Satria comes home.
                    new Person
                    {
                        Id = "helen", At = V(760, 752), Label = "Helen", Spot = V(18, 4), Away = true, Chapters = DayZero, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "Go on home and rest, Satria. The key's under the geranium pot, same as ever.",
                            "The lane's darker than the city, love. Walk the middle and you'll be fine.",
                        },
                    },
                    new Person
                    {
                        Id = "leo", At = V(1088, 764), Label = "Leo", Spot = V(18, 4), Pose = "talk", Facing = -1, Chapters = DayZero, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "Go on, city legs. Your house won't walk to you.",
                            "What, still here? The house is east, past the bridge. You used to know that.",
                        },
                    },
                    new Person
                    {
                        Id = "shopper", At = V(1040, 755), Seat = 8, Label = "Shopper", Spot = V(0, 20), Pose = "sit", Facing = 1, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "Basket full, feet tired. I'll sit under the oak a while before I go in.",
                            "The oak's been here longer than the square. It's heard every secret in Bellwood.",
                            "Evening, courier. Sit. Feet first, news after.",
                        },
                    },
                },
                Hotspots = new[]
                {
                    West("to_station", 640, "To the station", "station/from_square"),
                    East("to_east", 1280, 640, "To the east", "east/from_square"),
                    South("to_coast", 640, 1040, "Down to the coast", "coast/from_square"),
                    new Hotspot { Id = "bakery_door", At = V(477, 392), Label = "Bakery", Area = R(-10, -30, 20, 36), Spot = V(0, 14), ExitTo = "bakery/door", Chapters = AfterDayZero },
                },
            },
            ["east"] = new PlaceDef
            {
                Id = "east",
                Variants = new[] { "day" },
                People = new[]
                {
                    // Night: Grandma Nora sits up on her porch, too old to sleep early; Leo watches the far road from the
                    // lookout till the last lamp on the bend goes out.
                    new Person
                    {
                        Id = "nora", At = V(323, 422), Seat = 8, Label = "Grandma Nora", Spot = V(-23, 24), Pose = "sit", Facing = 1, Chapters = AfterDayZero, Phases = new[] { Phase.Night },
                        Lines = new[]
                        {
                            "Still up, child? So am I. The river talks louder at night, and I like to keep it company.",
                            "Your mother used to slip out on nights like this. She'd sit right where you're standing.",
                            "Go on with your errand. Old women and owls keep the night well enough.",
                        },
                    },
                    new Person
                    {
                        Id = "leo", At = V(882, 157), Floor = 30, Label = "Leo", Spot = V(-4, 55), Pose = "peer", Facing = 1, Chapters = AfterDayZero, Phases = new[] { Phase.Night },
                        Lines = new[]
                        {
                            "The lamp on the far bend's still lit. When it goes out, I go in. That's the deal.",
                            "Don't you sleep, courier? No. Me neither.",
                        },
                    },
                    // Morning: Grandma Nora weaves at the loom out on her deck, the Gardener waters the chamomile rows, and Leo
                    // runs laps of the lane. Midday: Nora still weaves, the Gardener tends the rows behind his glasshouse,
                    // Leo looks out from his lookout. Dusk: Nora sits on her steps, the Gardener rests on the orchard bench,
                    // Leo watches the far road through the telescope.
                    new Person
                    {
                        Id = "nora", At = V(260, 401), Floor = 16, Label = "Grandma Nora", Spot = V(0, 45), Pose = "weave", Facing = 1, Phases = new[] { Phase.Morning },
                        Lines = new[]
                        {
                            "Sit a while if you like, child. The loom goes at its own pace, and so do I.",
                            "Hand me the blue thread. No, that's green. My eyes are older than my hands.",
                            "Your mother sat right there, on that step, when she was small. Swinging her legs.",
                        },
                    },
                    new Person
                    {
                        Id = "nora", At = V(260, 401), Floor = 16, Label = "Grandma Nora", Spot = V(0, 45), Pose = "weave", Facing = 1, Phases = new[] { Phase.Midday },
                        Lines = new[]
                        {
                            "My mother taught me this pattern, and her mother before her. The thread remembers what we forget.",
                            "Every knot is someone. That one's the Baker. That loose one is Leo, always running off.",
                            "Midday light is good for blues. Evening light lies about blues.",
                        },
                    },
                    new Person
                    {
                        Id = "nora", At = V(323, 422), Seat = 8, Label = "Grandma Nora", Spot = V(-23, 24), Pose = "sit", Facing = 1, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "Evenings are the best part. The river talks, and I listen. Sit, if your legs are tired.",
                            "Listen. Hear how the river slows at dusk? It's thinking about the day.",
                            "I'm too old to sleep early. Sleep's for people with less to remember.",
                        },
                    },
                    // Night 2: Pip huddled on Grandma Nora's steps all day, hugging his knees; at midday the Gardener at
                    // the gate of his chamomile field.
                    new Person
                    {
                        Id = "pip", At = V(345, 424), Seat = 8, Label = "Pip", Spot = V(20, 20), Pose = "sit", Facing = -1, Chapters = NightTwo, Phases = new[] { Phase.Morning, Phase.Midday, Phase.Dusk },
                        Lines = new[] { "...Go away. The storm's coming back. I can hear it in the pines." },
                    },
                    new Person
                    {
                        Id = "gardener", At = V(392, 294), Label = "Gardener", Spot = V(20, 4), Facing = -1, Chapters = NightTwo, Phases = new[] { Phase.Midday },
                        Lines = new[] { "Chamomile for sleep, for frights, for the smell of a house that's missed someone." },
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
                        Lines = new[]
                        {
                            "Chamomile won't be hurried. Water, wait, and one morning it simply opens.",
                            "Morning's the time for watering. The sun drinks it all by noon.",
                            "Mind the third row, those are new. Babies, all of them.",
                        },
                    },
                    new Person
                    {
                        Id = "gardener", At = V(790, 604), Label = "Gardener", Spot = V(18, 0), Pose = "tend", Facing = -1, Chapters = NotNightTwo, Phases = new[] { Phase.Midday },
                        Lines = new[]
                        {
                            "Tomatoes under glass, cabbages out here. Everything mends at its own pace. People too.",
                            "Pull a weed and two come to its funeral. Gardening is patience, mostly.",
                            "The glasshouse panes came from the old station. Your father brought them, you know.",
                        },
                    },
                    new Person
                    {
                        Id = "gardener", At = V(513, 447), Seat = 8, Label = "Gardener", Spot = V(36, 8), Pose = "sit", Facing = 1, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "The watering's done. Now I sit, and the orchard grows without my help.",
                            "The farmhand says twelve crates. I counted eleven and a half. We'll see.",
                            "Listen to the orchard settle. Trees sigh at dusk, if you're quiet.",
                        },
                    },
                    new Person
                    {
                        Id = "leo", Label = "Leo", Spot = V(0, 12), Phases = new[] { Phase.Morning },
                        Round = new[]
                        {
                            new Stop { At = V(120, 472), Facing = 1, Wait = 2f, Run = true },
                            new Stop { At = V(880, 482), Facing = -1, Wait = 2f, Run = true },
                        },
                        Lines = new[]
                        {
                            "Lap nine! Still the fastest legs in Bellwood. Ask anyone. Well, anyone old enough to remember.",
                            "Lap ten! You could try keeping up, courier. No? Thought not.",
                            "Don't time me. I stopped letting people time me a long while back.",
                        },
                    },
                    new Person
                    {
                        Id = "leo", At = V(856, 236), Label = "Leo", Spot = V(-20, 4), Pose = "look", Facing = -1, Phases = new[] { Phase.Midday },
                        Lines = new[]
                        {
                            "Up here I can see every road in the valley. Every road a runner could take.",
                            "Bus comes twice a week. I see it coming before anyone. Habit.",
                            "Go on, ask me something. I'll pretend not to hear and you can pretend I'm busy.",
                        },
                    },
                    new Person
                    {
                        Id = "leo", At = V(882, 157), Floor = 30, Label = "Leo", Spot = V(-4, 55), Pose = "peer", Facing = 1, Chapters = AfterDayZero, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "Sun's going. I watch the far road till the lamps come on. Old habit. Don't ask.",
                            "The lamps take a while to reach the far bend. I wait for that one.",
                            "Don't stand behind me. I don't like people behind me when I'm watching the road.",
                        },
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
                        Lines = new[]
                        {
                            "The wind does half my picking. I just come along after and say thank you.",
                            "Fill a crate, carry a crate, empty a crate. Like counting sheep, but with apples.",
                            "The Gardener counts wrong. Don't tell him I said that. Do tell him, actually.",
                        },
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
                        Lines = new[]
                        {
                            "Fresh honeydew for Grandma Nora. She says it keeps her fingers quick at the loom.",
                            "They're gentle things, aphids. You just have to be gentler.",
                            "Shh, they're napping. They nap a lot. I'm jealous.",
                        },
                    },
                    new Person
                    {
                        Id = "farmhand", At = V(541, 447), Seat = 8, Label = "Farmhand", Spot = V(20, 8), Pose = "sit", Facing = -1, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "Twelve crates today. The Gardener says eleven. We'll argue it out till dark.",
                            "Eleven and a half? Who leaves half a crate? He's counting the apple I ate.",
                            "Evening, courier. Sit. Argue with us. We've run out of new things to argue about.",
                        },
                    },
                    new Person
                    {
                        Id = "herder", Label = "Aphid herder", Spot = V(0, 14), Phases = new[] { Phase.Dusk },
                        Round = new[]
                        {
                            new Stop { At = V(500, 714), Pose = "tend", Facing = 1, Wait = 5f },
                            new Stop { At = V(548, 714), Pose = "tend", Facing = -1, Wait = 5f },
                        },
                        Lines = new[]
                        {
                            "Counting them in for the night. They wander, the little ones, same as children.",
                            "Forty-one, forty-two... You made me lose count. Forty... one?",
                            "Night comes, the little ones huddle. They know something we've forgotten.",
                        },
                    },
                    // Day 0's dusk: Theo at the bridge's rail, there to wave Satria in.
                    new Person
                    {
                        Id = "theo", At = V(186, 456), Label = "Theo", Spot = V(-18, 6), Pose = "look", Facing = 1, Chapters = DayZero, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "The sea wind never changes here, Satria. Nor do we, much.",
                            "Your father would have liked to see you here. That's all I'll say.",
                        },
                    },
                    // Day 0, once the square has welcomed Satria: Valdo, the city's land agent, waiting by the waymark at
                    // the road's turn into the East to catch him on his way home.
                    new Person
                    {
                        Id = "valdo", At = V(72, 452), Label = "Valdo", Spot = V(18, 6), Facing = -1, After = "welcomed", Chapters = DayZero, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "The morning of Day Eight, Mr Satria. The investors don't like waiting. Nor do I.",
                            "A sensible man signs early, Mr Satria. Sentiment is expensive.",
                            "Good evening. I trust the house is as dreary as the photographs.",
                        },
                    },
                    // Midday: Pip on his break at the playground, dashing between the slide and the swing.
                    new Person
                    {
                        Id = "pip", Label = "Pip", Spot = V(0, 12), Chapters = NotNightTwo, Phases = new[] { Phase.Midday },
                        Round = new[]
                        {
                            new Stop { At = V(360, 628), Facing = 1, Wait = 3f, Run = true },
                            new Stop { At = V(474, 622), Facing = -1, Wait = 4f, Run = true },
                        },
                        Lines = new[]
                        {
                            "I'm not playing, I'm on my break! Couriers get breaks, don't they?",
                            "Push me on the swing? Just once. Couriers are strong.",
                            "When I'm big I'll run the post office. Mum says somebody has to open it.",
                        },
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
                    // Night: Arlo fishes off the jetty's end by lantern; the fish bite best when the village is asleep.
                    new Person
                    {
                        Id = "arlo", At = V(514, 754), Label = "Arlo", Spot = V(-16, -6), Pose = "fish", Facing = 1, Chapters = AfterDayZero, Phases = new[] { Phase.Night },
                        Lines = new[]
                        {
                            "Night fishing. The big ones only come up when they think we're all asleep.",
                            "Quiet now. Hear that? The sea breathing. In, and out.",
                            "The lighthouse used to sweep right across here. I still wait for it to come round.",
                        },
                    },
                    // Theo photographs the sea from the bluff in the morning, waits out the flat noon light at his studio door,
                    // and shoots the sunset by the rope bridge's remains. Arlo fishes off the jetty, mends his net on the
                    // street at midday, and sits at the jetty's end at dusk.
                    new Person
                    {
                        Id = "theo", At = V(400, 228), Label = "Theo", Spot = V(-18, 4), Pose = "photo", Facing = 1, Phases = new[] { Phase.Morning },
                        Lines = new[]
                        {
                            "The light off the sea is honest at this hour. It doesn't flatter anyone.",
                            "Don't stand in my frame. Or do. People make better pictures than sea, mostly.",
                            "I've photographed this coast ten thousand times. It's never the same twice.",
                        },
                    },
                    new Person
                    {
                        Id = "theo", At = V(278, 216), Label = "Theo", Spot = V(-16, 2), Pose = "look", Facing = -1, Phases = new[] { Phase.Midday },
                        Lines = new[]
                        {
                            "Too bright. Everything goes flat at noon. I'll wait for the light to come back.",
                            "Noon's for mending things. Lenses, nets, grudges.",
                            "You've a face for the camera, Satria. Your father had it too. Stubborn, in the jaw.",
                        },
                    },
                    new Person
                    {
                        Id = "theo", At = V(124, 226), Label = "Theo", Spot = V(-22, 4), Pose = "photo", Facing = -1, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "Sunsets are easy to photograph. That's why I keep trying to get one right.",
                            "Hold still. No, the sun, not you.",
                            "The darkroom's locked. It stays locked. Don't ask about the darkroom.",
                        },
                    },
                    new Person
                    {
                        Id = "arlo", At = V(514, 754), Label = "Arlo", Spot = V(-16, -6), Pose = "fish", Facing = 1, Phases = new[] { Phase.Morning },
                        Lines = new[]
                        {
                            "Tide's turning. Fish bite when the water changes its mind. Sit quiet and you'll see.",
                            "Never shout on a jetty. The fish hear it, and worse, the sea does.",
                            "Sit quiet with me a minute. A minute is all the sea ever asks for.",
                        },
                    },
                    new Person
                    {
                        Id = "arlo", At = V(606, 452), Label = "Arlo", Spot = V(-18, 6), Pose = "tend", Facing = 1, Phases = new[] { Phase.Midday },
                        Lines = new[]
                        {
                            "Every knot's a promise to the next storm. I keep my promises.",
                            "Pull that end. Firmer. There. Now the storm has to argue with both of us.",
                            "My father knotted nets on this very spot. Same knots. Better hands.",
                        },
                    },
                    new Person
                    {
                        Id = "arlo", At = V(506, 759), Label = "Arlo", Spot = V(-8, -10), Pose = "sit", Facing = 1, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "End of the day, the sea goes quiet. Best time to think, if you've got thinking to do.",
                            "See that light on the point? Lighthouse hasn't been lit in years. I still look for it.",
                            "Go on home, lad. The tide doesn't need watching. I just like to.",
                        },
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
                        Lines = new[]
                        {
                            "Arlo catches them, I carry them. He says that makes him the brains. I say it makes me the back.",
                            "Mind the wet planks, they're slicker than they look.",
                            "Good haul today. Arlo says it's skill. It's mostly tide.",
                        },
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
                        Lines = new[]
                        {
                            "The sea leaves the salt and I fetch it in. A fair arrangement. The sea's never once complained.",
                            "Rake slow, rake even. Salt's like people, it doesn't like being rushed.",
                            "My hands taste of the sea all year. My wife says it's romantic. My wife is lying.",
                        },
                    },
                    new Person
                    {
                        Id = "fisher", At = V(230, 592), Seat = 6, Label = "Fisher", Spot = V(0, -14), Pose = "sit", Facing = 1, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "Crates washed, rack full. Now I sit and watch the water do nothing for a while.",
                            "Evening's when the gulls give up arguing. Peaceful.",
                            "Sit, if you want. The sand's still warm.",
                        },
                    },
                    new Person
                    {
                        Id = "salter", At = V(236, 470), Label = "Salt worker", Spot = V(0, 14), Pose = "sweep", Facing = 1, Phases = new[] { Phase.Dusk },
                        Lines = new[]
                        {
                            "Salt gets everywhere. Into the step, into the door, into my dreams.",
                            "Sweep it out, it blows back in. That's the coast for you.",
                            "Off home soon. The salt will still be here in the morning. It always is.",
                        },
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
                // by the bed, where the night's bell wakes him
                Spawns = new() { ["bed"] = V(799, 384) },
                Hotspots = new[]
                {
                    new Hotspot { Id = "door", At = V(877, 440), Label = "Outside", Area = R(-16, -10, 32, 12), Spot = V(0, -6), ExitTo = "east/satria_home_door" },
                    // what Satria finds of his family: their photo over the sofa, Father's radio, Mother's sewing
                    // machine, the kitchen's water jar, and the bed he sleeps in; and what each night's routine uses: the
                    // walnut table the night's box is set on, the coil lit before sleep, the desk where he writes his
                    // journal, the stove where the morning's tea is made
                    new Hotspot { Id = "photo", At = V(892, 349), Label = "Family photo", Area = R(-24, -86, 48, 32), Spot = V(0, 26) },
                    new Hotspot { Id = "radio", At = V(905, 393), Label = "Radio", Area = R(-9, -31, 18, 18), Spot = V(0, 11) },
                    new Hotspot { Id = "sewing", At = V(785, 408), Label = "Sewing machine", Area = R(-24, -29, 48, 30), Spot = V(14, 10) },
                    new Hotspot { Id = "water_jar", At = V(979, 418), Label = "Water jar", Area = R(-10, -24, 20, 24), Spot = V(0, 10) },
                    new Hotspot { Id = "bed", At = V(785, 378), Label = "Bed", Area = R(-36, -56, 55, 54), Spot = V(14, 6) },
                    new Hotspot { Id = "table", At = V(947, 396), Label = "Table", Area = R(-20, -24, 40, 24), Spot = V(0, 12), Chapters = Nights },
                    new Hotspot { Id = "coil", At = V(805, 382), Label = "Mosquito coil", Area = R(-7, -9, 14, 10), Spot = V(10, 6), Chapters = Nights },
                    new Hotspot { Id = "desk", At = V(822, 362), Label = "Desk", Area = R(-16, -24, 32, 24), Spot = V(0, 16), Chapters = Nights },
                    new Hotspot { Id = "stove", At = V(975, 364), Label = "Stove", Area = R(-12, -26, 24, 26), Spot = V(0, 36), Chapters = Nights },
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
            // The Baker's bakery on the square, cut open: the dome oven and its flour sacks, the dough table, the bread
            // shelves and the counter. Mornings he is at work in it: kneading, a tray out of the oven, loaves onto the
            // shelves.
            ["bakery"] = new PlaceDef
            {
                Id = "bakery",
                Variants = new[] { "day" },
                Indoors = true,
                Open = true,
                WoodFloor = true,
                People = new[]
                {
                    new Person
                    {
                        Id = "baker", Label = "Baker", Spot = V(0, 12), Phases = new[] { Phase.Morning },
                        Round = new[]
                        {
                            new Stop { At = V(431, 360), Pose = "knead", Facing = 1, Wait = 8f },
                            new Stop { At = V(380, 346), Pose = "lift", Facing = -1, Wait = 2.5f, Carry = true },
                            new Stop { At = V(483, 324), Pose = "lift", Facing = 1, Wait = 2.5f },
                        },
                        Lines = new[]
                        {
                            "Morning! First batch is out. Take a roll, they're better warm. So is the news.",
                            "Rye on Tuesdays, seed loaf on Thursdays, and gossip every day, free.",
                            "Mind the oven, lad, she bites. Forty years and she still bites me.",
                        },
                    },
                },
                Hotspots = new[]
                {
                    new Hotspot { Id = "door", At = V(477, 392), Label = "Back outside", Area = R(-16, -10, 32, 12), Spot = V(0, -6), ExitTo = "square/bakery_door" },
                    new Hotspot { Id = "oven", At = V(373, 338), Label = "Oven", Area = R(-24, -34, 48, 34), Spot = V(7, 8), Text = "The brick dome oven, black at the mouth from forty years of mornings. The heat of it reaches right across the room." },
                    new Hotspot { Id = "flour", At = V(355, 358), Label = "Flour sacks", Area = R(-12, -18, 24, 18), Spot = V(22, -2), Text = "Sacks of wheat flour from the mill upriver, the top one already open and half scooped." },
                    new Hotspot { Id = "dough_table", At = V(433, 354), Label = "Dough table", Area = R(-26, -16, 52, 16), Spot = V(-2, 6), Text = "A scrubbed table white with flour: the spruce basin, a sieve, and a round of dough resting under a cloth." },
                    new Hotspot { Id = "wash_bucket", At = V(466, 360), Label = "Bucket", Area = R(-6, -12, 12, 12), Spot = V(12, 4), Text = "A bucket of clean water, for floury hands. And floury faces, by the look of the towel." },
                    new Hotspot { Id = "bread", At = V(500, 316), Label = "Bread shelves", Area = R(-25, -40, 50, 40), Spot = V(-17, 8), Text = "Rows of round loaves and sweet buns on the shelves, still warm enough to smell from the door." },
                    new Hotspot { Id = "recipe_book", At = V(513, 342), Label = "Recipe book", Area = R(-16, -14, 32, 14), Spot = V(0, 10), Text = "The Baker's recipe book, open on the counter. The handwriting changes three times over its pages: his grandmother's, his mother's, his." },
                },
            },
            // The Mender's forge by the line, cut open: the hearth and its bellows, the quench tub, the rail anvil, the
            // tool rack, the gear bench under the window, the shelf of old parts and the brass plates of 1952, the resin
            // heater and the shoe press. On the days the story brings him work he is in it at midday.
            ["forge"] = new PlaceDef
            {
                Id = "forge",
                Variants = new[] { "day" },
                Indoors = true,
                Open = true,
                People = new[]
                {
                    new Person
                    {
                        Id = "mender", Label = "Mender", Spot = V(16, 0), Chapters = ForgeDays, Phases = new[] { Phase.Midday },
                        Round = new[]
                        {
                            new Stop { At = V(514, 580), Pose = "tinker", Facing = 1, Wait = 9f },
                            new Stop { At = V(410, 584), Away = true, Wait = 3f },
                            new Stop { At = V(472, 596), Pose = "hammer", Facing = -1, Wait = 5f },
                        },
                        Lines = new[]
                        {
                            "Come in, come in. Mind the sparks, they don't mind you.",
                            "Everything in here is broken or about to be mended. Sometimes both.",
                            "The hearth's been lit since before you were born, lad. I just keep it fed.",
                        },
                    },
                },
                Hotspots = new[]
                {
                    new Hotspot { Id = "door", At = V(504, 630), Label = "Back outside", Area = R(-16, -10, 32, 12), Spot = V(0, -6), ExitTo = "station/forge_door" },
                    new Hotspot { Id = "hearth", At = V(409, 574), Label = "Hearth", Area = R(-20, -40, 40, 40), Spot = V(1, 10), Text = "The forge hearth, banked low. The coals breathe orange under the ash whenever the door lets the wind in." },
                    new Hotspot { Id = "bellows", At = V(436, 570), Label = "Bellows", Area = R(-7, -10, 14, 10), Spot = V(10, 8), Text = "Leather bellows, patched so often there is more patch than bellows." },
                    new Hotspot { Id = "quench_tub", At = V(422, 606), Label = "Quench tub", Area = R(-8, -12, 16, 12), Spot = V(0, 8), Text = "A tub of black water with a skin of scale on it. It smells of hot iron and rain." },
                    new Hotspot { Id = "anvil", At = V(454, 600), Label = "Anvil", Area = R(-9, -16, 18, 16), Spot = V(0, 6), Text = "Not an anvil at all: a length of the old line's rail, cut and stood on a stump. Polished bright on top from hammering." },
                    new Hotspot { Id = "gear_bench", At = V(515, 572), Label = "Gear bench", Area = R(-21, -18, 42, 18), Spot = V(-1, 8), Text = "A green baize bench under the window, a lens on a jointed arm over it and brass gears laid out in rows, smallest to largest." },
                    new Hotspot { Id = "parts_shelf", At = V(553, 558), Label = "Parts shelf", Area = R(-13, -40, 26, 40), Spot = V(-23, 20), Text = "Shelves of old parts: hinges, springs, a tin of rivets. On the top shelf, brass plates stamped BELLWOOD 1952." },
                    new Hotspot { Id = "resin_heater", At = V(552, 584), Label = "Resin heater", Area = R(-7, -14, 14, 14), Spot = V(-22, 0), Text = "A little brazier with a pot of resin warming on it, sweet and sharp, like pine after rain." },
                    new Hotspot { Id = "shoe_press", At = V(554, 604), Label = "Shoe press", Area = R(-7, -20, 14, 20), Spot = V(-24, 0), Text = "A wooden shoe press, its screw worn smooth. There's a shoe in it now, waiting for its new sole." },
                },
            },
        };
    }
}
