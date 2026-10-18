using UnityEngine;

namespace Shop
{
    /// <summary>
    /// The time of day as a colour grade on everything drawn outdoors (Shaders/Pixel): Art/grades.json, from
    /// ArtSource/kit.js. Indoors and at midday the art shows as drawn. Lights are never graded. Cloud shadows drift
    /// over the outdoors by day and fade out toward night. The sun (<see cref="RenderSettings.sun"/>, made by Main) turns
    /// with the time of day and casts long shadows outdoors, low in the morning and at dusk; indoors it is off. After
    /// dark the lights glow warm on what is near them, and the characters catch a rim of sky light.
    /// </summary>
    public static class Grade
    {
        static readonly int ScaleId = Shader.PropertyToID("_GradeScale");
        static readonly int AddId = Shader.PropertyToID("_GradeAdd");
        static readonly int ShadeId = Shader.PropertyToID("_GradeShade");
        static readonly int CloudsId = Shader.PropertyToID("_Clouds");
        static readonly int ShadowTintId = Shader.PropertyToID("_ShadowTint");
        static readonly int LampTintId = Shader.PropertyToID("_LampTint");
        static readonly int RimId = Shader.PropertyToID("_Rim");
        static Vector3 mul, add, shade;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        static void Reset()
        {
            Set(Vector3.one, Vector3.zero, Vector3.zero);
            Shader.SetGlobalFloat(CloudsId, 0);
        }

        public static void Apply(Phase phase, bool indoors)
        {
            var g = indoors ? null : Art.Json("grades")[phase.ToString().ToLowerInvariant()];
            if (g == null) Set(Vector3.one, Vector3.zero, Vector3.zero);
            else Set(V(g["mul"]), V(g["add"]), V(g["shade"]));
            Shader.SetGlobalFloat(CloudsId, indoors ? 0 : phase switch { Phase.Morning => 0.8f, Phase.Midday => 1f, Phase.Dusk => 0.4f, _ => 0f });
            Shader.SetGlobalColor(LampTintId, new Color(1f, 0.72f, 0.38f, phase switch { Phase.Dusk => 0.6f, Phase.Night => 1f, _ => 0f }));
            Shader.SetGlobalColor(RimId, indoors ? Color.clear : phase switch
            {
                Phase.Dusk => new Color(1f, 0.82f, 0.66f, 0.45f),
                Phase.Night => new Color(0.7f, 0.8f, 1f, 0.35f),
                _ => Color.clear,
            });
            var sun = RenderSettings.sun;
            if (!sun) return;
            sun.enabled = !indoors;
            // (height above the horizon, turn from north, shadow colour): shadows fall away from the camera, west in
            // the morning, east at dusk; the moon's are faint.
            var (height, turn, tint) = phase switch
            {
                Phase.Morning => (28f, -64f, new Color(0.6f, 0.64f, 0.82f)),
                Phase.Midday => (52f, -32f, new Color(0.64f, 0.68f, 0.82f)),
                Phase.Dusk => (24f, 58f, new Color(0.62f, 0.54f, 0.72f)),
                _ => (50f, -36f, new Color(0.78f, 0.78f, 0.88f)),
            };
            sun.transform.rotation = Quaternion.Euler(height, turn, 0);
            Shader.SetGlobalColor(ShadowTintId, tint);
        }

        /// <summary><paramref name="c"/> graded as the shader grades art, for colours that are not art (the backdrop).</summary>
        public static Color Of(Color c)
        {
            var s = 1f - (0.299f * c.r + 0.587f * c.g + 0.114f * c.b);
            float Channel(int k) => Mathf.Clamp01(c[k] * mul[k] + (add[k] + shade[k] * s) / 255f);
            return new Color(Channel(0), Channel(1), Channel(2), c.a);
        }

        static void Set(Vector3 m, Vector3 a, Vector3 s)
        {
            (mul, add, shade) = (m, a, s);
            Shader.SetGlobalVector(ScaleId, m - Vector3.one);
            Shader.SetGlobalVector(AddId, a);
            Shader.SetGlobalVector(ShadeId, s);
        }

        static Vector3 V(Newtonsoft.Json.Linq.JToken t) => new((float)t[0], (float)t[1], (float)t[2]);
    }
}
