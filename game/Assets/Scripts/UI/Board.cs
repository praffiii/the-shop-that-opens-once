using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// The screen a <see cref="Minigame"/> is played on: a workbench frame over the dimmed world, the game's title on a
    /// nailed wood plate over its top edge, the game in it, and under it the instructions, each key drawn as a key cap;
    /// after a fail the board jolts and the R key cap to try again takes their place. While it is open it takes the keys
    /// (the game reads them itself), so the bag and the pause stay shut; the talk box draws over it for the fail lines.
    /// </summary>
    public sealed class Board : MonoBehaviour
    {
        const float Pad = 16f, Gap = 10f, Row = 16f, Dim = 0.82f;
        /// <summary>Seconds the won game stays up after its chime, and the jolt of a fail.</summary>
        const float WonSeconds = 0.8f, ShakeSeconds = 0.3f;

        /// <summary>For tests: how many goes fail (with the game's first fail) before it is solved, under <see cref="Main.Auto"/>.</summary>
        public static int FailFirst;

        Image shade, sheet, plate;
        Text title;
        RectTransform area, notes, again;
        Vector2 at;
        Minigame game;

        public static Board Create(Transform parent)
        {
            var b = Look.Node("Board", parent).gameObject.AddComponent<Board>();
            b.shade = Look.Block("shade", b.transform, default, new Color(Look.Ink.r, Look.Ink.g, Look.Ink.b, Dim));
            b.sheet = Look.Panel("bench", b.transform);
            b.plate = Look.Panel("plate", b.transform);
            b.title = Look.Label("", b.plate.transform, default, Art.Color((string)Look.Ui["plate"]["text"]));
            b.gameObject.SetActive(false);
            return b;
        }

        public bool Open => gameObject.activeSelf;

        /// <summary>Puts a game on the board, at its start.</summary>
        public void Show(Minigame next)
        {
            game = next;
            foreach (var old in new[] { area, notes, again })
                if (old) Destroy(old.gameObject);
            area = Look.Node("game", sheet.transform);
            game.Build(area);
            game.Reset();
            notes = Rows(game.Instructions);
            again = Rows(new[] { ("R", "Try again") });

            var view = Main.Size;
            Look.SetText(title, game.Title);
            var width = Mathf.Max(game.Size.x, notes.sizeDelta.x, Look.Width(title) + 40) + 2 * Pad;
            var height = Pad + game.Size.y + Gap + notes.sizeDelta.y + Pad;
            at = new Vector2(Mathf.Round((view.x - width) / 2), Mathf.Round((view.y - height) / 2) - 16);
            Look.Place(shade.rectTransform, new Rect(Vector2.zero, view));
            Look.Place(sheet.rectTransform, new Rect(at, new Vector2(width, height)));
            Look.Place(plate.rectTransform, new Rect(Mathf.Round(at.x + (width - Look.Width(title) - 24) / 2), at.y - 9, Look.Width(title) + 24, 17));
            Look.Move(title.rectTransform, new Vector2(12, 1));
            Look.Place(area, new Rect(Mathf.Round((width - game.Size.x) / 2), Pad, game.Size.x, game.Size.y));
            var below = Pad + game.Size.y + Gap;
            Look.Move(notes, new Vector2(Mathf.Round((width - notes.sizeDelta.x) / 2), below));
            Look.Move(again, new Vector2(Mathf.Round((width - again.sizeDelta.x) / 2), below + Mathf.Round((notes.sizeDelta.y - Row) / 2)));
            Retrying(false);
            gameObject.SetActive(true);
            Sound.Play("page");
        }

        // Instruction lines, each with its key as a key cap before the words.
        RectTransform Rows(IReadOnlyList<(string Key, string Text)> lines)
        {
            var rows = Look.Node("rows", sheet.transform);
            var (width, indent) = (0f, 0f); // the words line up after the widest key cap
            for (var i = 0; i < lines.Count; i++)
            {
                if (lines[i].Key == null) continue;
                var cap = Look.Panel("key", rows);
                var letter = Look.Label(lines[i].Key, cap.transform, default, Look.Ink);
                Look.Place(cap.rectTransform, new Rect(0, i * Row, Look.Width(letter) + 8, 15));
                Look.Move(letter.rectTransform, new Vector2(4, -1));
                indent = Mathf.Max(indent, Look.Width(letter) + 13);
            }
            for (var i = 0; i < lines.Count; i++)
            {
                var words = Look.Label(lines[i].Text, rows, default, Look.Soft);
                Look.Move(words.rectTransform, new Vector2(indent, i * Row));
                width = Mathf.Max(width, indent + Look.Width(words));
            }
            rows.sizeDelta = new Vector2(width, lines.Count * Row);
            return rows;
        }

        /// <summary>One go, from the start, till it is won or fails.</summary>
        public async Awaitable<Minigame.Outcome> Round()
        {
            game.Reset();
            Retrying(false);
            var outcome = Minigame.Outcome.Playing;
            if (Main.Auto)
            {
                await Main.Frame();
                if (FailFirst > 0)
                {
                    FailFirst--;
                    outcome = Minigame.Outcome.FailA;
                }
                else
                {
                    game.Solve();
                    outcome = Minigame.Outcome.Won;
                }
            }
            else
                while (outcome == Minigame.Outcome.Playing)
                {
                    await Main.Frame();
                    outcome = game.Tick();
                }
            Sound.Play(outcome == Minigame.Outcome.Won ? "chime" : "wrong");
            if (outcome == Minigame.Outcome.Won) await Main.Wait(WonSeconds);
            else await Shake();
            return outcome;
        }

        // The board jolts side to side and settles, as a fail lands.
        async Awaitable Shake()
        {
            for (var t = 0f; t < ShakeSeconds; t += Time.deltaTime)
            {
                var dx = Mathf.Round(Mathf.Sin(t * 60f) * 4f * (1 - t / ShakeSeconds));
                Look.Move(sheet.rectTransform, at + new Vector2(dx, 0));
                await Main.Frame();
            }
            Look.Move(sheet.rectTransform, at);
        }

        /// <summary>After a fail: waits for R to try again.</summary>
        public async Awaitable Retry()
        {
            Retrying(true);
            if (!Main.Auto)
                while (!Controls.Retry) await Main.Frame();
            Sound.Play("pop");
        }

        public void Close()
        {
            game = null;
            gameObject.SetActive(false);
        }

        /// <summary>While open the board takes the keys; the game reads them itself.</summary>
        public bool Handle() => Open;

        // The instructions, or the R key cap to try again in their place.
        void Retrying(bool on)
        {
            notes.gameObject.SetActive(!on);
            again.gameObject.SetActive(on);
        }
    }
}
