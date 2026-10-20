using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Minigame 5B, the sprint up Leo's hill at dusk in his mended shoes (Night 5), side on, while Leo watches from his
    /// rock at the top. A and D in turn drive the legs (the same key twice only stumbles along), the pace falling off
    /// between strides; Space leaps the kapok roots, slippery rocks and the last coral steps. Run into one on the ground
    /// and he tumbles (fail A); the sun sinks through the sky as the seconds go, and if it is down before he is at the
    /// top the light is gone (fail B). A retry starts at the mid-hill pennant once he has passed it.
    /// </summary>
    public sealed class HillSprint : Minigame
    {
        /// <summary>The course (px from the foot to the top's edge, the pennant halfway), the hillside's tiles and how it rises (a px every six), and the seconds before the sun is down.</summary>
        const float Course = 1200, Pennant = 576, Tile = 48, Rise = 6, Limit = 45;
        /// <summary>Where the runner stands in the view, and the ground under him; the top's stop in front of Leo.</summary>
        const float RunnerX = 64, GroundY = 88, Top = Course + 56;
        /// <summary>A stride's kick to the pace (px/s), the top pace, how fast it falls off, the leap, gravity, and how near an obstacle trips.</summary>
        const float Kick = 14, Fastest = 70, Drag = 1f, Leap = 120, Gravity = 400, Trip = 8, Clear = 8, Finish = 1f;
        static readonly (float X, int Kind)[] Obstacles =
        {
            (120, 0), (200, 1), (300, 0), (380, 1), (470, 0), (660, 1), (740, 0), (830, 1), (900, 0), (980, 1), (1060, 0), (1120, 2), (1160, 2),
        };
        const int Tiles = (int)(Course / Tile) + 3;

        RectTransform view;
        Image sky, sun, runner, top, leo, flag, cap;
        Image[] hills, slope, obstacles;
        float t, x, pace, h, vy, startTime, finished, tumble = -1;
        int last;
        bool passed;

        public override string Title => "Up Leo's hill";
        public override (string Key, string Text)[] Instructions => new[]
        {
            ("A/D", "In turn, as fast as you can, to sprint up the hill."),
            ("Space", "Leap the roots, the slippery rocks and the coral steps."),
        };
        public override (string Who, string Line) FailA => ("leo", "Up, Satria! A courier isn't judged by how often he falls, but by how fast he gets up and straightens his cap! Breathe, and drive your legs up this slope again!");
        public override (string Who, string Line) FailB => ("courier", "My breath and my steps have to keep in time... I can't give up on the last climb.");
        public override Vector2 Size => new(256, 112);

        static float Ground(float wx) => -Mathf.Floor(Mathf.Clamp(wx, 0, Course) / Rise);

        public override void Build(RectTransform area)
        {
            view = Look.Node("view", area, new Rect(0, 0, Size.x, Size.y));
            view.gameObject.AddComponent<RectMask2D>();
            sky = Look.Picture("sunset_sky", view, Look.Frame("sunset_sky", 0));
            var heavens = Look.Node("heavens", view, new Rect(0, 0, Size.x, 44));
            heavens.gameObject.AddComponent<RectMask2D>(); // the sun sets behind the sea
            sun = Look.Picture("sunset_sun", heavens, Look.Frame("sunset_sun", 0));
            hills = new[] { Look.Picture("far_hills", view, Look.Piece("far_hills")), Look.Picture("far_hills", view, Look.Piece("far_hills")) };
            slope = new Image[Tiles];
            for (var n = 0; n < Tiles; n++) slope[n] = Look.Picture("hill_slope", view, Look.Frame("hill_slope", 0));
            top = Look.Picture("hill_top", view, Look.Piece("hill_top"));
            leo = Look.Picture("hill_leo", view, Look.Frame("hill_leo", 0));
            flag = Look.Picture("hill_flag", view, Look.Frame("hill_flag", 0));
            obstacles = new Image[Obstacles.Length];
            for (var i = 0; i < Obstacles.Length; i++) obstacles[i] = Look.Picture("hill_obstacle", view, Look.Frame("hill_obstacle", Obstacles[i].Kind));
            runner = Look.Picture("sprinter", view, Look.Frame("sprinter", 9));
            Look.Move(Look.Picture("trail", view, Look.Piece("trail")).rectTransform, new Vector2(6, 4));
            cap = Look.Picture("trail_cap", view, Look.Piece("trail_cap"));
        }

        public override void Reset()
        {
            // from the pennant once it is passed, with the time it was passed at; from the foot before that
            x = passed ? Pennant : 0;
            t = passed ? startTime : 0;
            pace = h = vy = finished = 0;
            tumble = -1;
            last = 0;
            Show();
        }

        // The hill scrolled to keep the runner in view: the sky and sun as late as it is, the headlands drifting
        // slower than the slope, the slope's tiles, the top with Leo and the obstacles, and the runner's stride.
        void Show()
        {
            var u = Mathf.Clamp01(t / Limit);
            var hour = Mathf.Min(3, (int)(u * 4));
            var (camX, camY) = (x - RunnerX, Ground(x) - GroundY);
            Look.SetSprite(sky, Look.Frame("sunset_sky", hour));
            Look.SetSprite(sun, Look.Frame("sunset_sun", hour));
            Look.Move(sun.rectTransform, new Vector2(Mathf.Round(140 + 46 * u), Mathf.Round(36 * u - 2)));
            var drift = Mathf.Round(Mathf.Repeat(-camX * 0.15f, Size.x));
            var horizon = Mathf.Round(31 + (-camY - GroundY) * 0.04f);
            Look.Move(hills[0].rectTransform, new Vector2(drift - Size.x, horizon));
            Look.Move(hills[1].rectTransform, new Vector2(drift, horizon));
            for (var n = 0; n < Tiles; n++)
            {
                var wx = (n - 3) * Tile;
                Look.SetSprite(slope[n], Look.Frame("hill_slope", n < 3 ? 2 : wx < Pennant ? 0 : 1));
                Look.Move(slope[n].rectTransform, new Vector2(wx - camX, Ground(wx) - 8 - camY));
            }
            Look.Move(top.rectTransform, new Vector2(Course - camX, Ground(Course) - 40 - camY));
            Look.SetSprite(leo, Look.Frame("hill_leo", (int)(t * 4) % 4));
            Look.Move(leo.rectTransform, new Vector2(Course + 67 - camX, Ground(Course) - 54 - camY));
            Look.SetSprite(flag, Look.Frame("hill_flag", passed ? 1 + (int)(t * 5) % 2 : 0));
            Look.Move(flag.rectTransform, new Vector2(Pennant - 4 - camX, Ground(Pennant) - 31 - camY));
            for (var i = 0; i < Obstacles.Length; i++)
            {
                var ox = Obstacles[i].X;
                Look.Move(obstacles[i].rectTransform, new Vector2(ox - 10 - camX, Ground(ox - 10) - 13 - camY));
            }
            var frame = tumble >= 0 ? (t - tumble < 0.12f ? 7 : 8) : finished > 0 || pace < 5 && h <= 0 ? 9 : h > 0 ? 6 : (int)(x / 6) % 6;
            Look.SetSprite(runner, Look.Frame("sprinter", frame));
            Look.Move(runner.rectTransform, new Vector2(RunnerX - 20, Mathf.Round(GroundY - h - 37)));
            Look.Move(cap.rectTransform, new Vector2(Mathf.Round(7 + x / Top * 80), 1));
        }

        public override Outcome Tick()
        {
            var dt = Time.deltaTime;
            t += dt;
            var outcome = x >= Top ? Arrive(dt) : Run(dt);
            Show();
            return outcome;
        }

        Outcome Run(float dt)
        {
            // a stride for each key in turn; the same key again is a stumble that drives nothing
            var way = Controls.Left ? -1 : Controls.Right ? 1 : 0;
            if (way != 0 && way != last)
            {
                pace = Mathf.Min(Fastest, pace + Kick);
                last = way;
                if (h <= 0) Sound.Play("step_" + Random.Range(0, 4));
            }
            pace -= pace * Drag * dt;
            if (Controls.Interact && h <= 0)
            {
                vy = Leap;
                Sound.Play("whoosh");
            }
            if (h > 0 || vy > 0)
            {
                vy -= Gravity * dt;
                h = Mathf.Max(0, h + vy * dt);
                if (h <= 0) vy = 0;
            }
            var from = x;
            x = Mathf.Min(Top, x + pace * dt);
            if (!passed && x >= Pennant)
            {
                passed = true;
                startTime = t;
                Sound.Play("flutter");
            }
            foreach (var (ox, _) in Obstacles)
                if (from < ox + Trip && x > ox - Trip && h < Clear)
                {
                    x = ox - Trip;
                    tumble = t;
                    Sound.Play("thump");
                    return Outcome.FailA;
                }
            if (x >= Top)
            {
                Sound.Play("cheer");
                return Outcome.Playing;
            }
            return t >= Limit ? Outcome.FailB : Outcome.Playing;
        }

        // At the top with the sun still up: a moment standing in front of Leo before it counts.
        Outcome Arrive(float dt)
        {
            pace = h = 0;
            finished += dt;
            return finished >= Finish ? Outcome.Won : Outcome.Playing;
        }

        public override void Solve()
        {
            x = Top;
            finished = Finish;
            h = pace = 0;
            Show();
        }
    }
}
