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
        };

        /// <summary>A keepsake's art at a size (xs in a hand, sm in the bag, lg up close), centred on its middle pixel.</summary>
        public static Sprite Art(string id, string size, string variant = "")
        {
            var path = $"items/{id}_{size}_{variant}";
            var tex = Shop.Art.Texture(variant != "" && Shop.Art.Has(path) ? path : $"items/{id}_{size}");
            return Shop.Art.Sprite(tex, new RectInt(0, 0, tex.width, tex.height), new Vector2Int(tex.width / 2, tex.height / 2));
        }

        /// <summary>The art of a keepsake's first side.</summary>
        public static Sprite Art(string id, string size) => Art(id, size, All[id].Sides[0].Variant);
    }
}
