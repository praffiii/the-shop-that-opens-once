using System;
using System.Collections;
using System.Runtime.CompilerServices;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace Shop.Tests
{
    /// <summary>
    /// Each night's own story from the bell to bed, with no one at the keyboard: its leads, its minigames (each failed
    /// once, then won), the keepsake changing in the bag as the day goes, and the handover at dusk.
    /// </summary>
    public sealed class NightsTest
    {
        const float TimeLimit = 170f; // real seconds, under the runner's own timeout
        static int waitingAt;

        [UnityTest, Timeout(240000)]
        public IEnumerator Night1PlaysThrough() => Run(1, async main =>
        {
            await Go(main, "square", "from_station");
            Assert.IsTrue(Game.Has("rumour"), "The square's morning gossip");
            await Use(main, "valdo");
            await Use(main, "mia");
            await Go(main, "bakery", "door");
            Board.FailFirst = 1;
            await Use(main, "baker");
            Assert.AreEqual(Phase.Midday, Game.Phase, "The Baker's minigame moves the day on");
            CollectionAssert.Contains(Game.Bag, "bread");

            await Go(main, "coast", "from_square");
            await Use(main, "arlo");
            CollectionAssert.AreEqual(new[] { "watch", "damar_oil" }, Game.Bag.FindAll(k => k is "watch" or "damar_oil" or "bread"), "The loaf traded for the oil");
            await Go(main, "forge", "door");
            Board.FailFirst = 1;
            await Use(main, "mender");
            Assert.AreEqual(Phase.Dusk, Game.Phase);
            CollectionAssert.IsSupersetOf(Game.Bag, new[] { "watch_ticking", "oil_lantern" }, "The watch ticks, and the Mender lends his lantern");
            CollectionAssert.DoesNotContain(Game.Bag, "watch");
            Assert.AreEqual("dusk", Game.Checkpoint);

            await Go(main, "station", "from_square");
            for (var i = 0; i < 3; i++) await Use(main, $"lantern_post_{i}");
            await Use(main, "helen");
            Assert.AreEqual(1, Game.LanternsOut, "Helen has her watch");
            CollectionAssert.DoesNotContain(Game.Bag, "watch_ticking");
        });

        [UnityTest, Timeout(240000)]
        public IEnumerator Night2PlaysThrough() => Run(2, async main =>
        {
            await Go(main, "square", "from_east");
            Assert.IsTrue(Game.Has("rumour"), "The square's morning gossip");
            await Use(main, "valdo");
            await Use(main, "kiko");
            await Use(main, "mia");
            Assert.AreEqual(Phase.Midday, Game.Phase, "Mia sends him to mend the rabbit");

            await Go(main, "east", "from_square");
            await Use(main, "pip");
            CollectionAssert.Contains(Game.Bag, "rabbit", "Pip isn't given his rabbit broken");
            await Use(main, "nora");
            CollectionAssert.IsSupersetOf(Game.Bag, new[] { "red_thread", "button" });
            Board.FailFirst = 1;
            await Use(main, "gardener");
            CollectionAssert.Contains(Game.Bag, "chamomile");

            await Go(main, "satria_home", "door");
            Board.FailFirst = 1;
            await Use(main, "sewing");
            Assert.AreEqual(Phase.Dusk, Game.Phase);
            CollectionAssert.Contains(Game.Bag, "rabbit_mended", "Mochi mended at Mother's machine");
            CollectionAssert.IsEmpty(Game.Bag.FindAll(k => k is "rabbit" or "red_thread" or "button" or "chamomile"), "The thread, button and chamomile used up");
            Assert.AreEqual("dusk", Game.Checkpoint);

            await Go(main, "east", "home");
            await Use(main, "pip");
            Assert.AreEqual(2, Game.LanternsOut, "Pip has his rabbit");
            CollectionAssert.DoesNotContain(Game.Bag, "rabbit_mended");
        });

        [UnityTest, Timeout(240000)]
        public IEnumerator Night3PlaysThrough() => Run(3, async main =>
        {
            await Go(main, "coast", "from_square");
            Assert.IsTrue(Game.Has("rumour"), "The coffee stall's morning rumour");
            await Use(main, "valdo");
            await Use(main, "leo");
            await Go(main, "salt_store", "door");
            await Use(main, "arlo");
            Assert.AreEqual(Phase.Midday, Game.Phase, "Arlo's rope opens the climb");
            CollectionAssert.Contains(Game.Bag, "rope");

            await Go(main, "coast", "salt_store_door");
            Board.FailFirst = 1;
            await Use(main, "mint_cliff");
            CollectionAssert.Contains(Game.Bag, "mint");
            CollectionAssert.DoesNotContain(Game.Bag, "rope", "The rope left for Arlo");
            await Use(main, "coffee_stall");
            CollectionAssert.Contains(Game.Bag, "mint_tea");
            Board.FailFirst = 1;
            await Use(main, "vent");
            Assert.AreEqual("theo_studio", main.Place.Def.Id, "Theo lets him in");
            Assert.AreEqual(Phase.Dusk, Game.Phase, "The reel developed");
            CollectionAssert.Contains(Game.Bag, "camera_clean");
            CollectionAssert.IsEmpty(Game.Bag.FindAll(k => k is "camera" or "mint" or "mint_tea"));
            Assert.AreEqual("dusk", Game.Checkpoint);

            await Use(main, "theo");
            Assert.AreEqual(3, Game.LanternsOut, "Theo has Daniel's camera");
            Assert.AreEqual("coast", main.Place.Def.Id, "Out on the bluff for the last light");
            CollectionAssert.DoesNotContain(Game.Bag, "camera_clean");
        });

        [UnityTest, Timeout(240000)]
        public IEnumerator Night4PlaysThrough() => Run(4, async main =>
        {
            Assert.IsTrue(Main.Raining, "The drizzle lasts the morning");
            await Go(main, "hall", "door");
            Assert.IsTrue(Game.Has("rumour"), "The lobby's rumour by the buckets");
            await Use(main, "valdo");
            await Go(main, "station", "from_square");
            await Use(main, "bram");
            Assert.AreEqual(Phase.Midday, Game.Phase, "Bram names the door");
            Assert.IsFalse(Main.Raining, "The rain stops at midday");

            await Go(main, "hall_vault", "stair");
            Assert.IsTrue(Game.Has("plea"), "Sam's plea at the jammed pump");
            Board.FailFirst = 1;
            await Use(main, "pump");
            CollectionAssert.Contains(Game.Bag, "key_turned", "The key worn bright by the tumblers");
            CollectionAssert.DoesNotContain(Game.Bag, "key");
            Board.FailFirst = 1;
            await Use(main, "table");
            Assert.AreEqual(Phase.Dusk, Game.Phase, "The sheets saved");
            Assert.AreEqual("dusk", Game.Checkpoint);

            await Use(main, "sam");
            Assert.AreEqual(4, Game.LanternsOut, "Sam has his key");
            Assert.AreEqual("square", main.Place.Def.Id, "Up on the hall's steps for the last light");
            CollectionAssert.Contains(Game.Bag, "register");
            CollectionAssert.DoesNotContain(Game.Bag, "key_turned");
        });

        [UnityTest, Timeout(240000)]
        public IEnumerator Night5PlaysThrough() => Run(5, async main =>
        {
            await Go(main, "square", "from_east");
            Assert.IsTrue(Game.Has("rumour"), "The market's talk of Leo's knees");
            await Use(main, "valdo");
            await Use(main, "breadboy");
            Assert.AreEqual(Phase.Midday, Game.Phase, "The lad names the Mender");

            await Go(main, "forge", "door");
            Board.FailFirst = 1;
            await Use(main, "mender");
            CollectionAssert.Contains(Game.Bag, "shoes_mended", "The shoes resoled");
            CollectionAssert.DoesNotContain(Game.Bag, "shoes");
            Assert.AreEqual(Phase.Dusk, Game.Phase);
            Assert.AreEqual("dusk", Game.Checkpoint);

            Board.FailFirst = 1;
            await Go(main, "east", "from_square");
            await Until(() => Exploring(main));
            Assert.AreEqual(5, Game.LanternsOut, "Leo has his shoes");
            CollectionAssert.DoesNotContain(Game.Bag, "shoes_mended");
        });

        [UnityTest, Timeout(240000)]
        public IEnumerator Night6PlaysThrough() => Run(6, async main =>
        {
            await Use(main, "radio");
            Assert.IsTrue(Game.Has("valdo_refused"), "Valdo turned away at the door");
            Assert.AreEqual(Phase.Midday, Game.Phase);
            Board.FailFirst = 1;
            await Use(main, "radio");
            CollectionAssert.Contains(Game.Bag, "savings_book", "Behind the radio");
            Board.FailFirst = 1;
            await Use(main, "table");
            CollectionAssert.Contains(Game.Bag, "ledger_balanced", "Paid in full");
            Assert.AreEqual(Phase.Dusk, Game.Phase);

            await Use(main, "bed");
            Assert.AreEqual(Phase.Night, Game.Phase, "The evening waited out at home");
            await Go(main, "shop", "door");
            await Until(() => Exploring(main));
            Assert.AreEqual(6, Game.LanternsOut, "Marlow has his ledger");
            CollectionAssert.DoesNotContain(Game.Bag, "ledger_balanced");
            CollectionAssert.Contains(Game.Bag, "savings_book");
        });

        [UnityTest, Timeout(240000)]
        public IEnumerator Night7PlaysThrough() => Run(7, async main =>
        {
            Assert.AreEqual(Phase.Morning, Game.Phase, "The last day comes before its box");
            await Use(main, "water_jar");
            await Use(main, "stove");
            await Use(main, "table");
            await Go(main, "square", "from_east");
            await Use(main, "valdo");
            Assert.AreEqual(Phase.Midday, Game.Phase, "Valdo stood up to");

            await Go(main, "station", "from_square");
            await Use(main, "helen");
            Assert.IsTrue(Game.Has("told_helen"), "Marcus's message given");
            await Go(main, "satria_home", "door");
            await Until(() => Exploring(main));
            Assert.AreEqual(Phase.Night, Game.Phase, "Dusk at the sewing table, till the seventh bell");

            await Go(main, "shop", "door");
            await Until(() => Exploring(main));
            CollectionAssert.IsSupersetOf(Game.Bag, new[] { "musicbox", "letter" }, "The last box: FOR THE COURIER");
            await Go(main, "satria_home", "door");
            await Use(main, "desk");
            await Use(main, "stove");
            Board.FailFirst = 1;
            await Use(main, "sewing");
            CollectionAssert.IsSupersetOf(Game.Bag, new[] { "musicbox_open", "photo", "letter_read" }, "The drawer opened and the letter read");
            Assert.AreEqual(7, Game.LanternsOut, "The last lantern out");
            await Go(main, "east", "satria_home_door");
        }, boxFirst: false);

        // Plays a night: woken at home, the box from Marlow, the routine, the morning's tea, `day` for the night's own
        // story, and home to the journal, which ends the night. Night 7 plays its day first: `day` is all of it, to the
        // door at dawn.
        static IEnumerator Run(int night, Func<Main, Awaitable> day, bool boxFirst = true)
        {
            var saved = Game.Raw;
            Main main = null;
            try
            {
                Main.Auto = true;
                Time.timeScale = 8f;
                main = new GameObject("Main").AddComponent<Main>();
                main.Talk.Picks.Enqueue("Quit"); // leaves the title, for the night to begin
                var playing = Play(main, night, day, boxFirst);
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
                Board.FailFirst = 0;
                if (main) UnityEngine.Object.Destroy(main.gameObject);
                Time.timeScale = 1f;
                Main.Auto = false;
                Game.Raw = saved;
            }
        }

        static async Awaitable Play(Main main, int night, Func<Main, Awaitable> day, bool boxFirst)
        {
            await Until(() => main.Talk.Picks.Count == 0);
            Game.NewGame();
            await main.Begin(night);
            if (boxFirst)
            {
                await Go(main, "shop", "door");
                await Go(main, "satria_home", "door");
                foreach (var step in new[] { "table", "water_jar", "coil", "bed" }) await Use(main, step);
                await Until(() => Exploring(main) && Game.Phase == Phase.Morning);
                await Use(main, "stove");
            }
            var story = main.Story;
            await day(main);
            if (boxFirst) await Go(main, "satria_home", "door");
            await Until(() => Game.SavedChapter() == night + 1 && main.Story != story); // over, and the next night begun or saved for later
        }

        // Takes the courier somewhere as the story would, and once there closes the talk and gives back the controls, as
        // stepping through an exit does.
        static async Awaitable Go(Main main, string place, string spawn)
        {
            await main.Go(place, spawn);
            main.Talk.Close();
            main.Story?.Wrap();
            if (main.Story != null) main.Place.Controls = true;
        }

        // Uses a hotspot as a click would, and waits for its scene to be over.
        static async Awaitable Use(Main main, string id, [CallerLineNumber] int line = 0)
        {
            Assert.IsTrue(await main.Place.WalkAndUse(id), $"Could not reach {id}");
            await Until(() => Exploring(main), line);
        }

        static bool Exploring(Main main) => main.Place && main.Place.Controls && !main.Talk.Open && !main.Board.Open;

        static async Awaitable Until(Func<bool> done, [CallerLineNumber] int line = 0)
        {
            waitingAt = line;
            while (!done()) await Awaitable.NextFrameAsync();
        }
    }
}
