using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// Runs the game: the title, the current chapter's story, moving between places, and the screen UI.
    /// While any story step runs, the courier can't move; the controls come back when all are done.
    ///
    /// The world is drawn in 3D at the window's full resolution, through a camera tilted down (<see cref="Art.Pitch"/>)
    /// in a gentle perspective, with depth of field, bloom and a vignette: the HD-2D look. The UI is drawn into
    /// a small screen canvas, at least <see cref="Base"/>, then scaled up over the world by the largest whole number
    /// that fits the window, so its pixels stay square and crisp.
    /// </summary>
    public sealed class Main : MonoBehaviour
    {
        /// <summary>Art drawn over the screen (the title, prompts) shows each of its pixels this many screen-canvas pixels.</summary>
        public const int Zoom = 2;
        /// <summary>
        /// Each world pixel covers this many screen-canvas pixels at the camera's focus: the camera stands back, as
        /// Octopath's does, so the courier is small in a wide view of the place.
        /// </summary>
        const int WorldZoom = 1;
        /// <summary>How far past a place's edge (art px) the camera may look, so the courier is never pinned to the screen's edge; there the forest goes on.</summary>
        const float Overscan = 96f;
        /// <summary>The view camera's vertical field of view, in degrees; it looks down at <see cref="Art.Pitch"/>.</summary>
        const float Fov = 42f;
        /// <summary>The depth of field (blur grows as 1 / distance², so the aperture follows the camera's distance): a long lens keeps a band round the courier sharp and blurs what is nearer and farther, like a miniature.</summary>
        const float FocalLength = 150f, Aperture = 3.2f;
        const int UiLayer = 5;
        /// <summary>The least canvas the screen shows (the world is Base / WorldZoom).</summary>
        static readonly Vector2 Base = new(640, 360);
        /// <summary>How fast the camera glides to what it is asked to look at, in world px per second.</summary>
        const float Glide = 220f;
        /// <summary>Following the courier: how far ahead of its walk the camera leads (world px), how softly it catches up (seconds), and from how far it jumps instead (a new place, a teleport).</summary>
        const float Lead = 28f, Follow = 0.2f, SnapFrom = 160f;
        /// <summary>Where the title screen looks: Marlow's door in the banyan's roots, in its grove.</summary>
        const string TitlePlace = "grove";
        static readonly Vector2 TitleView = new(300, 236);
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

        /// <summary>Draws the UI into the screen canvas.</summary>
        public Camera Camera { get; private set; }
        /// <summary>Draws the world.</summary>
        public Camera View { get; private set; }
        public Place Place { get; private set; }
        public Chapter Story { get; private set; }
        public Talk Talk { get; private set; }
        public Hud Hud { get; private set; }
        public Bag Bag { get; private set; }
        public Card Cards { get; private set; }

        RawImage screen;
        DepthOfField focus;
        RenderTexture canvas;
        Image logo, curtain;
        Ant courier;
        int held, factor;
        Vector2Int window;
        Vector2 offset, cam, camVelocity, lead, lastFeet;
        float camHeight, camClimb; // the ground height the camera looks at (art px), and how fast it is changing
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

        /// <summary>A world point (art px, on the ground drawn there) on the screen canvas (canvas px from the top-left).</summary>
        public static Vector2 ToCanvas(Vector2 world)
        {
            var m = Instance;
            var art = m.Place.World;
            var s = m.View.WorldToScreenPoint(art.transform.TransformPoint(Art.World(world, art.Relief.Height((int)world.x, (int)world.y))));
            return new Vector2((s.x - m.offset.x) / m.factor, Size.y - (s.y - m.offset.y) / m.factor);
        }

        void Awake()
        {
            Instance = this;
            View = NewCamera("View");
            View.fieldOfView = Fov;
            View.nearClipPlane = 0.5f;
            View.farClipPlane = 200f;
            View.cullingMask = ~(1 << UiLayer);
            View.allowHDR = true;
            View.gameObject.AddComponent<AudioListener>();
            View.GetUniversalAdditionalCameraData().renderPostProcessing = true;
            focus = Effects();
            Camera = NewCamera("Ui");
            Camera.orthographic = true;
            Camera.cullingMask = 1 << UiLayer;
            Camera.backgroundColor = Color.clear;
            Camera.transform.localPosition = new Vector3(0, 0, -1000); // away from the world

            var ui = new GameObject("Screen", typeof(RectTransform)).AddComponent<Canvas>();
            ui.gameObject.layer = UiLayer;
            ui.transform.SetParent(transform, false);
            ui.renderMode = RenderMode.ScreenSpaceCamera;
            ui.worldCamera = Camera;
            ui.planeDistance = 5;
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
            screen.material = new Material(Resources.Load<Shader>("Shaders/Present"));
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
            c.clearFlags = CameraClearFlags.SolidColor;
            c.backgroundColor = Color.black;
            c.nearClipPlane = 0.1f;
            c.farClipPlane = 100f;
            return c;
        }

        // The HD-2D look over the view: the sun and its shadows, a strong depth of field (its focus follows the camera),
        // bloom on the lights, a dark vignette.
        DepthOfField Effects()
        {
            var sun = RenderSettings.sun = new GameObject("Sun").AddComponent<Light>();
            sun.transform.SetParent(transform, false);
            sun.type = LightType.Directional;
            sun.shadows = LightShadows.Hard;
            var volume = new GameObject("Effects").AddComponent<Volume>();
            volume.transform.SetParent(transform, false);
            volume.isGlobal = true;
            var profile = volume.sharedProfile = ScriptableObject.CreateInstance<VolumeProfile>();
            var dof = profile.Add<DepthOfField>();
            dof.mode.Override(DepthOfFieldMode.Bokeh);
            dof.focalLength.Override(FocalLength);
            dof.aperture.Override(Aperture);
            dof.focusDistance.Override(10f);
            var bloom = profile.Add<Bloom>();
            bloom.threshold.Override(1.05f);
            bloom.intensity.Override(0.9f);
            bloom.scatter.Override(0.75f);
            var vignette = profile.Add<Vignette>();
            vignette.intensity.Override(0.38f);
            vignette.smoothness.Override(0.5f);
            return dof;
        }

        async Awaitable Title()
        {
            Story = null;
            held = 0;
            Talk.Close();
            if (Place) await Fade(true);
            Swap(TitlePlace, "");
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
            View.backgroundColor = Grade.Of(Place.World.Bg);
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
            if (Place) Controls.MouseWorld = Pick(Controls.PointerScreen);

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
            Camera.orthographicSize = h / 2f;
            screen.texture = canvas;
            screen.rectTransform.sizeDelta = new Vector2(w, h) * factor;
            offset = new Vector2((window.x - w * factor) / 2, (window.y - h * factor) / 2);
            screen.rectTransform.anchoredPosition = offset;
            Look.Place(curtain.rectTransform, new Rect(Vector2.zero, Size));
        }

        // Follows the courier softly, a little ahead of where it walks (or looks where it was asked, or at the title
        // view), kept inside the place but for a look past its edges (Overscan). A place smaller than the screen is
        // centred. The view camera looks down (Art.Pitch) at that point on the ground, from as far as shows WorldZoom
        // canvas px per art px there, and focuses on it.
        void FrameCamera(float delta)
        {
            var view = Size / WorldZoom;
            var size = (Vector2)Place.World.Size;
            var following = look == null && Place.Player;
            var target = look ?? (Place.Player ? courier.Feet : TitleView);
            var height = Place.World.Relief.Under(target);
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
                    : Mathf.Clamp(c[axis], Mathf.Round(view[axis] / 2 - Overscan), size[axis] - Mathf.Round(view[axis] / 2 - Overscan));
            if (gliding)
            {
                cam = Vector2.MoveTowards(cam, c, Glide * delta);
                gliding = cam != c;
                camHeight = Mathf.SmoothDamp(camHeight, height, ref camClimb, Follow, Mathf.Infinity, delta);
            }
            else if (following && delta > 0f && Vector2.Distance(cam, c) < SnapFrom)
            {
                cam = Vector2.SmoothDamp(cam, c, ref camVelocity, Follow, Mathf.Infinity, delta);
                camHeight = Mathf.SmoothDamp(camHeight, height, ref camClimb, Follow, Mathf.Infinity, delta);
            }
            else
            {
                cam = c;
                camHeight = height;
                camVelocity = lead = Vector2.zero;
                camClimb = 0f;
            }
            var turn = Quaternion.Euler(Art.Pitch, 0, 0);
            var distance = Screen.height / (2f * factor * WorldZoom) * Place.Scale.x / Mathf.Tan(Fov * Mathf.Deg2Rad / 2);
            var at = Place.transform.TransformPoint(Art.World(cam, camHeight));
            View.transform.SetPositionAndRotation(at - turn * Vector3.forward * distance, turn);
            focus.focusDistance.Override(distance);
        }

        // The art point under a screen point: walks the mouse's ray down to the ground, reading the height where it lands.
        Vector2 Pick(Vector2 screen)
        {
            var ray = View.ScreenPointToRay(screen);
            var toArt = Place.World.transform.worldToLocalMatrix;
            Vector3 from = toArt.MultiplyPoint(ray.origin), dir = toArt.MultiplyVector(ray.direction);
            float h = camHeight;
            var p = cam;
            for (var i = 0; i < 4 && dir.y < 0; i++)
            {
                var hit = from + dir * ((h - from.y) / dir.y);
                p = new Vector2(hit.x, -hit.z - h);
                h = Place.World.Relief.Height(Mathf.FloorToInt(p.x), Mathf.FloorToInt(p.y));
            }
            return p;
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
