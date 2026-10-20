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

        public static void Apply(Phase phase, bool indoors) => Blend(phase, phase, indoors, 1f);

        /// <summary>The grade <paramref name="t"/> of the way from one time of day to the next, as the light turns while the courier watches.</summary>
        public static void Blend(Phase from, Phase to, bool indoors, float t)
        {
            var (a, b) = (Of(from, indoors), Of(to, indoors));
            Set(Vector3.Lerp(a.mul, b.mul, t), Vector3.Lerp(a.add, b.add, t), Vector3.Lerp(a.shade, b.shade, t));
            Shader.SetGlobalFloat(CloudsId, Mathf.Lerp(a.clouds, b.clouds, t));
            Shader.SetGlobalColor(LampTintId, Color.Lerp(a.lamp, b.lamp, t));
            Shader.SetGlobalColor(RimId, Color.Lerp(a.rim, b.rim, t));
            var sun = RenderSettings.sun;
            if (!sun) return;
            sun.enabled = !indoors;
            sun.transform.rotation = Quaternion.Slerp(a.sun, b.sun, t);
            Shader.SetGlobalColor(ShadowTintId, Color.Lerp(a.shadow, b.shadow, t));
        }

        static (Vector3 mul, Vector3 add, Vector3 shade, float clouds, Color lamp, Color rim, Quaternion sun, Color shadow) Of(Phase phase, bool indoors)
        {
            var g = indoors ? null : Art.Json("grades")[phase.ToString().ToLowerInvariant()];
            // (height above the horizon, turn from north, shadow colour): shadows fall away from the camera, west in
            // the morning, east at dusk; the moon's are faint.
            var (height, turn, tint) = phase switch
            {
                Phase.Morning => (28f, -64f, new Color(0.6f, 0.64f, 0.82f)),
                Phase.Midday => (52f, -32f, new Color(0.64f, 0.68f, 0.82f)),
                Phase.Dusk => (24f, 58f, new Color(0.62f, 0.54f, 0.72f)),
                _ => (50f, -36f, new Color(0.78f, 0.78f, 0.88f)),
            };
            return (
                g == null ? Vector3.one : V(g["mul"]),
                g == null ? Vector3.zero : V(g["add"]),
                g == null ? Vector3.zero : V(g["shade"]),
                indoors ? 0 : phase switch { Phase.Morning => 0.8f, Phase.Midday => 1f, Phase.Dusk => 0.4f, _ => 0f },
                new Color(1f, 0.72f, 0.38f, phase switch { Phase.Dusk => 0.6f, Phase.Night => 1f, _ => 0f }),
                indoors ? Color.clear : phase switch
                {
                    Phase.Dusk => new Color(1f, 0.82f, 0.66f, 0.45f),
                    Phase.Night => new Color(0.7f, 0.8f, 1f, 0.35f),
                    _ => Color.clear,
                },
                Quaternion.Euler(height, turn, 0),
                tint);
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
