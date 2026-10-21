using System;
using System.Collections;
using System.Runtime.CompilerServices;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace Shop.Tests
{
    /// <summary>
    /// Plays chapters from the title to their end with no one at the keyboard, on the real walk masks and places: the
    /// Prologue's Day 0 as Begin starts it (in English, and in Indonesian with every line it shows translated), and the
    /// systems test (the talk box, the bag, handing a keepsake over and back, a lantern going out and the save).
    /// </summary>
    public sealed class PlaythroughTest
    {
        const float TimeLimit = 120f; // real seconds
        static int waitingAt; // the line of the step now being waited on, for a timeout to name

        [UnityTest]
        public IEnumerator ProloguePlaysThrough() => Run(Prologue);

        [UnityTest]
        public IEnumerator ProloguePlaysInIndonesian()
        {
            var was = Lang.Current;
            Lang.Current = 1;
            Lang.Missing.Clear();
            try
            {
                yield return Run(Prologue);
                CollectionAssert.IsEmpty(Lang.Missing, "Every line the Prologue shows has its Indonesian");
            }
            finally
            {
                Lang.Current = was;
            }
        }

        [UnityTest]
        public IEnumerator SystemsTestPlaysThrough() => Run(SystemsTest, Main.SystemsTest);

        // Starts the game, picks `option` on the title, and plays it with `play`. Leaves the save as it found it.
        static IEnumerator Run(Func<Main, Awaitable> play, string option = "Begin")
        {
            var saved = Game.Raw;
            Main main = null;
            try
            {
                Main.Auto = true;
                Time.timeScale = 8f;
                main = new GameObject("Main").AddComponent<Main>();
                main.Talk.Picks.Enqueue(option);
                var playing = play(main);
                var end = Time.realtimeSinceStartup + TimeLimit;
                while (!playing.IsCompleted)
                {
                    Assert.Less(Time.realtimeSinceStartup, end, $"The playthrough timed out waiting at line {waitingAt}");
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

        // Day 0: off the bus, over the bridge to the welcome, back past Valdo, through the gate with the key from the
        // geranium, the photo's monologue, and the bed.
        static async Awaitable Prologue(Main main)
        {
            await Until(() => Exploring(main, "eastroad"));
            await Walk(main, "to_east", "east");
            await Walk(main, "to_square", "square");
            Assert.IsTrue(Game.Has("welcomed"), "The village welcomes Satria in the square");
            await Walk(main, "to_east", "east");
            Assert.IsTrue(Game.Has("met_valdo"), "Valdo stops Satria on the way home");
            await Use(main, "geranium");
            await Until(() => Game.Bag.Contains("homekey") && Exploring(main, "east"));
            await Walk(main, "home_door", "satria_home");
            await Use(main, "photo");
            await Until(() => Game.Has("monologue") && Exploring(main, "satria_home"));
            await Use(main, "bed");
            await Until(() => main.Story is Night1 && Game.SavedChapter() == 1);
            CollectionAssert.Contains(Game.Bag, "contract", "What Satria brought home goes on into Night 1");
            StringAssert.Contains("Day Eight", string.Join(" ", Game.Notes), "Valdo's deadline stays in the notes");
        }

        static async Awaitable SystemsTest(Main main)
        {
            await Until(() => Exploring(main, "station"));
            await Walk(main, "to_grove", "grove");
            await main.Place.WalkAndUse("shop_door");
            await Until(() => Exploring(main, "shop"));
            CollectionAssert.Contains(Game.Bag, "watch", "Marlow hands over the watch");

            main.Bag.LookAt("watch");
            main.Bag.Turn(1);
            main.Bag.LookAt("");
            Assert.IsTrue(Game.Has("seen_watch_scorched"), "Turning the watch over shows its burnt back");
            Assert.AreEqual(2, Game.Notes.Count, "Each side with something to notice adds a note");

            await main.Place.WalkAndUse("door");
            await Until(() => Exploring(main, "grove"));
            await Walk(main, "to_station", "station");
            // Through every area and back by their edge exits.
            foreach (var (exit, to) in new[] { ("to_square", "square"), ("to_east", "east"), ("to_square", "square"), ("to_coast", "coast"), ("to_square", "square"), ("to_station", "station") })
                await Walk(main, exit, to);
            main.Talk.Picks.Enqueue("Show the watch");
            Assert.IsTrue(await main.Place.WalkAndUse("helen"), "The courier can walk up to Helen");
            await Until(() => Game.LanternsOut == 1); // a lantern goes out
            Assert.AreEqual(Phase.Night, Game.Phase, "The handover turns dusk to night");
            await Until(() => main.Story == null);
            CollectionAssert.DoesNotContain(Game.Bag, "watch", "Helen keeps the watch");
        }

        static async Awaitable Walk(Main main, string exit, string to, [CallerLineNumber] int line = 0)
        {
            await Use(main, exit, line);
            await Until(() => Exploring(main, to), line);
        }

        // Walks to `id` and uses it, as a player clicks it. A step on the way stops the walk for its scene, and the
        // courier sets off again once it is over; an exit takes the courier as soon as it steps in, before the walk ends.
        static async Awaitable Use(Main main, string id, [CallerLineNumber] int line = 0)
        {
            var from = main.Place.Def.Id;
            while (!await main.Place.WalkAndUse(id))
            {
                await Until(() => main.Place.Def.Id != from || Exploring(main, from), line);
                if (main.Place.Def.Id != from) return;
                await Awaitable.NextFrameAsync();
            }
        }

        static bool Exploring(Main main, string place) =>
            main.Place && main.Place.Def.Id == place && main.Place.Controls && !main.Talk.Open;

        static async Awaitable Until(Func<bool> done, [CallerLineNumber] int line = 0)
        {
            waitingAt = line;
            while (!done()) await Awaitable.NextFrameAsync();
        }
    }
}
