using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Each keepsake's name and what the courier notices on each side when turning it over in the bag.
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
            ["watch"] = new Keepsake
            {
                Name = "Brass pocket watch",
                Sides = new[]
                {
                    new Side("front", "A railway service watch. The hands stopped at 10:17.", "The pocket watch stopped at 10:17."),
                    new Side("back", "Initials are engraved on the back.", "The pocket watch has initials engraved on the back."),
                    new Side("side", "The crown is pulled out, as if someone stopped it on purpose."),
                },
            },
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
