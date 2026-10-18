using System;
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace Shop.Tests
{
    /// <summary>
    /// Plays the systems test from the title to the end with no one at the keyboard: real walk masks, real places,
    /// the talk box, the bag, handing a keepsake over and back, a lantern going out and the save.
    /// </summary>
    public sealed class PlaythroughTest
    {
        const float TimeLimit = 120f; // real seconds

        [UnityTest]
        public IEnumerator SystemsTestPlaysThrough()
        {
            var saved = Game.SavedChapter();
            Main.Auto = true;
            Time.timeScale = 8f;
            var main = new GameObject("Main").AddComponent<Main>();
            try
            {
                var play = Play(main);
                var end = Time.realtimeSinceStartup + TimeLimit;
                while (!play.IsCompleted)
                {
                    Assert.Less(Time.realtimeSinceStartup, end, "The playthrough timed out");
                    yield return null;
                }
                play.GetAwaiter().GetResult();
            }
            finally
            {
                UnityEngine.Object.Destroy(main.gameObject);
                Time.timeScale = 1f;
                Main.Auto = false;
                if (saved < 0) Game.DeleteSave();
                else Game.Save(saved);
            }
        }

        static async Awaitable Play(Main main)
        {
            await Until(() => Exploring(main, "station"));
            await Walk(main, "to_grove", "grove");
            await main.Place.WalkAndUse("shop_door");
            await Until(() => Exploring(main, "shop"));
            CollectionAssert.Contains(Game.Bag, "watch", "Marlow hands over the watch");

            main.Bag.LookAt("watch");
            main.Bag.Turn(1);
            main.Bag.LookAt("");
            Assert.IsTrue(Game.Has("seen_watch_back"), "Turning the watch over shows its back");
            Assert.AreEqual(2, Game.Notes.Count, "Each side with something to notice adds a note");

            await main.Place.WalkAndUse("door");
            await Until(() => Exploring(main, "grove"));
            await Walk(main, "to_station", "station");
            // Through every area and back by their edge exits.
            foreach (var (exit, to) in new[] { ("to_square", "square"), ("to_east", "east"), ("to_square", "square"), ("to_coast", "coast"), ("to_square", "square"), ("to_station", "station") })
                await Walk(main, exit, to);
            main.Talk.Picks.Enqueue("Show the watch");
            Assert.IsTrue(await main.Place.WalkAndUse("helen"), "The courier can walk up to Helen");
            await Until(() => Game.SavedChapter() == 1 && main.Story == null);
            Assert.AreEqual(1, Game.LanternsOut, "A lantern goes out");
            CollectionAssert.DoesNotContain(Game.Bag, "watch", "Helen keeps the watch");
        }

        static async Awaitable Walk(Main main, string exit, string to)
        {
            // The exit takes the courier as soon as it steps in, before the walk ends.
            await main.Place.WalkAndUse(exit);
            await Until(() => Exploring(main, to));
        }

        static bool Exploring(Main main, string place) =>
            main.Place && main.Place.Def.Id == place && main.Place.Controls && !main.Talk.Open;

        static async Awaitable Until(Func<bool> done)
        {
            while (!done()) await Awaitable.NextFrameAsync();
        }
    }
}
