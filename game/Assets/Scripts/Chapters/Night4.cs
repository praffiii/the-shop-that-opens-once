using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Night 4, The Key With No Engraving (the word: Preserving). The first rain: the fourth bell strikes in a drizzle,
    /// and Marlow's fourth box, carved SAM, holds a plain black iron key with four stepped notches and nothing engraved
    /// on it. In the hall's lobby next morning, under the leaks, the village says Sam has been carrying buckets down to
    /// the flooding archive since yesterday; Valdo takes the key for a treasure-safe's; Captain Bram, under his paper
    /// on the platform, knows it for a 1952 fireproof archive-vault key, and only one door takes it, under the hall. At
    /// midday the rain stops, and in the basement Sam is at a jammed pump with the water at his ankles: the flood is
    /// pumped out and vault No. 7 opened (minigame 4A), then the soaked sheets saved at his table (minigame 4B). At dusk
    /// Sam shows him the 1952 disaster train's register: ticket 041, Daniel, Ratih and little Satria, given up at their
    /// own wish. On the hall's steps with the last light, the key goes back to Sam.
    /// </summary>
    public sealed class Night4 : NightChapter
    {
        /// <summary>The hall's front steps on the square, where Sam takes his key with the last of the light.</summary>
        static readonly Vector2 Steps = new(622, 406);
        /// <summary>Where Sam stands back from his pump, out of the courier's way, to watch the gauge.</summary>
        static readonly Vector2 Aside = new(196, 118);

        public Night4(Main main) : base(main) { }

        protected override int Night => 4;
        protected override string Title => "The Key With No Engraving";
        protected override string Word => "Preserving";
        protected override string Page =>
            "In the city, paper is the cheapest thing there is. Receipts in the gutter, bus tickets crumpled in a pocket, handbills trodden into the pavement by a thousand feet.\n\n" +
            "But today one yellowed sheet, twenty years old, that Sam kept safe from the flood weighed more than a block of coral.\n\n" +
            "Preserving isn't hoarding dusty archives. It's a promise to look after the truth, so the ones who come after us don't grow up proud, and forget what was given up for them.";
        protected override string WakeLine => "...Four strokes. And rain on the tiles.";
        protected override string MorningLine => "Grey sky, and the drizzle still on the grass. Tea first. Then the village hall.";
        protected override string DayErrand => "The village hall, on the square.";
        protected override string Breakfast => "A packet by the door, out of the drizzle: smoked fish from the coast, and a sprig of Daniel's mint for the tea. No note. Theo doesn't write notes.";

        /// <summary>The key as the day leaves it: cold and rusty, then worn bright by the vault's tumblers.</summary>
        protected override string Keepsake => Game.Bag.Contains("key_turned") ? "key_turned" : "key";

        protected override string Asking => "Do you know what door a key like this would open?";

        // Asked round about the key: it is railway iron from a vault-maker, and Captain Bram knew every lock on the line.
        static readonly Dictionary<string, Reaction> Asked = new()
        {
            ["neighbour_a"] = new("No mark on it at all? Every door in this hall takes a brass key. That's railway iron, that is.", "surprised", "A neighbour at the hall: its doors take brass keys. This key is railway iron."),
            ["neighbour_b"] = new("Captain Bram would know it. He knew every lock on the old line, and he never lets you forget it.", "smile", "A neighbour at the hall: Captain Bram knew every lock on the old line."),
            ["porter"] = new("Railway forging, that bit. The Captain's on the platform bench with his paper. He'll tell you more than you want to know.", "smile", "The porter: Captain Bram sits on the platform bench with his paper."),
            ["mender"] = new("I didn't make that, and nobody on this island did. City iron, a vault-maker's. Fireproof doors took keys like it.", "neutral", "The Mender: a vault-maker's key, from a fireproof door."),
            ["helen"] = new("Bram had a ring of keys like that once, when he ran the line. Heavy enough to sink him.", "smile"),
            ["mia"] = new("Four notches... my grandmother's pantry had a key like that. No, hers had three. Ask someone older than me!", "smile"),
            ["pip"] = new("Is it a treasure key? Mr Valdo said treasure. I heard him through the window.", "surprised"),
            ["baker"] = new("Rain on the ovens and now a mystery key. Captain Bram's the one for railway iron, if that's what it is."),
            ["florist"] = new("Cold as a fish, that. Whatever it opens has been shut a long time."),
            ["shopper"] = new("With the hall flooding, love? Poor Sam's got enough to worry about without riddles."),
            ["leo"] = new("Heavy iron. The old station had doors like that, down in the signal house. Ask the Captain.", "neutral", "Leo: the old station had iron doors like this. Ask the Captain."),
            ["nora"] = new("Some keys wait for the right hands, child, same as thread does.", "smile"),
            ["theo"] = new("A key with no name... Nobody marks a key when everybody knows its door.", "sad"),
            ["arlo"] = new("Not a ship's key. A ship's key's brass, so the salt can't have it."),
            ["fisher"] = new("Rust like that comes from damp, not sea. Somewhere underground, I'd say."),
            ["salter"] = new("That's not from the coast. Ask up at the station."),
            ["gardener"] = new("The rain's done my seedlings no favours, and now keys. Ask Bram, he's got keys for everything."),
        };
        protected override Dictionary<string, Reaction> Reactions => Asked;

        // The drizzle starts with the bell and lasts the night and the morning; it stops as the day turns to midday.
        public override Awaitable Start()
        {
            Main.Raining = true;
            return base.Start();
        }

        public override Awaitable Resume(string checkpoint)
        {
            Main.Raining = checkpoint == "morning";
            return base.Resume(checkpoint);
        }

        protected override async Awaitable AtShop()
        {
            var fetching = FetchBox(3);
            await Say("marlow", "Four strokes, and the first rain of the year with them. Shake yourself off by the stove.");
            await fetching;
            await HandOver();
            await Say("courier", "SAM, on the lid.", "surprised");
            await Say("marlow", "Open it.");
        }

        // What Marlow says of the key with no engraving.
        protected override async Awaitable Opened()
        {
            await Say("courier", "A key with no engraving? Which door is it for? Nearly every house in Bellwood shuts with a wooden bolt.", "puzzled");
            await Say("marlow", "Some doors are never locked from outside, Satria. They are locked from inside, by people's fear of their own past.");
            await Say("courier", "Sam... the archivist at the village hall?", "puzzled");
            await Say("marlow", "Sam keeps thousands of sheets. But he has locked away the one that decided your family's road. Take this key to the hall before the seeping water ruins those records for good.");
        }

        protected override async Awaitable ResumeDay(string checkpoint)
        {
            switch (checkpoint)
            {
                case "midday":
                    await Go("hall", "door");
                    Hint("Down the hall's stair, to Sam's archive.");
                    break;
                case "dusk":
                    await Go("hall_vault", "stair");
                    Hint("Sam is at his table, with a leather folder.");
                    break;
                default:
                    await Start();
                    break;
            }
        }

        public override string Closed(string id) =>
            id == "stair" && Main.Place.Def.Id == "hall" && !Game.Has("bram_lead") ? "A rope across the stair, and a card on it in Sam's square hand: ARCHIVE CLOSED. FLOODING." : base.Closed(id);

        protected override async Awaitable Arrived(string place)
        {
            switch (place)
            {
                // on the way to the shop, the one new sight: the rain standing in puddles between the old sleepers
                case "station" when Game.Phase == Phase.Night && !Game.Has("boxed") && !Game.Has("saw_puddles"):
                    Game.Mark("saw_puddles");
                    await ShowText("Rain hisses on the platform's flagstones and beads on the mossy sleepers beyond. Puddles stand black in the road, each holding a little of his lantern.");
                    break;
                // out of the shop with the key
                case "grove" when Game.Has("boxed") && !Game.Has("doubted"):
                    Game.Mark("doubted");
                    await Scene(async () =>
                    {
                        Actor("courier").FaceTo(0);
                        await Wait(0.6f);
                        await Say("courier", "The one document that decided my family's road... I always thought they called off the move to the city over money. Or that they just missed the train.");
                        await Say("courier", "Has the hall been hiding something for twenty years?");
                        await Say("courier", "If I talk about this key at the market, there'll be whispers at the hall, or they'll think I've gone mad, wandering about at midnight with a lump of scrap iron. Keep it quiet. Go to the hall in the morning, and see what's really happening in Sam's archive.");
                    });
                    break;
                // the lobby's tiles wet under the leaks, and two neighbours by the buckets
                case "hall" when Game.Phase == Phase.Morning && !Game.Has("rumour"):
                    Game.Mark("rumour");
                    Sfx("drip");
                    await Say("neighbour_a", "Mr Sam's been running buckets down to the basement since yesterday... last night's rain's brought the groundwater up into the old archive vault!");
                    await Say("neighbour_b", "If that archive floods, the colony's founding records will be paper pulp...");
                    Note("In the hall: groundwater is seeping into the archive under it, and Sam has been carrying buckets down since yesterday.");
                    Hint("Someone in the village might know what door this key is for. Show it round.");
                    break;
                // the plea at the stair's foot: the pump jammed, the water rising, and the vault's key lost twenty years ago
                case "hall_vault" when Game.Phase == Phase.Midday && !Game.Has("plea"):
                    await Plea();
                    break;
                // back down after the flood is out: Sam is at his table with the soaked sheets, not the pump
                case "hall_vault" when Game.Phase == Phase.Midday && Game.Has("drained"):
                    var sam = Actor("sam");
                    sam.Feet = Anchor("sam_table");
                    sam.Pose = "read";
                    break;
            }
        }

        protected override async Awaitable Day(string id)
        {
            switch (id)
            {
                case "valdo" when Game.Phase == Phase.Morning && !Game.Has("asked_valdo"):
                    await Valdo();
                    break;
                case "bram" when Game.Phase == Phase.Morning && !Game.Has("bram_lead"):
                    await Bram();
                    break;
                case "sam" or "vault" when Game.Phase == Phase.Midday && !Game.Has("drained"):
                    await Say("sam", "The pump first, Satria! Steady strokes, like a heartbeat. Push it too hard and the valve jams.", "surprised");
                    break;
                case "pump" when Game.Has("plea") && !Game.Has("drained"):
                    await Pump();
                    break;
                case "sam" or "table" when Game.Phase == Phase.Midday && Game.Has("drained"):
                    await Restore();
                    break;
                case "sam" when Game.Phase == Phase.Dusk && !Game.Has("resolved"):
                    await Register();
                    break;
                default:
                    await base.Day(id);
                    break;
            }
        }

        // The key shown at the counter: Valdo takes it for a treasure-safe's key, and wants it.
        async Awaitable Valdo()
        {
            Game.Mark("asked_valdo");
            await Scene(async () =>
            {
                var valdo = Actor("valdo");
                var courier = Actor("courier");
                await Say("courier", "Mr Valdo, is a key like this common, for village doors?");
                valdo.Pose = "shocked";
                valdo.FaceTo(courier.Feet.x);
                courier.Held = Keepsakes.Art("key", "xs");
                courier.Pose = "give";
                await Say("valdo", "Old forged iron, and no mark on it... Mr Satria, that could be the key to your late mother's jewellery safe! Gold, hidden from the taxman!");
                valdo.Pose = "receive";
                await Say("valdo", "Where did you find it? Hand it here. I'll keep it at the office, as security on the land deal.", "smile");
                courier.Held = null;
                courier.Pose = "idle";
                valdo.Pose = "idle";
                await Say("courier", "None of your business, Mr Valdo.");
                valdo.Pose = "write";
                Note("Valdo took the key for a treasure-safe's and tried to keep it. A dead end.");
            });
            Hint("Valdo only wants it for himself. Someone who knows old railway iron, then.");
        }

        // Under his paper on the platform bench, Captain Bram knows the key: the day moves to midday, and the rain stops.
        async Awaitable Bram()
        {
            Game.Mark("bram_lead");
            await Scene(async () =>
            {
                var bram = Actor("bram");
                await Say("courier", "Captain, was a four-notch key like this made in the station's workshop?");
                bram.Pose = "look";
                await Wait(0.6f);
                await Say("bram", "Hahaha! That's no house key, lad. That's a fireproof archive-vault key, steam railway service standard, 1952!", "smile");
                await Say("bram", "In all Bellwood only one door takes a cylinder like that: the store under the village hall, where Sam works. But hurry. The estuary's coming up the basement drains.");
                bram.Pose = "read";
                Note("Captain Bram: a 1952 railway fireproof archive-vault key. Only one door in Bellwood takes it: the store under the village hall.", keep: true);
            });
            Main.Raining = false;
            await MovePhase(Phase.Midday);
            Checkpoint("midday");
            Hint("The rain has stopped. The hall's stair, down to Sam's archive.");
        }

        // At the stair's foot Sam is at the jammed pump, the water at his ankles.
        async Awaitable Plea()
        {
            Game.Mark("plea");
            await Scene(async () =>
            {
                var sam = Actor("sam");
                var courier = Actor("courier");
                courier.FaceTo(sam.Feet.x);
                Sfx("drip");
                await Look((sam.Feet + courier.Feet) / 2);
                await Say("courier", "Mr Sam! Do you need a hand?!", "surprised");
                sam.Pose = "panic";
                sam.FaceTo(courier.Feet.x);
                await Say("sam", "Satria! By all the paper in history! The estuary seep's up to my ankles, and the pump's jammed!", "surprised");
                await Say("sam", "And the vault's main key went missing in a clear-out twenty years ago. Five more centimetres and thousands of the colony's papers run for ever!", "surprised");
                await Say("courier", "Mr Sam... I think I might have it.");
                courier.Held = Keepsakes.Art("key", "xs");
                courier.Pose = "give";
                await Wait(0.8f);
                courier.Held = null;
                courier.Pose = "idle";
                await Say("sam", "Four notches... That's it. That's the key to vault No. 7! The water first, Satria. The pump!", "moved");
                sam.Pose = "pump";
                await Look(null);
                Note("Sam: the vault's key was lost in a clear-out twenty years ago, the pump is jammed, and five more centimetres will ruin thousands of papers.");
            });
            Hint("The pump, then the vault's lock.");
        }

        // Minigame 4A: the flood pumped out down the culvert, then the key turned in vault No. 7's four tumblers.
        async Awaitable Pump()
        {
            await Scene(async () =>
            {
                var sam = Actor("sam");
                sam.Pose = "idle";
                var stepping = Walk("sam", Aside);
                await Walk("courier", Main.Place.Find("pump").GlobalSpot);
                Actor("courier").FaceTo(Main.Place.Find("pump").Position.x);
                await stepping;
                sam.FaceTo(Actor("courier").Feet.x);
                await Say("sam", "Steady, now. Like a heartbeat. Then the key, and listen for each tumbler.");
            });
            await Play(new VaultPump());
            Game.Mark("drained");
            Swap("key", "key_turned");
            Main.Place.FollowStory();
            await Scene(async () =>
            {
                var sam = Actor("sam");
                await Look((Anchor("vault") + sam.Feet) / 2);
                await ShowText("The water runs off down the culvert. Vault No. 7 stands open for the first time in twenty years, its iron archive box dry on the shelf.");
                await Say("sam", "Open... After twenty years...", "moved");
                await Look(null);
                sam.Pose = "idle";
                await Walk("sam", Anchor("sam_table"));
                sam.FaceTo(Anchor("table").x);
                await Say("sam", "But the bottom shelf caught the seep. The bridge's plans, the rescue register... the ink's lifting off them. Quickly, before it runs!", "surprised");
                sam.Pose = "read";
                await Look(null);
            });
            Hint("Sam's table: the soaked sheets, before the ink runs.");
        }

        // Minigame 4B at Sam's table: the bridge's blueprint blotted, the map's three pieces joined, the ink fanned dry.
        async Awaitable Restore()
        {
            await Scene(async () =>
            {
                await Walk("courier", Main.Place.Find("table").GlobalSpot);
                Actor("courier").FaceAway();
                await Say("sam", "Blot, never rub. Paper this old remembers every crease.");
            });
            await Play(new BlueprintRestore());
            await Scene(async () =>
            {
                await ShowText("The sheets dry flat under the lamps, and the blue lines set sharp again: the emergency bridge as it was drawn, pier by pier, and the colony's rescue register.");
                await Say("sam", "Saved. All of it.", "moved");
                await Say("sam", "Sit a while, Satria. There's one more thing in that vault you have a right to see.");
                Note("Saved at Sam's table: the original plan of the emergency bridge, and the colony's rescue register.");
            });
            await MovePhase(Phase.Dusk);
            Checkpoint("dusk");
            Hint("Sam, at his table.");
        }

        // Dusk in the archive: the 1952 disaster train's register and Marcus Bell's red ink; then up on the hall's steps
        // with the last of the light, the key goes back to Sam.
        async Awaitable Register() => await Handover("sam", async () =>
        {
            var sam = Actor("sam");
            await Say("sam", "Vault No. 7, locked with its own key again. Twenty years I've gone down those stairs ashamed of it.", "moved");
            await Say("sam", "Thank you, Satria. For the key. And for letting me finally tell it.", "moved");
            sam.Pose = "idle";
            await Say("courier", "Thank you for keeping it, Mr Sam. Even from me.", "smile");
        }, async () =>
        {
            var sam = Actor("sam");
            var courier = Actor("courier");
            await Walk("courier", Anchor("table"));
            courier.FaceTo(sam.Feet.x);
            sam.FaceTo(courier.Feet.x);
            sam.Pose = "read";
            Sfx("seal");
            await ShowText("Sam unties a thick leather folder sealed with the 1952 platform service's wax, his fingers shaking.");
            Sfx("unfold");
            await Say("sam", "This is the departure register of the special disaster train, twenty years ago.", "sad");
            await Say("courier", "Ticket 041... Daniel, Ratih, little Satria... My family, on the official list for carriage one?!", "surprised");
            await Say("sam", "Your parents paid for those tickets with every coin they had saved. But read the footnote. In red ink, by Marcus Bell.", "sad");
            sam.Pose = "give";
            courier.Pose = "read";
            Sfx("ledger");
            await ShowText("\"Ticket cancelled at the holders' own request, 10:15 pm. Seats given to two orphans of the estuary landslide. Daniel and Ratih have chosen to stay and lead the repairs to the colony's rescue-bridge piers.\"");
            sam.Pose = "idle";
            await Say("sam", "For twenty years I kept it in the darkest vault, afraid the village would carry a guilt it could never repay. But you have a right to the truth.", "sad");
            await Say("sam", "Your parents were never left behind by the times, Satria. They gave up their dream so this colony would have a tomorrow.", "moved");
            courier.Pose = "moved";
            await Wait(1.2f);
            await Say("courier", "Father... Mother... I'm sorry. For eleven years I thought you'd lost.", "sad");
            courier.Pose = "idle";
            await Give("sam", "register");
            await Say("sam", "A copy of the page, for you. Now come up with me. I'd like to see the sky, after a day like this.", "smile");
            Main.Place.Leave("sam");
            await Go("square", "hall_door");
            Main.Place.Bring("sam", Main.Place.Find("hall_door").GlobalSpot);
            await Meet("sam", Steps);
        });
    }
}
