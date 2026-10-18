using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Draws a place exported by ArtSource/export.py. The ground is drawn under everyone. Each item is depth-sorted
    /// by its feet line with the characters. The air (smoke, leaves, birds) is drawn over all. Everything plays one
    /// shared loop, so the whole place stays in step. Lights (lit windows, lamps, fireflies) are there at dusk and
    /// night only, and never graded; day items (butterflies) only in the morning and at midday.
    /// </summary>
    public sealed class BakedArt : MonoBehaviour
    {
        public const int Below = -32000, Above = 32000;

        public Vector2Int Size { get; private set; }
        public Color Bg { get; private set; }
        /// <summary>The whole place.json (anchors, paths, hotspots, extras).</summary>
        public JObject Data { get; private set; }

        readonly Dictionary<string, Pieces> items = new();
        // Tall items that turn see-through while someone stands behind them: their renderer, art box and feet row.
        readonly List<(Renderer renderer, Rect box, float y)> tall = new();
        readonly HashSet<Renderer> faded = new();
        static readonly int FadeId = Shader.PropertyToID("_Fade");
        const int TallFrom = 40; // art px
        const float SeeThroughAlpha = 0.45f;

        /// <summary>Sorting order for something whose feet are at art row <paramref name="y"/>: items, then people, then what people hold, then lights (a lit window over its own wall).</summary>
        public static int Order(float y, int layer = 0) => Mathf.RoundToInt(y) * 4 + layer;

        public static BakedArt Build(string dir, Transform parent)
        {
            var art = new GameObject("World").AddComponent<BakedArt>();
            art.transform.SetParent(parent, false);
            var data = art.Data = Art.Json(dir + "/place");
            art.Size = Vector2Int.RoundToInt(Art.Point(data["size"]));
            art.Bg = Art.Color((string)data["bg"]);
            var atlases = new Texture2D[(int)data["atlases"]];
            for (var i = 0; i < atlases.Length; i++) atlases[i] = Art.Texture($"{dir}/atlas_{i}");
            float fps = (float)data["fps"];
            int loop = (int)data["loop"];
            var clips = new List<(int atlas, Piece piece)>();
            foreach (var c in data["clips"]) clips.Add(((int)c["atlas"], Piece.Of(c, Vector2.zero)));

            art.Layer(dir, "below", data["below"], Below, atlases, clips, fps, loop);
            var dark = Game.Phase >= Phase.Dusk;
            foreach (JObject it in data["items"])
            {
                bool light = (bool?)it["light"] ?? false, day = (bool?)it["day"] ?? false;
                if ((light && !dark) || (day && dark)) continue;
                var name = (string)it["name"];
                var piece = Piece.Of(it, Art.Point(it["at"]));
                var built = art.items[name] = Pieces.Build(name, art.transform, atlases[(int)it["atlas"]], fps, loop, new[] { piece }, Order((float)it["y"], light ? 3 : 0), light);
                if (!light && piece.Size.y >= TallFrom) art.tall.Add((built.GetComponent<Renderer>(), new Rect(piece.At, piece.Size), (float)it["y"]));
            }
            if (data["above"] is JObject above) art.Layer(dir, "above", above, Above, atlases, clips, fps, loop);
            return art;
        }

        /// <summary>A point named in the exported scene (feet positions and points of interest).</summary>
        public Vector2 Anchor(string name) => Art.Point(Data["anchors"][name]);

        public bool HasAnchor(string name) => Data["anchors"][name] != null;

        public void ShowItem(string name, bool visible) => items[name].gameObject.SetActive(visible);

        /// <summary>Like <see cref="ShowItem"/>, for items only some places, or times of day, have.</summary>
        public void ShowItemIfAny(string name, bool visible)
        {
            if (items.TryGetValue(name, out var item)) item.gameObject.SetActive(visible);
        }

        /// <summary>Tall items in front of feet at <paramref name="feet"/> (art px) that would hide the body standing there go see-through, as in most top-down games.</summary>
        public void SeeThrough(Vector2 feet)
        {
            var body = new Rect(feet.x - 5, feet.y - 24, 10, 22);
            foreach (var (renderer, box, y) in tall)
            {
                var hides = y > feet.y && box.Overlaps(body);
                if (hides == faded.Contains(renderer)) continue;
                var block = new MaterialPropertyBlock();
                if (hides)
                {
                    block.SetFloat(FadeId, SeeThroughAlpha);
                    faded.Add(renderer);
                }
                else faded.Remove(renderer);
                renderer.SetPropertyBlock(block);
            }
        }

        /// <summary>A layer: its still images, then its clips placed as decals, one mesh per atlas.</summary>
        void Layer(string dir, string name, JToken layer, int order, Texture2D[] atlases, List<(int atlas, Piece piece)> clips, float fps, int loop)
        {
            foreach (var chunk in layer["chunks"])
            {
                var file = ((string)chunk["image"]).Replace(".png", "");
                var sr = new GameObject(file).AddComponent<SpriteRenderer>();
                sr.transform.SetParent(transform, false);
                sr.transform.localPosition = Art.World(Art.Point(chunk["at"]));
                sr.sprite = Art.Sprite(Art.Texture($"{dir}/{file}"));
                sr.sharedMaterial = Art.SpriteMaterial;
                sr.sortingOrder = order;
            }
            var byAtlas = new Dictionary<int, List<Piece>>();
            foreach (var d in layer["decals"])
            {
                var (atlas, clip) = clips[(int)d[0]];
                if (!byAtlas.TryGetValue(atlas, out var list)) byAtlas[atlas] = list = new();
                clip.At = new Vector2((float)d[1], (float)d[2]);
                clip.Offset = (int)d[3];
                list.Add(clip);
            }
            foreach (var (atlas, list) in byAtlas)
                Pieces.Build($"{name}_{atlas}", transform, atlases[atlas], fps, loop, list, order + 1);
        }
    }

    /// <summary>
    /// One picture placed in a place: where it is (art pixels), its frames in an atlas, which frame shows at each loop
    /// sample, and how many samples its loop runs ahead. Decals of one clip share its frames and sequence.
    /// </summary>
    public struct Piece
    {
        public Vector2 At;
        public Vector2Int Size;
        public Vector2Int[] Frames;
        public int[] Seq;
        public int Offset;

        public static Piece Of(JToken t, Vector2 at)
        {
            var f = (JArray)t["frames"];
            var frames = new Vector2Int[f.Count];
            for (var k = 0; k < f.Count; k++) frames[k] = Vector2Int.RoundToInt(Art.Point(f[k]));
            var seq = new List<int>();
            foreach (var run in t["seq"])
                for (var r = 0; r < (int)run[1]; r++) seq.Add((int)run[0]);
            return new Piece { At = at, Size = Vector2Int.RoundToInt(Art.Point(t["size"])), Frames = frames, Seq = seq.ToArray() };
        }
    }

    /// <summary>
    /// Pieces of a place drawn from its atlas as one mesh. Each piece plays its own run of frames through the shared
    /// loop; only the pieces whose frame changed are updated.
    /// </summary>
    public sealed class Pieces : MonoBehaviour
    {
        Mesh mesh;
        Vector2[] uvs;
        Piece[] pieces;
        int[] shown;
        Vector2 atlasSize;
        float fps;
        int loop, sample = -1;

        public static Pieces Build(string name, Transform parent, Texture2D atlas, float fps, int loop, IReadOnlyList<Piece> pieces, int order, bool light = false)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var p = go.AddComponent<Pieces>();
            p.fps = fps;
            p.loop = loop;
            p.atlasSize = new Vector2(atlas.width, atlas.height);
            int n = pieces.Count;
            p.pieces = new Piece[n];
            p.shown = new int[n];
            p.uvs = new Vector2[n * 4];
            var verts = new Vector3[n * 4];
            var tris = new int[n * 6];
            var moving = false;
            for (var i = 0; i < n; i++)
            {
                var piece = p.pieces[i] = pieces[i];
                moving |= piece.Frames.Length > 1;
                var (at, size) = (piece.At, (Vector2)piece.Size);
                verts[i * 4] = Art.World(at);
                verts[i * 4 + 1] = Art.World(at + new Vector2(size.x, 0));
                verts[i * 4 + 2] = Art.World(at + size);
                verts[i * 4 + 3] = Art.World(at + new Vector2(0, size.y));
                tris[i * 6] = i * 4;
                tris[i * 6 + 1] = i * 4 + 1;
                tris[i * 6 + 2] = i * 4 + 2;
                tris[i * 6 + 3] = i * 4;
                tris[i * 6 + 4] = i * 4 + 2;
                tris[i * 6 + 5] = i * 4 + 3;
                p.SetFrame(i, piece.Seq[piece.Offset % piece.Seq.Length]);
            }
            p.mesh = new Mesh { name = name, indexFormat = verts.Length > 65000 ? UnityEngine.Rendering.IndexFormat.UInt32 : UnityEngine.Rendering.IndexFormat.UInt16 };
            p.mesh.SetVertices(verts);
            p.mesh.SetUVs(0, p.uvs);
            p.mesh.SetTriangles(tris, 0);
            go.AddComponent<MeshFilter>().sharedMesh = p.mesh;
            var mr = go.AddComponent<MeshRenderer>();
            mr.sharedMaterial = Art.Material(atlas, light);
            mr.sortingOrder = order;
            p.enabled = moving;
            return p;
        }

        void SetFrame(int i, int frame)
        {
            shown[i] = frame;
            var a = pieces[i].Frames[frame];
            var s = pieces[i].Size;
            float u0 = a.x / atlasSize.x, u1 = (a.x + s.x) / atlasSize.x;
            float v0 = 1f - a.y / atlasSize.y, v1 = 1f - (a.y + s.y) / atlasSize.y;
            uvs[i * 4] = new Vector2(u0, v0);
            uvs[i * 4 + 1] = new Vector2(u1, v0);
            uvs[i * 4 + 2] = new Vector2(u1, v1);
            uvs[i * 4 + 3] = new Vector2(u0, v1);
        }

        void Update()
        {
            var s = (int)(Time.time * fps) % loop;
            if (s == sample) return;
            sample = s;
            var changed = false;
            for (var i = 0; i < pieces.Length; i++)
            {
                var seq = pieces[i].Seq;
                if (seq.Length < 2) continue;
                var f = seq[(s + pieces[i].Offset) % seq.Length];
                if (f == shown[i]) continue;
                SetFrame(i, f);
                changed = true;
            }
            if (changed) mesh.SetUVs(0, uvs);
        }

        void OnDestroy() => Destroy(mesh);
    }
}
