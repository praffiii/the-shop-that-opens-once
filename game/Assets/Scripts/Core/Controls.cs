using UnityEngine;
using UnityEngine.InputSystem;

namespace Shop
{
    /// <summary>
    /// The keys and the mouse. Main sets the mouse positions each frame: on the screen canvas (UI pixels, y down)
    /// and in the world (art pixels, y down).
    /// </summary>
    public static class Controls
    {
        public static Vector2 MouseCanvas;
        public static Vector2 MouseWorld;

        static Keyboard Keys => Keyboard.current;
        static Mouse Pointer => Mouse.current;

        static bool Pressed(params Key[] keys)
        {
            if (Keys == null) return false;
            foreach (var k in keys)
                if (Keys[k].wasPressedThisFrame) return true;
            return false;
        }

        static bool Held(Key a, Key b) => Keys != null && (Keys[a].isPressed || Keys[b].isPressed);

        public static bool Click => Pointer != null && Pointer.leftButton.wasPressedThisFrame;
        /// <summary>Space or Enter: use what is close, show the whole line, pick the choice.</summary>
        public static bool Interact => Pressed(Key.Space, Key.Enter, Key.NumpadEnter);
        /// <summary>Space or Enter held down, as a treadle is pumped (Night 2's sewing).</summary>
        public static bool Holding => Held(Key.Space, Key.Enter);
        public static bool Bag => Pressed(Key.E);
        public static bool Inspect => Pressed(Key.I);
        public static bool Cancel => Pressed(Key.Escape);
        public static bool Retry => Pressed(Key.R);
        /// <summary>F5: the time of day moves on (developer builds only).</summary>
        public static bool NextPhase => Pressed(Key.F5);
        public static bool Up => Pressed(Key.W, Key.UpArrow);
        public static bool Down => Pressed(Key.S, Key.DownArrow);
        public static bool Left => Pressed(Key.A, Key.LeftArrow);
        public static bool Right => Pressed(Key.D, Key.RightArrow);
        /// <summary>Shift: the courier switches between walking and running.</summary>
        public static bool Pace => Pressed(Key.LeftShift, Key.RightShift);

        /// <summary>Whether the courier runs (outdoors only), kept for the next time the game starts.</summary>
        public static bool Running
        {
            get => PlayerPrefs.GetInt("run") == 1;
            set
            {
                PlayerPrefs.SetInt("run", value ? 1 : 0);
                PlayerPrefs.Save();
            }
        }

        /// <summary>The walking direction from WASD or the arrow keys, y down, at most length 1.</summary>
        public static Vector2 Move
        {
            get
            {
                var x = (Held(Key.D, Key.RightArrow) ? 1 : 0) - (Held(Key.A, Key.LeftArrow) ? 1 : 0);
                var y = (Held(Key.S, Key.DownArrow) ? 1 : 0) - (Held(Key.W, Key.UpArrow) ? 1 : 0);
                return new Vector2(x, y).normalized;
            }
        }

        public static Vector2 PointerScreen => Pointer != null ? Pointer.position.ReadValue() : Vector2.zero;
    }
}
