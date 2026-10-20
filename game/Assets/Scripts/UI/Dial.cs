using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// The day dial at the top left (GDD 10.2), in the kit's own look: a brass-rimmed wheel of the four phases with its
    /// hand, worn like a medallion on a paper panel, the day on a wood nameTag over the panel's edge (as a speaker's name
    /// sits on the talk box), and the phase's picture and name. When the story moves the time on, the hand sweeps round
    /// clockwise, ticking, the new quarter clears and the phase's name turns over. Hovering it says what it shows.
    /// Through the seven nights, Marlow's seven lanterns hang from a banyan branch under it, as they hang over his shop,
    /// flickering: one goes out, in a wisp of smoke, each time a keepsake is home.
    /// </summary>
    public sealed class Dial : MonoBehaviour
    {
        /// <summary>Seconds per step of the hand's sweep (a sixteenth of the wheel).</summary>
        const float StepSeconds = 0.07f;
        const float FlipSeconds = 0.25f, HopSeconds = 0.6f;
        /// <summary>Where the panel starts, right of the wheel's middle, and how tall it is.</summary>
        const float PanelX = 14f, PanelY = 7f, PanelHeight = 24f;
        /// <summary>Where the lantern branch hangs under the panel, how far apart its lanterns hang, and how long one smokes going out.</summary>
        static readonly Vector2 BranchAt = new(16, 31);
        const float LanternGap = 9f, SmokeSeconds = 1.6f;
        const int Lanterns = 7;

        RectTransform root, line;
        Image face, hand, panel, nameTag, glyph, branch, smoke;
        readonly Image[] lanterns = new Image[Lanterns];
        Text day, phase;
        int shownOut = -1; // lanterns shown out; one fewer than Game.LanternsOut while the last one smokes
        float smokeLeft;
        int handAt = -1, chapter = -1; // the hand's step (0 is straight up, clockwise), and the day shown
        Phase lit;
        float stepLeft, flip, hop;
        bool named;

        public static Dial Create(Transform parent)
        {
            var dial = Look.Node("Dial", parent).gameObject.AddComponent<Dial>();
            var t = dial.root = (RectTransform)dial.transform;
            dial.panel = Look.Panel("panel", t);
            dial.line = Look.Node("phase", dial.panel.transform);
            dial.glyph = Look.Picture("glyph", dial.line);
            dial.phase = Look.Label("", dial.line);
            dial.nameTag = Look.Panel("name", t);
            dial.day = Look.Label("", dial.nameTag.transform, default, Art.Color((string)Look.Ui["name"]["text"]));
            dial.face = Look.Picture("face", t);
            dial.hand = Look.Picture("hand", t);
            dial.branch = Look.Picture("branch", t, Look.Piece("branch"));
            Look.Move(dial.branch.rectTransform, BranchAt);
            for (var i = 0; i < Lanterns; i++)
            {
                dial.lanterns[i] = Look.Picture("lantern", t, Look.Frame("hud_lantern", 0));
                Look.Move(dial.lanterns[i].rectTransform, BranchAt + new Vector2(6 + i * LanternGap, 6));
            }
            dial.smoke = Look.Picture("smoke", t);
            return dial;
        }

        /// <summary>Where the dial is on screen, for hints to keep clear of and for hovering.</summary>
        public Rect Area => new(Look.Pos(root), new Vector2(PanelX + panel.rectTransform.sizeDelta.x, branch.isActiveAndEnabled ? BranchAt.y + 16 : PanelY + PanelHeight));

        /// <summary>The lantern branch on screen.</summary>
        Rect LanternArea => new(Look.Pos(root) + BranchAt, new Vector2(branch.rectTransform.sizeDelta.x, 16));

        /// <summary>What the dial shows, for the name nameTag by the cursor when it is hovered.</summary>
        public string Tip => branch.isActiveAndEnabled && Look.Hit(LanternArea)
            ? $"Marlow's lanterns: {Lanterns - Game.LanternsOut} still burning."
            : $"{Game.Phase}, Day {Game.Chapter}. Time moves on with the story.";

        static int StepOf(Phase p) => (12 + 4 * (int)p) % 16; // morning to the left, midday at the top, clockwise

        public void Tick(bool shown)
        {
            gameObject.SetActive(shown);
            if (!shown) return;
            if (handAt < 0) Set(StepOf(Game.Phase));
            if (!named) Light(Game.Phase);
            if (chapter != Game.Chapter)
            {
                if (chapter >= 0) hop = HopSeconds;
                chapter = Game.Chapter;
                Look.SetText(day, $"Day {Game.Chapter}");
                Look.Move(day.rectTransform, new Vector2(5, 1));
                Layout();
            }
            // the hand sweeps on clockwise to the phase the story has moved to, a tick at each step
            if (handAt != StepOf(Game.Phase) && (stepLeft -= Time.deltaTime) <= 0)
            {
                stepLeft = StepSeconds;
                Set((handAt + 1) % 16);
                Sound.Play("tick");
                if (handAt == StepOf(Game.Phase)) hop = HopSeconds;
            }
            // the phase's name turns over once the hand is there
            if (handAt == StepOf(Game.Phase) && lit != Game.Phase && flip <= 0) flip = FlipSeconds;
            if (flip > 0)
            {
                flip -= Time.deltaTime;
                if (flip < FlipSeconds / 2 && lit != Game.Phase) Light(Game.Phase);
                line.localScale = new Vector3(1, Mathf.Clamp01(Mathf.Abs(flip / FlipSeconds * 2 - 1)), 1);
            }
            else line.localScale = Vector3.one;
            hop = Mathf.Max(0, hop - Time.deltaTime);
            Look.Move(root, new Vector2(6, 8 - Mathf.Round(Mathf.Sin(hop / HopSeconds * Mathf.PI) * 3)));
            TickLanterns();
        }

        // Only through the nights: the prologue comes before the shop, and by the epilogue it is gone.
        void TickLanterns()
        {
            var nights = Game.Chapter is >= 1 and <= Lanterns;
            branch.gameObject.SetActive(nights);
            foreach (var l in lanterns) l.gameObject.SetActive(nights);
            smoke.gameObject.SetActive(nights && smokeLeft > 0);
            if (!nights) return;
            if (shownOut < 0 || Game.LanternsOut < shownOut) shownOut = Game.LanternsOut; // a new game or a chapter loaded
            // a keepsake went home while the HUD was away: its lantern goes out now, in front of the player
            if (Game.LanternsOut > shownOut && smokeLeft <= 0) smokeLeft = SmokeSeconds;
            if (smokeLeft > 0)
            {
                smokeLeft -= Time.deltaTime;
                Look.SetSprite(smoke, Look.Frame("hud_smoke", Mathf.Min(3, (int)((1 - smokeLeft / SmokeSeconds) * 4))));
                Look.Move(smoke.rectTransform, Look.Pos(lanterns[Mathf.Min(shownOut, Lanterns - 1)].rectTransform) + new Vector2(-1, -9)); // off its cap
                if (smokeLeft <= 0) shownOut++;
            }
            for (var i = 0; i < Lanterns; i++)
            {
                var flicker = (int)(Time.time * 5 + i * 2.3f) % 7 == 0;
                Look.SetSprite(lanterns[i], Look.Frame("hud_lantern", i < shownOut || i == shownOut && smokeLeft > 0 ? 2 : flicker ? 1 : 0));
            }
        }

        void Set(int step)
        {
            handAt = step;
            Look.SetSprite(hand, Look.Frame("clock_hand", step));
        }

        // The wheel's clear quarter, and the phase's picture and name on the panel.
        void Light(Phase p)
        {
            lit = p;
            named = true;
            Look.SetSprite(face, Look.Frame("clock_face", (int)p));
            Look.SetSprite(glyph, Look.Frame("phase_glyph", (int)p));
            Look.SetText(phase, p.ToString());
            Layout();
        }

        // The panel fits the wider of the day's nameTag and the phase's line; the nameTag hangs over its top edge.
        void Layout()
        {
            var width = Mathf.Max(Look.Width(phase) + 11, Look.Width(day) + 10) + 26;
            Look.Place(panel.rectTransform, new Rect(PanelX, PanelY, width, PanelHeight));
            Look.Place(nameTag.rectTransform, new Rect(PanelX + 16, PanelY - 8, Look.Width(day) + 10, 14));
            Look.Place(line, new Rect(18, 9, width - 18, 12));
            Look.Move(glyph.rectTransform, new Vector2(0, 3));
            Look.Move(phase.rectTransform, new Vector2(10, 0));
        }
    }
}
