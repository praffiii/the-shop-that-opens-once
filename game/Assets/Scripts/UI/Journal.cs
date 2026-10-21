using UnityEngine;
using UnityEngine.UI;

namespace Shop
{
    /// <summary>
    /// The page Satria writes in his journal each evening before bed: the day's title and what he made of it, written out
    /// as the pen scratches over the paper, on a page over the dimmed room. A click or a key finishes the writing, the
    /// next closes the journal. Await <see cref="Show"/>. Without the pen it is a page already written, read as it is: a letter.
    /// </summary>
    public sealed class Journal : MonoBehaviour
    {
        const float Width = 280f, Pad = 14f, Gap = 8f;
        /// <summary>Seconds per letter as the pen goes, and between the pen's scratches.</summary>
        const float PerLetter = .035f, ScratchSeconds = .7f;

        Image dim, sheet;
        Text title, body;
        string text = "";
        float written, scratch;
        bool next;

        public static Journal Create(Transform parent)
        {
            var j = Look.Node("Journal", parent).gameObject.AddComponent<Journal>();
            j.dim = Look.Picture("dim", j.transform);
            j.dim.color = new Color(0, 0, 0, .55f);
            j.dim.enabled = true;
            j.sheet = Look.Panel("panel", j.transform);
            j.title = Look.Label("", j.sheet.transform, default, Look.Ink);
            j.body = Look.Label("", j.sheet.transform, new Rect(Pad, 0, Width - 2 * Pad, 1), Look.Soft);
            j.gameObject.SetActive(false);
            return j;
        }

        public bool Open => gameObject.activeSelf;

        public async Awaitable Show(string heading, string page, bool pen = true)
        {
            var view = Main.Size;
            Look.Place(dim.rectTransform, new Rect(Vector2.zero, view));
            Look.SetText(title, heading);
            // the page sized to the whole text, then written out letter by letter
            body.text = text = Lang.T(page);
            var height = Mathf.Ceil(body.preferredHeight);
            body.text = "";
            var h = Pad + title.rectTransform.sizeDelta.y + Gap + height + Pad;
            Look.Place(sheet.rectTransform, new Rect(Mathf.Round((view.x - Width) / 2), Mathf.Round((view.y - h) / 2), Width, h));
            Look.Move(title.rectTransform, new Vector2(Mathf.Round((Width - title.rectTransform.sizeDelta.x) / 2), Pad));
            Look.Place(body.rectTransform, new Rect(Pad, Pad + title.rectTransform.sizeDelta.y + Gap, Width - 2 * Pad, height));
            written = scratch = 0;
            next = false;
            gameObject.SetActive(true);
            if (Main.Auto || !pen) written = text.Length;
            while (Writing)
            {
                written += Time.deltaTime / PerLetter;
                if ((scratch -= Time.deltaTime) <= 0)
                {
                    scratch = ScratchSeconds;
                    Sound.Play("pen");
                }
                body.text = text[..Mathf.Min(text.Length, (int)written)];
                await Main.Frame();
            }
            body.text = text;
            next = false;
            if (Main.Auto) await Main.Frame();
            else
                while (!next) await Main.Frame();
            gameObject.SetActive(false);
        }

        bool Writing => written < text.Length;

        public bool Handle()
        {
            if (!Open) return false;
            if (!Controls.Interact && !Controls.Click && !Controls.Skim) return true;
            if (Writing) written = text.Length;
            else next = true;
            return true;
        }
    }
}
