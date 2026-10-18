using UnityEngine;

namespace Shop
{
    /// <summary>
    /// The time of day as a colour grade on everything drawn outdoors (Shaders/Pixel): Art/grades.json, from
    /// ArtSource/kit.js. Indoors and at midday the art shows as drawn. Lights are never graded. Cloud shadows drift
    /// over the outdoors by day and fade out toward night.
    /// </summary>
    public static class Grade
    {
        static readonly int ScaleId = Shader.PropertyToID("_GradeScale");
        static readonly int AddId = Shader.PropertyToID("_GradeAdd");
        static readonly int ShadeId = Shader.PropertyToID("_GradeShade");
        static readonly int CloudsId = Shader.PropertyToID("_Clouds");
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
