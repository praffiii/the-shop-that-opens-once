using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Loads the art that ArtSource/export.py writes into Assets/Resources/Art. Paths are relative to Art/
    /// and have no extension. Art positions are in art pixels with y pointing down, as drawn;
    /// <see cref="World"/> turns them into a place's 3D space (1 unit = 1 art pixel, y up, z away from the camera).
    /// </summary>
    public static class Art
    {
        static readonly Dictionary<string, Texture2D> textures = new();
        static readonly Dictionary<string, JObject> data = new();
        static readonly Dictionary<(Texture2D, RectInt, Vector2Int, Vector4), Sprite> sprites = new();
        static readonly Dictionary<(Texture, bool), Material> materials = new();
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

        /// <summary>The unlit pixel material (Shaders/Pixel) showing <paramref name="tex"/>, cut out; a <paramref name="light"/> is blended over the art and never graded.</summary>
        public static Material Material(Texture tex, bool light = false)
        {
            if (!materials.TryGetValue((tex, light), out var mat))
            {
                mat = materials[(tex, light)] = new Material(Resources.Load<Shader>("Shaders/Pixel")) { mainTexture = tex };
                if (light)
                {
                    mat.SetFloat("_Light", 1);
                    mat.SetFloat("_Src", (float)UnityEngine.Rendering.BlendMode.SrcAlpha);
                    mat.SetFloat("_Dst", (float)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                    mat.SetFloat("_ZWrite", 0);
                    mat.renderQueue = (int)UnityEngine.Rendering.RenderQueue.Transparent;
                }
            }
            return mat;
        }

        /// <summary>The pixel material for sprite renderers, which supply their own texture.</summary>
        public static Material SpriteMaterial => spriteMaterial ??= new Material(Resources.Load<Shader>("Shaders/Pixel"));

        /// <summary>
        /// Art point <paramref name="p"/> on a surface <paramref name="h"/> px high, in its place's 3D space: the art is
        /// drawn top-down at 45 degrees, so a point h px up lies h px further back. Raising h moves a thing toward the
        /// camera along its line of sight, without moving it on the screen.
        /// </summary>
        public static Vector3 World(Vector2 p, float h) => new(p.x, h, -(p.y + h));

        /// <summary>An offset of <paramref name="p"/> art px (y down) within something standing.</summary>
        public static Vector3 Card(Vector2 p) => new(p.x, -p.y, 0f);

        /// <summary>
        /// How high a point <paramref name="up"/> art px up something standing is lifted from its feet. Standing things
        /// face the camera: they lean back 45 degrees, so each px up goes half a px up and half a px back. They stay as
        /// drawn on the screen, every part of them as far from the camera as their feet (sharp together in the depth
        /// of field), and tall ones never loom toward the camera.
        /// </summary>
        public static float Lean(float up) => up / 2;

        /// <summary>How a standing thing's own frame (x right, y up its art) turns and squeezes to lean as <see cref="Lean"/> does.</summary>
        public static readonly Quaternion Leaning = Quaternion.Euler(45, 0, 0);
        public static readonly Vector3 LeaningScale = new(1, Mathf.Sqrt(0.5f), 1);

        public static Color Color(string hex) => ColorUtility.TryParseHtmlString(hex, out var c) ? c : UnityEngine.Color.magenta;

        public static Vector2 Point(JToken pair) => new((float)pair[0], (float)pair[1]);
    }
}
