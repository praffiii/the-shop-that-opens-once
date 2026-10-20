using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Rain over the world (Night 4's drizzle): thin streaks falling slant on the sea wind across the screen, and drops
    /// splashing where they land. Under everything else on the screen; out of doors only, while <see cref="Falling"/>.
    /// </summary>
    public sealed class Rain : MonoBehaviour
    {
        const int Streaks = 90, Splashes = 16;
        /// <summary>How fast the streaks fall and drift west (canvas px a second), and a splash's frames a second.</summary>
        static readonly Vector2 Fall = new(-70f, 300f);
        const float SplashFps = 14f;

        /// <summary>Whether it is raining; the chapter sets it.</summary>
        public static bool Falling;

        Image[] streaks, splashes;
        Vector2[] at;
        float[] speed, splashTime;
        Sprite[] streak, splash;

        public static Rain Create(Transform parent)
        {
            var rain = Look.Node("Rain", parent).gameObject.AddComponent<Rain>();
            rain.streak = new[] { Look.Frame("rain_streak", 0), Look.Frame("rain_streak", 1), Look.Frame("rain_streak", 2) };
            rain.splash = new[] { Look.Frame("rain_splash", 0), Look.Frame("rain_splash", 1), Look.Frame("rain_splash", 2), Look.Frame("rain_splash", 3) };
            rain.streaks = new Image[Streaks];
            rain.at = new Vector2[Streaks];
            rain.speed = new float[Streaks];
            for (var i = 0; i < Streaks; i++)
            {
                rain.streaks[i] = Look.Picture("Streak", rain.transform, rain.streak[i % 3]);
                rain.at[i] = new Vector2(Random.value, Random.value);
                rain.speed[i] = 0.8f + 0.4f * (i % 3) / 2f; // the long streaks are the near ones, and fall faster
            }
            rain.splashes = new Image[Splashes];
            rain.splashTime = new float[Splashes];
            for (var i = 0; i < Splashes; i++)
            {
                rain.splashes[i] = Look.Picture("Splash", rain.transform, rain.splash[0]);
                rain.splashTime[i] = -Random.value; // staggered, so they never land together
            }
            return rain;
        }

        void Update()
        {
            var main = Main.Instance;
            var on = Falling && main && main.Place && !main.Place.Def.Indoors;
            foreach (var s in streaks) s.enabled = on;
            foreach (var s in splashes) s.enabled = on;
            if (!on) return;
            var view = Main.Size;
            var dt = Time.deltaTime;
            for (var i = 0; i < Streaks; i++)
            {
                var p = at[i] + Fall * (speed[i] * dt) / view;
                if (p.y > 1f) p = new Vector2(Random.value * 1.2f, p.y - 1f); // back to the top, and a little east to keep up with the drift
                if (p.x < -0.05f) p.x += 1.1f;
                at[i] = p;
                Look.Move(streaks[i].rectTransform, new Vector2(p.x * view.x, p.y * view.y - 12f));
            }
            for (var i = 0; i < Splashes; i++)
            {
                splashTime[i] += dt;
                var frame = Mathf.FloorToInt(splashTime[i] * SplashFps);
                if (frame >= splash.Length)
                {
                    // a new drop lands somewhere on the ground (the lower part of the screen, where the ground is near)
                    splashTime[i] = -Random.value * 0.4f;
                    Look.Move(splashes[i].rectTransform, new Vector2(Random.value * view.x, view.y * (0.35f + 0.6f * Random.value)));
                    frame = 0;
                }
                splashes[i].enabled = frame >= 0;
                if (frame >= 0) splashes[i].sprite = splash[frame];
            }
        }
    }
}
