using System;
using System.Collections;
using System.Runtime.CompilerServices;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace Shop.Tests
{
    /// <summary>
    /// The night every chapter shares (<see cref="NightChapter"/>), played with no one at the keyboard: woken by the
    /// bell, the box from Marlow, the routine at home (step by step the first night, one montage after), the morning,
    /// the handover at dusk with its lantern, and the journal before bed, which starts the next night.
    /// </summary>
    public sealed class RoutineTest
    {
        const float TimeLimit = 120f; // real seconds
        static int waitingAt;

        // A night with no story of its own: Helen at the station is the owner, and the watch is her keepsake.
        sealed class TestNight : NightChapter
        {
            readonly int night;
            public TestNight(Main main, int night) : base(main) => this.night = night;
            protected override int Night => night;
            protected override string Title => "Test";
            protected override string Keepsake => "watch";
            protected override string Word => "Testing";
            protected override string Page => "Nothing happened, and it happened in order.";
            protected override Awaitable Day(string id) =>
                id == "helen" && Game.Bag.Contains(Keepsake) ? Handover("helen", () => Say("helen", "Oh.", "moved")) : base.Day(id);
        }

        [UnityTest]
        public IEnumerator FirstNightStepByStep() => Run(1, async main =>
        {
            await Use(main, "table");
            await Use(main, "bed"); // not yet: no wash, no coil
            Assert.AreEqual(Phase.Night, Game.Phase, "The bed waits for the routine");
            await Use(main, "water_jar");
            await Use(main, "coil");
            Assert.IsTrue(Game.Has("coil_lit") && Game.Has("box_home"));
            await Use(main, "bed");
        });

        [UnityTest]
        public IEnumerator LaterNightsAsOneMontage() => Run(2, _ => Awaitable.NextFrameAsync());

        // Plays the night from the bell to bed: `home` runs the routine once the courier is home with the box.
        static IEnumerator Run(int night, Func<Main, Awaitable> home)
        {
            var saved = Game.Raw;
            Main main = null;
            try
            {
                Main.Auto = true;
                Time.timeScale = 8f;
                main = new GameObject("Main").AddComponent<Main>();
                main.Talk.Picks.Enqueue("Quit"); // leaves the title, for the night to begin
                var playing = Play(main, night, home);
                var end = Time.realtimeSinceStartup + TimeLimit;
                while (!playing.IsCompleted)
                {
                    Assert.Less(Time.realtimeSinceStartup, end, $"The night timed out waiting at line {waitingAt}");
                    yield return null;
                }
                playing.GetAwaiter().GetResult();
            }
            finally
            {
                if (main) UnityEngine.Object.Destroy(main.gameObject);
                Time.timeScale = 1f;
                Main.Auto = false;
                Game.Raw = saved;
            }
        }

        static async Awaitable Play(Main main, int night, Func<Main, Awaitable> home)
        {
            await Until(() => main.Talk.Picks.Count == 0);
            Game.NewGame();
            await main.Begin(night, "", m => new TestNight(m, night));
            Assert.AreEqual("satria_home", main.Place.Def.Id, "Woken at home");

            await Go(main, "shop", "door");
            CollectionAssert.Contains(Game.Bag, "watch", "Marlow hands the night's box over");
            await Go(main, "satria_home", "door");
            await home(main);
            await Until(() => Exploring(main) && Game.Phase == Phase.Morning);
            Assert.AreEqual("morning", Game.Checkpoint);

            if (night == 1) await Use(main, "stove");
            Assert.IsTrue(Game.Has("tea"), "The morning's tea: at the stove the first night, with the breakfast left for him after");

            Game.Phase = Phase.Dusk;
            await Go(main, "station", "start");
            await Use(main, "helen");
            Assert.AreEqual(night, Game.LanternsOut, "Tonight's lantern is out");
            Assert.AreEqual(Phase.Night, Game.Phase);
            Assert.AreEqual("station", main.Place.Def.Id, "Back where the courier stood");

            var story = main.Story;
            await Go(main, "satria_home", "door");
            await Until(() => Game.SavedChapter() == night + 1 && main.Story != story); // over, and the next night begun or saved for later
        }

        // Takes the courier somewhere as the story would, and gives back the controls once there, as stepping through
        // an exit does.
        static async Awaitable Go(Main main, string place, string spawn)
        {
            await main.Go(place, spawn);
            if (main.Story != null) main.Place.Controls = true;
        }

        // Uses a hotspot as a click would, and waits for its scene to be over.
        static async Awaitable Use(Main main, string id, [CallerLineNumber] int line = 0)
        {
            Assert.IsTrue(await main.Place.WalkAndUse(id), $"Could not reach {id}");
            await Until(() => Exploring(main), line);
        }

        static bool Exploring(Main main) => main.Place && main.Place.Controls && !main.Talk.Open;

        static async Awaitable Until(Func<bool> done, [CallerLineNumber] int line = 0)
        {
            waitingAt = line;
            while (!done()) await Awaitable.NextFrameAsync();
        }
    }
}
