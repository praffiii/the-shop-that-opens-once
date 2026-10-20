using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.TestTools;

namespace Shop.Tests
{
    /// <summary>Holding Shift with a direction key runs: the run pose, at the run speed.</summary>
    public sealed class RunTest
    {
        [UnityTest]
        public IEnumerator ShiftRuns()
        {
            var saved = Game.Raw;
            // The editor may be unfocused while tests run; let the virtual keyboard reach the game anyway.
            var settings = InputSystem.settings;
            var (editor, background) = (settings.editorInputBehaviorInPlayMode, settings.backgroundBehavior);
            settings.editorInputBehaviorInPlayMode = InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
            settings.backgroundBehavior = InputSettings.BackgroundBehavior.IgnoreFocus;
            var keyboard = InputSystem.AddDevice<Keyboard>();
            Main.Auto = true;
            var main = new GameObject("Main").AddComponent<Main>();
            main.Talk.Picks.Enqueue(Main.SystemsTest); // it starts at the station, with open ground to its east
            try
            {
                var end = Time.realtimeSinceStartup + 60f;
                while (!(main.Place && main.Place.Def.Id == "station" && main.Place.Controls && !main.Talk.Open))
                {
                    Assert.Less(Time.realtimeSinceStartup, end, "The station never got the controls");
                    yield return null;
                }
                var player = main.Place.Player;
                InputSystem.QueueStateEvent(keyboard, new KeyboardState(Key.LeftShift, Key.D));
                yield return null;
                var (from, start) = (player.Feet, Time.time);
                yield return new WaitForSeconds(0.5f);
                var speed = (player.Feet.x - from.x) / (Time.time - start);

                Assert.AreEqual("run", player.Pose);
                Assert.Greater(speed, (Ant.Speed + Ant.RunSpeed) / 2, "Running is faster than walking");
            }
            finally
            {
                InputSystem.QueueStateEvent(keyboard, new KeyboardState());
                Object.Destroy(main.gameObject);
                InputSystem.RemoveDevice(keyboard);
                settings.editorInputBehaviorInPlayMode = editor;
                settings.backgroundBehavior = background;
                Main.Auto = false;
                Game.Raw = saved;
            }
        }
    }
}
