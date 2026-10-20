using System;
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace Shop.Tests
{
    /// <summary>
    /// A minigame from start to win with no one at the keyboard (the systems test's strike at the Mender's forge): it
    /// opens on its board with the world's controls held, a fail brings its line and a fresh start, and the win closes
    /// the board and hands back to the story.
    /// </summary>
    public sealed class MinigameTest
    {
        const float TimeLimit = 60f; // real seconds

        [UnityTest]
        public IEnumerator FailThenRetryThenWin()
        {
            var saved = Game.Raw;
            Main main = null;
            try
            {
                Main.Auto = true;
                Time.timeScale = 4f;
                main = new GameObject("Main").AddComponent<Main>();
                main.Talk.Picks.Enqueue(Main.SystemsTest);
                var end = Time.realtimeSinceStartup + TimeLimit;
                bool Wait(Func<bool> done)
                {
                    Assert.Less(Time.realtimeSinceStartup, end, "The minigame timed out");
                    return !done();
                }

                while (Wait(() => Exploring(main))) yield return null;
                Board.FailFirst = 1;
                var walking = main.Place.WalkAndUse("mender");
                while (Wait(() => main.Board.Open)) yield return null;
                Assert.IsFalse(main.Place.Controls, "The world (and its bag) waits while the minigame is played");
                while (Wait(() => Exploring(main))) yield return null;

                Assert.IsTrue(walking.GetAwaiter().GetResult(), "The Mender was reached");
                Assert.AreEqual(0, Board.FailFirst, "One go failed and was tried again");
                Assert.IsTrue(Game.Has("struck"), "The win hands back to the story");
                Assert.IsFalse(main.Board.Open);
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

        static bool Exploring(Main main) =>
            main.Place && main.Place.Def.Id == "station" && main.Place.Controls && !main.Talk.Open && !main.Board.Open;
    }
}
