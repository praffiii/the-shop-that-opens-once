using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Runs the game: the title, the current chapter's story, moving between places, and the screen UI.
    /// While any story step runs, the courier can't move; the controls come back when all are done.
    ///
    /// The world and the UI are drawn into a small screen canvas, at least <see cref="Base"/>, then scaled up by
    /// the largest whole number that fits the window, so pixels stay square and crisp.
    /// </summary>
    public sealed class Main : MonoBehaviour
    {
        /// <summary>Each world pixel covers this many screen-canvas pixels; the UI keeps the finer ones.</summary>
        public const int Zoom = 2;
        /// <summary>The least canvas the screen shows (the world is Base / Zoom).</summary>
        static readonly Vector2 Base = new(640, 360);
        /// <summary>How fast the camera glides to what it is asked to look at, in world px per second.</summary>
        const float Glide = 220f;
        /// <summary>Following the courier: how far ahead of its walk the camera leads (world px), how softly it catches up (seconds), and from how far it jumps instead (a new place, a teleport).</summary>
        const float Lead = 28f, Follow = 0.2f, SnapFrom = 160f;
        /// <summary>Where the title screen looks: Marlow's door in the banyan's roots, down in its dell.</summary>
        static readonly Vector2 TitleView = new(650, 1860);
        const float FadeSeconds = 0.4f;

        static readonly Dictionary<int, Func<Main, Chapter>> Chapters = new()
        {
            [0] = main => new DevChapter(main),
        };

        public static Main Instance { get; private set; }
        /// <summary>For tests: talk lines and cards move on by themselves, and choices take Talk.Picks.</summary>
        public static bool Auto;
        /// <summary>The screen canvas size in canvas px.</summary>
        public static Vector2 Size { get; private set; }
        /// <summary>The mouse on the screen canvas, from its bottom-left, as the UI camera sees it.</summary>
        public static Vector2 UiPoint { get; private set; }

        public Camera Camera { get; private set; }
        public Place Place { get; private set; }
        public Chapter Story { get; private set; }
        public Talk Talk { get; private set; }
        public Hud Hud { get; private set; }
        public Bag Bag { get; private set; }
        public Card Cards { get; private set; }

        Camera present;
        RawImage screen;
        RenderTexture canvas;
        Image logo, curtain;
        Ant courier;
        int held, factor;
        Vector2Int window;
        Vector2 offset, cam, camVelocity, lead, lastFeet;
        Vector2? look; // a world point the camera shows instead of the courier
        bool gliding;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        static void Reset()
        {
            Instance = null;
            Auto = false;
        }

        /// <summary>Runs a story step that nobody awaits, and reports its errors.</summary>
        public static async void Run(Awaitable step)
        {
            try
            {
                await step;
            }
            catch (OperationCanceledException)
            {
                // The game was closed mid-step.
            }
            catch (Exception e)
            {
                Debug.LogException(e);
            }
        }

        public static void Run<T>(Awaitable<T> step) => Run(Done(step));

        static async Awaitable Done<T>(Awaitable<T> step) => await step;

        /// <summary>The next frame; stops the step if the game is closed meanwhile.</summary>
        public static Awaitable Frame() => Awaitable.NextFrameAsync(Instance.destroyCancellationToken);

        public static Awaitable Wait(float seconds) => Awaitable.WaitForSecondsAsync(seconds, Instance.destroyCancellationToken);

        /// <summary>A world point (art px) on the screen canvas (canvas px from the top-left).</summary>
        public static Vector2 ToCanvas(Vector2 world) => (world - Instance.cam) * Zoom + Size / 2;

        void Awake()
        {
            Instance = this;
            Camera = NewCamera("Camera");
            Camera.orthographic = true;
            Camera.gameObject.AddComponent<AudioListener>();
            present = NewCamera("Present");
            present.cullingMask = 0;
            present.depth = 1;

            var ui = new GameObject("Screen", typeof(RectTransform)).AddComponent<Canvas>();
            ui.transform.SetParent(transform, false);
            ui.renderMode = RenderMode.ScreenSpaceCamera;
            ui.worldCamera = Camera;
            ui.planeDistance = 5;
            ui.sortingOrder = BakedArt.Above + 500;
            ui.referencePixelsPerUnit = 1;
            ui.pixelPerfect = true;
            var t = ui.transform;
            logo = Look.Picture("Logo", t);
            Talk = Talk.Create(t);
            Hud = Hud.Create(t);
            Bag = Bag.Create(t);
            Cards = Card.Create(t);
            curtain = Look.Picture("Curtain", t);
            curtain.enabled = true;
            curtain.color = Look.Cream;
            curtain.gameObject.SetActive(false);
            Hud.Top.SetAsLastSibling();

            var shown = new GameObject("Present", typeof(RectTransform)).AddComponent<Canvas>();
            shown.transform.SetParent(transform, false);
            shown.renderMode = RenderMode.ScreenSpaceOverlay;
            screen = new GameObject("Canvas", typeof(RectTransform)).AddComponent<RawImage>();
            screen.transform.SetParent(shown.transform, false);
            screen.raycastTarget = false;
            screen.rectTransform.anchorMin = screen.rectTransform.anchorMax = screen.rectTransform.pivot = Vector2.zero;

            Sound.Create(transform);
            courier = Ant.Create("courier", transform);
            courier.gameObject.SetActive(false);
            courier.Stepped += () => Sound.Step(Place.Def.WoodFloor);
            Talk.Courier = courier;
            Hud.Talk = Talk;
            Game.Noted += OnNoted;
            FitWindow();
            Run(Title());
        }

        void OnDestroy()
        {
            Game.Noted -= OnNoted;
            if (canvas) canvas.Release();
            Destroy(canvas);
            if (Instance == this) Instance = null;
        }

        Camera NewCamera(string camName)
        {
            var c = new GameObject(camName).AddComponent<Camera>();
            c.transform.SetParent(transform, false);
            c.transform.localPosition = new Vector3(0, 0, -10);
            c.clearFlags = CameraClearFlags.SolidColor;
            c.backgroundColor = Color.black;
            c.nearClipPlane = 0.1f;
            c.farClipPlane = 100f;
            return c;
        }

        async Awaitable Title()
        {
            Story = null;
            held = 0;
            Talk.Close();
            if (Place) await Fade(true);
            Swap("world", "");
            await Fade(false);
            Look.SetSprite(logo, Art.Sprite(Art.Texture("ui/title")), Zoom); // the title is world art: world-sized pixels
            Look.Move(logo.rectTransform, new Vector2((Size.x - logo.rectTransform.sizeDelta.x) / 2, 24));
            logo.gameObject.SetActive(true);
            var options = new List<string> { "Begin" };
            var saved = Game.SavedChapter();
            if (saved > 0 && Chapters.ContainsKey(saved)) options.Add("Continue");
            if (Application.platform != RuntimePlatform.WebGLPlayer) options.Add("Quit");
            var pick = options[await Talk.Choose(options.ToArray(), new Vector2(Size.x / 2, Size.y - 74))];
            logo.gameObject.SetActive(false);
            switch (pick)
            {
                case "Begin": await Begin(0); break;
                case "Continue": await Begin(saved); break;
                case "Quit": Application.Quit(); break;
            }
        }

        async Awaitable Begin(int chapter)
        {
            Game.StartChapter(chapter);
            Story = Chapters[chapter](this);
            Hold();
            await Story.Start();
            Release();
        }

        /// <summary>Saves the next chapter and starts it, or thanks the player if it isn't made yet.</summary>
        public async Awaitable EndChapter()
        {
            var next = Game.Chapter + 1;
            Game.Save(next);
            Story = null;
            if (Chapters.ContainsKey(next))
                Run(Later(() => Begin(next)));
            else
            {
                await ShowCard("Thank you for playing.", $"{(next == Game.Epilogue ? "The epilogue" : $"Night {next}")} is still being made.");
                Finish();
            }
        }

        /// <summary>Ends the chapter's story and returns to the title once the current step is over.</summary>
        public void Finish()
        {
            Story = null;
            Run(Later(Title));
        }

        static async Awaitable Later(Func<Awaitable> step)
        {
            await Frame();
            await step();
        }

        public async Awaitable Go(string placeId, string spawn)
        {
            Talk.Close();
            var bell = Place && Place.Def.DoorBell;
            await Fade(true);
            Swap(placeId, spawn);
            if (bell || Place.Def.DoorBell) Sound.Play("bell");
            await Fade(false);
            if (Story == null) return;
            Story.Relabel();
            await Story.Entered(placeId);
        }

        /// <summary>Glides the camera to show a world point, or back to the courier with null. Returns once it is there.</summary>
        public async Awaitable LookAt(Vector2? at)
        {
            look = at;
            Talk.Courier = at == null ? courier : null;
            gliding = true;
            while (gliding && Place) await Frame();
        }

        public async Awaitable ShowCard(params string[] lines)
        {
            Talk.Close();
            await Cards.Show(lines);
        }

        void Swap(string placeId, string spawn)
        {
            courier.transform.SetParent(transform, false);
            courier.gameObject.SetActive(false);
            if (Place)
            {
                Place.gameObject.SetActive(false);
                Destroy(Place.gameObject);
            }
            Place = Place.Build(Places.Get(placeId), transform);
            Place.Used += h => Run(Use(h));
            if (spawn != "")
            {
                courier.gameObject.SetActive(true);
                courier.Pose = "idle";
                courier.Held = null;
                Place.Enter(courier, spawn);
            }
            Hud.Place = Place;
            Sound.Mood(Place.Def.Mood, Place.Def.Indoors);
            Camera.backgroundColor = present.backgroundColor = Grade.Of(Place.World.Bg);
            look = null;
            gliding = false;
            FrameCamera(0f);
        }

        async Awaitable Use(Hotspot h)
        {
            Hold();
            if (h.ExitTo != null)
            {
                var to = h.ExitTo.Split('/');
                await Go(to[0], to[1]);
            }
            else if (Story != null)
            {
                if (h.Owner && h.Owner.Pose == "idle") h.Owner.FaceTo(courier.Feet.x);
                await Story.Interact(h.Id);
            }
            Release();
        }

        async Awaitable OpenBag()
        {
            if (!Place || !Place.Controls) return;
            Hold();
            await Bag.Show();
            Release();
        }

        async Awaitable Pause()
        {
            Hold();
            var options = new[] { "Keep playing", Sound.Muted ? "Sound on" : "Sound off", "Back to the title" };
            switch (await Talk.Choose(options, Size / 2 - new Vector2(0, 32)))
            {
                case 1: Sound.Muted = !Sound.Muted; break;
                case 2: Finish(); break;
            }
            Release();
        }

        void OnNoted(string text)
        {
            Hud.Toast("Added to your notes.");
            Sound.Play("page");
        }

        void Hold()
        {
            held++;
            if (Place) Place.Controls = false;
        }

        void Release()
        {
            held = Mathf.Max(held - 1, 0);
            if (held > 0) return;
            Talk.Close();
            if (Story != null && Place && Place.Player) Place.Controls = true;
        }

        // Input goes to the first one open: a card, the bag, the talk box, then the HUD and the place.
        void Update()
        {
            if (Screen.width != window.x || Screen.height != window.y) FitWindow();
            var p = (Controls.PointerScreen - offset) / factor;
            UiPoint = p;
            Controls.MouseCanvas = new Vector2(Mathf.Floor(p.x), Mathf.Floor(Size.y - p.y));
            Controls.MouseWorld = cam + (Controls.MouseCanvas - Size / 2) / Zoom;

            var input = !(Cards.Handle() || Bag.Handle() || Talk.Handle());
            if (input && Hud.Handle())
            {
                Run(OpenBag());
                input = false;
            }
            if (input && Place && Place.Controls)
            {
                if (Controls.Bag)
                {
                    Run(OpenBag());
                    input = false;
                }
                else if (Controls.Cancel)
                {
                    Run(Pause());
                    input = false;
                }
            }
            if (Place) Place.Tick(input);
            Talk.Tick();
        }

        // After everyone has moved this frame.
        void LateUpdate()
        {
            if (Place) FrameCamera(Time.deltaTime);
            Hud.Tick();
        }

        // Scales the canvas by the largest whole number that still shows Base, and lets the canvas grow to fill the
        // rest of the window, so pixels stay square with no bars around the game. The canvas size is kept even so
        // the camera's centre falls on a canvas pixel edge.
        void FitWindow()
        {
            window = new Vector2Int(Screen.width, Screen.height);
            factor = Mathf.Max(1, Mathf.FloorToInt(Mathf.Min(window.x / Base.x, window.y / Base.y)));
            int w = window.x / factor & ~1, h = window.y / factor & ~1;
            Size = new Vector2(w, h);
            Camera.targetTexture = null;
            if (canvas)
            {
                canvas.Release();
                Destroy(canvas);
            }
            canvas = new RenderTexture(w, h, 24) { name = "Screen canvas", filterMode = FilterMode.Point };
            Camera.targetTexture = canvas;
            Camera.orthographicSize = h / (2f * Zoom);
            screen.texture = canvas;
            screen.rectTransform.sizeDelta = new Vector2(w, h) * factor;
            offset = new Vector2((window.x - w * factor) / 2, (window.y - h * factor) / 2);
            screen.rectTransform.anchoredPosition = offset;
            Look.Place(curtain.rectTransform, new Rect(Vector2.zero, Size));
        }

        // Follows the courier softly, a little ahead of where it walks (or looks where it was asked, or at the title
        // view), kept inside the place. A place smaller than the screen is centred. The camera stays on whole world pixels.
        void FrameCamera(float delta)
        {
            var view = Size / Zoom;
            var size = (Vector2)Place.World.Size;
            var following = look == null && Place.Player;
            var target = look ?? (Place.Player ? courier.Feet : TitleView);
            if (following)
            {
                var step = courier.Feet - lastFeet;
                lastFeet = courier.Feet;
                var walking = step.sqrMagnitude > 0.0001f && step.magnitude < 20f;
                lead = Vector2.MoveTowards(lead, walking ? step.normalized * Lead : Vector2.zero, Lead * 2f * delta);
                target += lead;
            }
            var c = new Vector2(Mathf.Round(target.x), Mathf.Round(target.y));
            for (var axis = 0; axis < 2; axis++)
                c[axis] = size[axis] <= view[axis]
                    ? Mathf.Round(size[axis] / 2)
                    : Mathf.Clamp(c[axis], Mathf.Round(view[axis] / 2), size[axis] - Mathf.Round(view[axis] / 2));
            if (gliding)
            {
                cam = Vector2.MoveTowards(cam, c, Glide * delta);
                gliding = cam != c;
            }
            else if (following && delta > 0f && Vector2.Distance(cam, c) < SnapFrom)
                cam = Vector2.SmoothDamp(cam, c, ref camVelocity, Follow, Mathf.Infinity, delta);
            else
            {
                cam = c;
                camVelocity = lead = Vector2.zero;
            }
            Camera.transform.localPosition = Art.World(new Vector2(Mathf.Round(cam.x), Mathf.Round(cam.y)), -10);
        }

        // Covers the screen in warm cream (or uncovers it) in four soft steps.
        async Awaitable Fade(bool cover)
        {
            curtain.gameObject.SetActive(true);
            for (var t = 0f; t < FadeSeconds; t += Time.deltaTime)
            {
                var v = cover ? t / FadeSeconds : 1 - t / FadeSeconds;
                curtain.color = new Color(Look.Cream.r, Look.Cream.g, Look.Cream.b, Mathf.Round(v * 4) / 4);
                await Frame();
            }
            curtain.color = new Color(Look.Cream.r, Look.Cream.g, Look.Cream.b, cover ? 1 : 0);
            curtain.gameObject.SetActive(cover);
        }
    }
}
