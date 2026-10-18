using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Loads the art that ArtSource/export.py writes into Assets/Resources/Art. Paths are relative to Art/
    /// and have no extension. Art positions are in art pixels with y pointing down, as drawn;
    /// <see cref="World"/> turns them into Unity units (1 unit = 1 art pixel, y up).
    /// </summary>
    public static class Art
    {
        static readonly Dictionary<string, Texture2D> textures = new();
        static readonly Dictionary<string, JObject> data = new();
        static readonly Dictionary<(Texture2D, RectInt, Vector2Int, Vector4), Sprite> sprites = new();
        static readonly Dictionary<Texture, Material> materials = new();
        static Material spriteMaterial;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        static void Reset()
        {
            textures.Clear();
            data.Clear();
            sprites.Clear();
            materials.Clear();
            spriteMaterial = null;
        }

        public static Texture2D Texture(string path)
        {
            if (!textures.TryGetValue(path, out var tex))
            {
                tex = Resources.Load<Texture2D>("Art/" + path);
                if (tex == null) throw new System.ArgumentException($"No art at Art/{path}");
                textures[path] = tex;
            }
            return tex;
        }

        public static bool Has(string path) => textures.ContainsKey(path) || Resources.Load<Texture2D>("Art/" + path) != null;

        public static JObject Json(string path)
        {
            if (!data.TryGetValue(path, out var obj))
            {
                var asset = Resources.Load<TextAsset>("Art/" + path);
                if (asset == null) throw new System.ArgumentException($"No data at Art/{path}");
                obj = data[path] = JObject.Parse(asset.text);
            }
            return obj;
        }

        public static bool HasJson(string path) => data.ContainsKey(path) || Resources.Load<TextAsset>("Art/" + path) != null;

        /// <summary>
        /// A sprite of <paramref name="rect"/> in <paramref name="tex"/> (top-left origin, art pixels). Its pivot is the
        /// art pixel <paramref name="pivot"/> inside the rect; <paramref name="border"/> is a 9-slice border (left, bottom, right, top).
        /// </summary>
        public static Sprite Sprite(Texture2D tex, RectInt rect, Vector2Int pivot = default, Vector4 border = default)
        {
            var key = (tex, rect, pivot, border);
            if (!sprites.TryGetValue(key, out var sprite))
            {
                var r = new Rect(rect.x, tex.height - rect.y - rect.height, rect.width, rect.height);
                var p = new Vector2(pivot.x / (float)rect.width, 1f - pivot.y / (float)rect.height);
                sprite = sprites[key] = UnityEngine.Sprite.Create(tex, r, p, 1f, 0, SpriteMeshType.FullRect, border);
            }
            return sprite;
        }

        /// <summary>The whole texture as a sprite, pivoted on its top-left corner.</summary>
        public static Sprite Sprite(Texture2D tex) => Sprite(tex, new RectInt(0, 0, tex.width, tex.height));

        /// <summary>The unlit pixel material (Shaders/Pixel) showing <paramref name="tex"/>.</summary>
        public static Material Material(Texture tex)
        {
            if (!materials.TryGetValue(tex, out var mat))
                mat = materials[tex] = new Material(Resources.Load<Shader>("Shaders/Pixel")) { mainTexture = tex };
            return mat;
        }

        /// <summary>The pixel material for sprite renderers, which supply their own texture.</summary>
        public static Material SpriteMaterial => spriteMaterial ??= new Material(Resources.Load<Shader>("Shaders/Pixel"));

        public static Vector3 World(Vector2 p, float z = 0f) => new(p.x, -p.y, z);

        public static Color Color(string hex) => ColorUtility.TryParseHtmlString(hex, out var c) ? c : UnityEngine.Color.magenta;

        public static Vector2 Point(JToken pair) => new((float)pair[0], (float)pair[1]);
    }
}
