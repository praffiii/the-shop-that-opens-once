using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// The settings, kept from one session to the next: the music's, the sounds' and the voices' volume (ten pips each),
    /// how fast talk types out, the language (<see cref="Lang"/>), and the screen, fullscreen or in a window. They are
    /// set on a paper page over the dimmed world, "Settings" on a nailed wood plate over its top edge and the keys drawn
    /// as key caps under the rows: W / S or the mouse picks a row, A / D or a click changes it (a click on a pip sets the
    /// volume there), Esc or Back closes the page. Await <see cref="Show"/>; while it is open it takes the keys.
    /// </summary>
    public sealed class Settings : MonoBehaviour
    {
        public const int Steps = 10;
        const float Width = 270f, Pad = 14f, Row = 18f, Values = 130f, Gap = 10f, Dim = 0.55f;
        static readonly string[] Names = { "Music", "Sounds", "Voices", "Text speed", "Language", "Screen", "Back" };
        static readonly string[] Speeds = { "Slow", "Normal", "Fast" };
        static readonly float[] Paces = { .6f, 1f, 1.8f };
        const int Speed = 3, Language = 4, Window = 5, Back = 6;

        /// <summary>The music's volume, 0 to <see cref="Steps"/>.</summary>
        public static int Music { get => Get("music", Steps); set => Set("music", value); }
        /// <summary>The sound effects', the wind's and the ambience's volume, 0 to <see cref="Steps"/>.</summary>
        public static int Sounds { get => Get("sounds", Steps); set => Set("sounds", value); }
        /// <summary>The voices' blips' volume, 0 to <see cref="Steps"/>.</summary>
        public static int Voices { get => Get("voices", Steps); set => Set("voices", value); }
        /// <summary>How fast talk types out: Slow, Normal or Fast, 0 to 2.</summary>
        public static int TextSpeed { get => Mathf.Clamp(Get("text", 1), 0, 2); set => Set("text", value); }
        /// <summary>The factor on each speaker's own pace for <see cref="TextSpeed"/>.</summary>
        public static float Pace => Paces[TextSpeed];

        /// <summary>A volume as the ear hears it: the pips' share, squared, so each pip sounds about as big a step.</summary>
        public static float Volume(int pips) => pips * pips / (float)(Steps * Steps);

        static int Get(string key, int start) => PlayerPrefs.GetInt(key, start);

        static void Set(string key, int value)
        {
            PlayerPrefs.SetInt(key, value);
            PlayerPrefs.Save();
        }

        Image dim, sheet, plate, mark;
        Text title, back;
        readonly Text[] values = new Text[Names.Length];
        readonly Pips[] pips = new Pips[3];
        RectTransform keys;
        int sel;
        bool windowed; // as set: the screen changes mode only at the end of the frame
        Vector2 lastMouse;

        public static Settings Create(Transform parent)
        {
            var s = Look.Node("Settings", parent).gameObject.AddComponent<Settings>();
            s.dim = Look.Block("dim", s.transform, default, new Color(0, 0, 0, Dim));
            s.sheet = Look.Panel("panel", s.transform);
            s.plate = Look.Panel("plate", s.transform);
            s.title = Look.Label("Settings", s.plate.transform, default, Art.Color((string)Look.Ui["plate"]["text"]));
            s.mark = Look.Panel("choice", s.sheet.transform);
            for (var i = 0; i < Names.Length; i++)
            {
                var name = Look.Label(Names[i], s.sheet.transform, default, i == Back ? Look.Ink : Look.Soft);
                Look.Move(name.rectTransform, new Vector2(Pad + 4, Pad + 2 + i * Row));
                if (i == Back) s.back = name;
                if (i < 3) s.pips[i] = new Pips(s.sheet.transform, new Vector2(Width - Pad - 4 - Pips.Width(Steps), Pad + 4 + i * Row), Steps);
                else if (i < Back) s.values[i] = Look.Label("", s.sheet.transform, default, Look.Ink);
            }
            s.gameObject.SetActive(false);
            return s;
        }

        public bool Open => gameObject.activeSelf;

        /// <summary>Takes the keys while the page is open (it reads them itself).</summary>
        public bool Handle() => Open;

        public async Awaitable Show()
        {
            var view = Main.Size;
            Look.Place(dim.rectTransform, new Rect(Vector2.zero, view));
            for (var i = 0; i < 3; i++) pips[i].Count = Level(i);
            windowed = Screen.fullScreenMode == FullScreenMode.Windowed;
            Layout();
            Select(0);
            lastMouse = Controls.MouseCanvas;
            gameObject.SetActive(true);
            Sound.Play("page");
            for (var done = false; !done;)
            {
                await Main.Frame();
                var hover = -1;
                for (var i = 0; i < Names.Length; i++)
                    if (Look.Hit(RowRect(i))) hover = i;
                if (hover >= 0 && (Controls.MouseCanvas != lastMouse || Controls.Click)) Select(hover);
                lastMouse = Controls.MouseCanvas;
                if (Controls.Up) Select((sel + Names.Length - 1) % Names.Length);
                else if (Controls.Down) Select((sel + 1) % Names.Length);
                var clicked = Controls.Click && hover >= 0;
                if (Controls.Cancel || (sel == Back && (Controls.Interact || clicked))) done = true;
                else if (clicked && sel < 3) Change(sel, PipAt(sel) - Level(sel));
                else if ((clicked || Controls.Interact) && sel >= Speed) Change(sel, 1);
                else if (Controls.Right || Controls.Left) Change(sel, Controls.Right ? 1 : -1);
            }
            gameObject.SetActive(false);
            await Main.Frame(); // the key that closed the page is not read again behind it
        }

        // A volume row's pips.
        static int Level(int row) => row == 0 ? Music : row == 1 ? Sounds : Voices;

        // Moves a row's setting on by step: a volume up or down a pip, the text speed or the screen round.
        void Change(int row, int step)
        {
            if (row == Back) return;
            if (row < 3)
            {
                var v = Mathf.Clamp(Level(row) + step, 0, Steps);
                if (v == Level(row)) return;
                if (row == 0) Music = v;
                else if (row == 1) Sounds = v;
                else Voices = v;
                pips[row].Count = v;
                if (row == 2) Sound.Blip("courier", 1f); // heard at the new volume
                else Sound.Play("tick");
                return;
            }
            if (row == Speed) TextSpeed = (TextSpeed + step + Speeds.Length) % Speeds.Length;
            else if (row == Language) Lang.Current = (Lang.Current + step + Lang.Names.Length) % Lang.Names.Length; // the page too, at once
            else if (row == Window) Screen.fullScreenMode = (windowed = !windowed) ? FullScreenMode.Windowed : FullScreenMode.FullScreenWindow;
            if (row == Language) Layout();
            else Show(row);
            Sound.Play("tick");
        }

        // The page laid out round its words, which are as long as the language makes them.
        void Layout()
        {
            var view = Main.Size;
            if (keys) Destroy(keys.gameObject); // the key caps line up after the widest words
            keys = Board.Keys(sheet.transform, new[] { ("W/S", "Choose"), ("A/D", "Change"), ("Esc", "Back") });
            var height = Pad + Names.Length * Row + Gap + keys.sizeDelta.y + Pad;
            var at = new Vector2(Mathf.Round((view.x - Width) / 2), Mathf.Round((view.y - height) / 2));
            Look.Place(sheet.rectTransform, new Rect(at, new Vector2(Width, height)));
            Look.Place(plate.rectTransform, new Rect(Mathf.Round(at.x + (Width - Look.Width(title) - 24) / 2), at.y - 9, Look.Width(title) + 24, 17));
            Look.Move(title.rectTransform, new Vector2(12, 1));
            Look.Move(back.rectTransform, new Vector2(Mathf.Round((Width - Look.Width(back)) / 2), Pad + 2 + Back * Row));
            Look.Move(keys, new Vector2(Mathf.Round((Width - keys.sizeDelta.x) / 2), Pad + Names.Length * Row + Gap));
            for (var row = Speed; row < Back; row++) Show(row);
        }

        // The text speed's, the language's or the screen's value, between arrows, at the row's right end (a language by its own name).
        void Show(int row)
        {
            var value = row == Speed ? Lang.T(Speeds[TextSpeed]) : row == Language ? Lang.Names[Lang.Current] : Lang.T(windowed ? "Window" : "Fullscreen");
            Look.SetText(values[row], Lang.F("<  {0}  >", value));
            Look.Move(values[row].rectTransform, new Vector2(Width - Pad - 4 - Values + Mathf.Round((Values - Look.Width(values[row])) / 2), Pad + 2 + row * Row));
        }

        void Select(int row)
        {
            sel = row;
            Look.Place(mark.rectTransform, new Rect(Pad - 2, Pad + row * Row, Width - 2 * Pad + 4, Row));
        }

        // A row of the page on the screen canvas.
        Rect RowRect(int row) => new(Look.Pos(sheet.rectTransform) + new Vector2(Pad - 2, Pad + row * Row), new Vector2(Width - 2 * Pad + 4, Row));

        // How many pips the mouse is up to on a volume row: past the last lit one sets it there, before the first, none.
        int PipAt(int row)
        {
            var x = Controls.MouseCanvas.x - Look.Pos(sheet.rectTransform).x - (Width - Pad - 4 - Pips.Width(Steps));
            return Mathf.Clamp(Mathf.CeilToInt(x / (Pips.Width(Steps) / Steps)), 0, Steps);
        }
    }
}
