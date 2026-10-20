using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Each keepsake's name and what the courier notices on each side when turning it over in the bag; Satria's own
    /// things and what the villagers give him go in the bag too.
    /// A side's art is items/&lt;id&gt;_lg_&lt;variant&gt; (or items/&lt;id&gt;_lg with no variant). Each chapter
    /// fills in its keepsake's sides when it is written.
    /// </summary>
    public static class Keepsakes
    {
        /// <summary>One side: the art variant, what the courier sees, and what goes into the notes ("" for nothing).</summary>
        public readonly struct Side
        {
            public readonly string Variant, Seen, Note;
            public Side(string variant, string seen, string note = "") => (Variant, Seen, Note) = (variant, seen, note);
        }

        public sealed class Keepsake
        {
            public string Name;
            /// <summary>The item art it is drawn with, when not its own (the day's post shares the letter and the parcel).</summary>
            public string Art;
            public Side[] Sides;
        }

        public static readonly Dictionary<string, Keepsake> All = new()
        {
            // Night 1's watch, as it is cleaned and set going: soot-black, then clean, then ticking with its back sprung open
            ["watch"] = new Keepsake
            {
                Name = "Brass pocket watch",
                Sides = new[]
                {
                    new Side("front", "A railway service watch. The hands stopped at 10:17.", "The pocket watch stopped at 10:17."),
                    new Side("scorched", "The back is burnt black, crusted hard, as if lightning had found it. It smells of sulphur and scorched wire.", "The watch's back is burnt black."),
                    new Side("side", "The crown is pulled out, as if someone stopped it on purpose."),
                },
            },
            ["watch_clean"] = new Keepsake
            {
                Name = "Brass pocket watch",
                Sides = new[]
                {
                    new Side("front", "Clean now, the glass clear. The hands still stand at 10:17, and it makes no sound at all."),
                    new Side("back", "Under the soot there were initials: M.B.", "The watch is engraved M.B. on its back."),
                    new Side("side", "The crown is pulled out, as if someone stopped it on purpose."),
                },
            },
            ["watch_ticking"] = new Keepsake
            {
                Name = "Brass pocket watch",
                Sides = new[]
                {
                    new Side("front", "It ticks again. The hands start from 10:17, as if no time had passed."),
                    new Side("open", "Inside the sprung back: \"For Helen. Don't wait for me at the station if the storm won't ease. M.\"", "The watch is Helen's, from M.: \"Don't wait for me at the station if the storm won't ease.\""),
                    new Side("side", "The crown pushed home. Tick, tock, under his thumb."),
                },
            },
            // what Night 1's day passes through his hands
            ["bread"] = new Keepsake { Name = "Sweet loaf", Sides = new[] { new Side("", "A sweet loaf, still warm from the Baker's oven. For Arlo at the jetty, in trade for his damar oil.") } },
            ["damar_oil"] = new Keepsake { Name = "Damar oil", Sides = new[] { new Side("", "Arlo's damar oil, amber and resinous in its little bottle. It softens burnt soot, the Baker says.") } },
            ["oil_lantern"] = new Keepsake { Name = "Oil lantern", Sides = new[] { new Side("", "The Mender's oil lantern, its wick trimmed. Enough to light the dark platform's lanterns.") } },
            // Night 2's rabbit, torn as it comes out of the box and mended at Mother's sewing machine
            ["rabbit"] = new Keepsake
            {
                Name = "Patchwork rabbit",
                Sides = new[]
                {
                    new Side("front", "A patchwork rabbit in faded polka dots. The left ear is torn half off and drooping, and the left eye is only a few frayed threads. It smells musty, of years under mud and dust.", "The rabbit: left ear torn, left eye gone, musty."),
                    new Side("back", "Its back seam has split, and the kapok inside has gone lumpy. Someone sewed it by hand, long ago, in small careful stitches."),
                },
            },
            ["rabbit_mended"] = new Keepsake
            {
                Name = "Patchwork rabbit",
                Sides = new[]
                {
                    new Side("front", "The ear holds fast in big red cross-stitches, and Nora's teak button looks out where the eye was. It smells of chamomile, warm and calm."),
                    new Side("back", "A red heart patched over the split seam, cross-stitched round in cream. Mother's red thread."),
                },
            },
            // what Night 2's day passes through his hands
            ["chamomile"] = new Keepsake { Name = "Chamomile", Sides = new[] { new Side("", "Four full chamomile blooms from the Gardener's field, tied with a twist of grass. Sweet, and calming.") } },
            ["red_thread"] = new Keepsake { Name = "Red thread", Sides = new[] { new Side("", "Mother's red embroidery thread, from Grandma Nora's sewing box. Kept ten years for the right hands.") } },
            ["button"] = new Keepsake { Name = "Teak button", Sides = new[] { new Side("", "A teak button from Grandma Nora, polished smooth. An eye for a rabbit that lost one.") } },
            // Night 3's camera, clouded with dust as it comes out of the box, then cleaned
            ["camera"] = new Keepsake
            {
                Name = "Father's film camera",
                Sides = new[]
                {
                    new Side("side", "Father's 8mm cine camera, heavy bronze in rough black leather. On its brass plate, a D: he cut it there himself.", "The film camera is Father's: he cut the D on its brass plate himself."),
                    new Side("front", "The lens is clouded with dust. The wind crank won't turn, and the run button is stuck fast."),
                    new Side("top", "The footage dial stopped a third of the way round. A reel is still inside, twenty years old, never taken out.", "A twenty-year-old reel is still inside Father's camera."),
                },
            },
            ["camera_clean"] = new Keepsake
            {
                Name = "Father's film camera",
                Sides = new[]
                {
                    new Side("side", "The bronze glows again, and Father's D catches the light."),
                    new Side("front", "The lens is clear now, deep blue under the glass. It smells of old machine oil."),
                    new Side("top", "The crank winds again. Whatever Father filmed is still on the reel."),
                },
            },
            // what Night 3's day passes through his hands
            ["rope"] = new Keepsake { Name = "Hemp rope", Sides = new[] { new Side("", "Arlo's hemp rope, coiled thick, its end whipped with twine. Enough to get up the crevice in the south cliff, if the wind lets him.") } },
            ["mint"] = new Keepsake { Name = "Sea mint", Sides = new[] { new Side("", "Three bunches of sea mint off the south cliff, sharp and cool. Father used to brew it for Theo while he washed his negatives.") } },
            ["mint_tea"] = new Keepsake { Name = "Mint tea", Sides = new[] { new Side("", "Sea mint tea in a clay cup, still steaming. For the vent in Theo's studio wall.") } },
            // Night 4's key, cold and rusty out of the box, and worn bright once it has turned the vault's four tumblers
            ["key"] = new Keepsake
            {
                Name = "Black iron key",
                Sides = new[]
                {
                    new Side("front", "A heavy key of solid black iron, cold in the hand. Four stepped notches are cut in its bit, precise as clockwork.", "The black iron key has four stepped notches in its bit."),
                    new Side("back", "No room number and no name: nothing is engraved on it at all. Only a hollow acorn for a bow, and rust.", "Nothing is engraved on the key: no room number, no name."),
                },
            },
            ["key_turned"] = new Keepsake
            {
                Name = "Black iron key",
                Sides = new[]
                {
                    new Side("front", "The rust is worn off its notches, and they shine silver where the four tumblers took them."),
                    new Side("back", "Still nothing engraved on it. It never needed a name: there was only ever one door for it."),
                },
            },
            ["register"] = new Keepsake
            {
                Name = "Copy of the register",
                Sides = new[] { new Side("", "Sam's copy of the 1952 register's page. Ticket 041: Daniel, Ratih and little Satria, carriage one, struck through in Marcus Bell's red ink, cancelled at 10:15 at the holders' own wish.", "Ticket 041 was cancelled at my parents' own wish. Their seats went to two orphans of the landslide, and they stayed to mend the bridge.") },
            },
            // Night 5's shoes, as they come out of the box and out of the Mender's press
            ["shoes"] = new Keepsake
            {
                Name = "Leo's running shoes",
                Sides = new[]
                {
                    new Side("pair", "A pair of old canvas running shoes, faded red, the canvas gone hard and mossy. Dull iron spikes under the right one.", "Leo's running shoes: the canvas hard and mossy, the laces broken."),
                    new Side("soles", "The soles are two sizes: the left long and slender, the right short and thick. The rubber is stiff as river stone and caked with dried mud.", "Leo's shoes have soles of two sizes, the left long and slender, the right short and thick."),
                    new Side("tongue", "The tongue's seam gapes wide open, and the laces have snapped in several places."),
                },
            },
            ["shoes_mended"] = new Keepsake
            {
                Name = "Leo's running shoes",
                Sides = new[]
                {
                    new Side("pair", "The soles bonded tight and springy, the canvas supple again. Beeswax makes the old red shine."),
                    new Side("soles", "Still two sizes, made for the legs Leo has. The spikes are clean of rust."),
                    new Side("tongue", "The seam stitched shut, the laces whole and tied."),
                },
            },
            // Night 6's ledger, as it comes out of the box and once Satria has balanced it, and Father's savings book
            ["ledger"] = new Keepsake
            {
                Name = "Deer leather ledger",
                Sides = new[]
                {
                    new Side("cover", "A thick book in dark deer leather, brass on its corners, buckled shut with a bronze clasp. Tooled in gold: BELLWOOD STATION 1952, M. BELL.", "The ledger is Marcus Bell's: Bellwood station's accounts for 1952."),
                    new Side("spine", "Gold on the spine: Bellwood Station, accounts and upkeep, 1952. It smells of old leather and waxed paper."),
                    new Side("page", "Hundreds of receipts, stamped and signed Marcus Bell: timber beams and cement, all from Father. The last balance is left blank under a red question mark, over the railway's unbroken red seal.", "Father's gifts of timber and cement fill the ledger. Its last balance is blank, marked with a red question mark."),
                },
            },
            ["ledger_balanced"] = new Keepsake
            {
                Name = "Deer leather ledger",
                Sides = new[]
                {
                    new Side("page", "Balanced at last: 4,800, ten years of Father's wages in the bridge's beams. Marcus Bell's stamp, bright red: PAID IN FULL WITH FAMILY LOVE.", "The ledger is balanced: paid in full with family love."),
                    new Side("cover", "The clasp hangs open now. There is nothing left in it to keep shut."),
                },
            },
            ["savings_book"] = new Keepsake
            {
                Name = "Father's savings book",
                Sides = new[]
                {
                    new Side("cover", "A little savings book from the village post office, in blue cloth. On its label, in Father's hand: DANIEL.", "Behind the radio was Father's savings book from the village post office."),
                    new Side("inside", "Withdrawal after withdrawal, every one for the bridge's beams, down to the last line: 0.", "Father's savings book is empty: he gave it all to the bridge's beams."),
                },
            },
            // Night 7's music box and letter from the last box, and the photo the music box opens at Mother's sewing table
            ["musicbox"] = new Keepsake
            {
                Name = "Walnut music box",
                Sides = new[]
                {
                    new Side("closed", "A small music box of fine walnut, a chamomile set in its lid and a little brass crank on its right side. Silent, and a little dusty.", "A walnut music box with a brass crank came in the last box."),
                    new Side("under", "Cut by hand under its base: D, a heart, R. Father made it for Mother.", "Father carved the music box for Mother: D and R under its base."),
                },
            },
            ["musicbox_open"] = new Keepsake
            {
                Name = "Walnut music box",
                Sides = new[]
                {
                    new Side("open", "Open, it plays Mother's lullaby: three long notes, two short, a rest. Its lid is lined with dried lavender."),
                    new Side("under", "D, a heart, R. The same D as on Father's camera."),
                },
            },
            ["letter"] = new Keepsake
            {
                Name = "Sealed letter",
                Sides = new[]
                {
                    new Side("back", "A thick envelope sealed in red wax, a sprig of dried lavender caught under the seal.", "A letter sealed in red wax came with the music box."),
                    new Side("front", "No name on it, and no sender. It smells of dried lavender."),
                },
            },
            ["letter_read"] = new Keepsake
            {
                Name = "Mother's letter",
                Sides = new[] { new Side("", "Mother's letter, in her own hand, folded into the bag's inmost pocket. \"The choice is yours, my son.\"", "Mother's letter: twenty years ago they almost left on the night train, stayed to help, and never regretted it. The choice is mine.") },
            },
            ["photo"] = new Keepsake
            {
                Name = "Family photo",
                Sides = new[]
                {
                    new Side("front", "Father, Mother and a small Satria, laughing over grilled corn in the kitchen. None of them knew they were being photographed.", "Hidden in the sewing table: a photo of the three of us laughing over grilled corn."),
                    new Side("back", "Theo's studio stamp on the back. He took it, and never said."),
                },
            },
            // what Satria comes home with, and Mr Baker's welcome
            ["shirt"] = new Keepsake { Name = "Spare shirt", Sides = new[] { new Side("", "A clean city shirt, pressed and folded. It looks out of place here already.") } },
            ["purse"] = new Keepsake { Name = "Coin purse", Sides = new[] { new Side("", "What is left of the fare: a few coins rattling at the bottom.") } },
            ["contract"] = new Keepsake
            {
                Name = "Draft contract",
                Sides = new[] { new Side("", "Valdo's draft for the sale of Mother's house, from Bram Capital. The line to sign on is still empty.", "Valdo's draft contract: the sale of Mother's house, not signed yet.") },
            },
            ["homekey"] = new Keepsake { Name = "House key", Sides = new[] { new Side("", "Mother's old brass key, green with moss from its years under the geranium pot.") } },
            ["biscuit"] = new Keepsake { Name = "Ginger biscuit", Sides = new[] { new Side("", "Still warm from Mr Baker's oven. Ginger and palm sugar, the way it always was.") } },
            // Day 8's: Valdo's contract torn up in the square, and the reopened post office's new stamp
            ["contract_torn"] = new Keepsake
            {
                Name = "Torn contract",
                Sides = new[] { new Side("", "Valdo's contract, torn in two in front of the whole village. The line to sign on stays empty for good.", "Valdo's contract is torn up, in front of the whole village.") },
            },
            ["post_stamp"] = new Keepsake
            {
                Name = "Post office stamp",
                Sides = new[]
                {
                    new Side("handle", "A new stamp for the post office, its turned handle still bright with varnish."),
                    new Side("face", "Its mark, in blue ink: BELLWOOD POST 1972. The post office is open again."),
                },
            },
        };

        // the day's post goes in the bag like anything else
        static Keepsakes()
        {
            foreach (var d in Post.All) All[d.Id] = new Keepsake { Name = d.Name, Art = d.Letter ? "post" : "parcel", Sides = new[] { new Side("", d.Seen) } };
        }

        /// <summary>A keepsake's art at a size (xs in a hand, sm in the bag, lg up close), centred on its middle pixel.</summary>
        public static Sprite Art(string id, string size, string variant = "")
        {
            if (All.TryGetValue(id, out var k) && k.Art != null) id = k.Art;
            var path = $"items/{id}_{size}_{variant}";
            var tex = Shop.Art.Texture(variant != "" && Shop.Art.Has(path) ? path : $"items/{id}_{size}");
            return Shop.Art.Sprite(tex, new RectInt(0, 0, tex.width, tex.height), new Vector2Int(tex.width / 2, tex.height / 2));
        }

        /// <summary>The art of a keepsake's first side.</summary>
        public static Sprite Art(string id, string size) => Art(id, size, All[id].Sides[0].Variant);
    }
}
