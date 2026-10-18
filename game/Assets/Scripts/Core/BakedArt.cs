using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Draws a place exported by ArtSource/export.py in 3D. The ground is a mesh shaped by the place's relief (cliffs
    /// stand up). Every item, and every decal (trees, glints), stands on its feet line as a card facing the camera
    /// (<see cref="Art.Lean"/>); the depth buffer sorts them with the characters. Everything plays one shared loop, so the whole place stays in step.
    /// Lights (lit windows, lamps, fireflies) are there at dusk and night only, and never graded; day items
    /// (butterflies) only in the morning and at midday.
    /// </summary>
    public sealed class BakedArt : MonoBehaviour
    {
        public Vector2Int Size { get; private set; }
        public Color Bg { get; private set; }
        /// <summary>The whole place.json (anchors, paths, hotspots, extras).</summary>
        public JObject Data { get; private set; }
        public Relief Relief { get; private set; }

        readonly Dictionary<string, Pieces> items = new();
        // Tall items that turn see-through while someone stands behind them: their renderer, art box and feet row.
        readonly List<(Renderer renderer, Rect box, float y)> tall = new();
        readonly HashSet<Renderer> faded = new();
        static readonly int FadeId = Shader.PropertyToID("_Fade");
        const int TallFrom = 40; // art px
        const float SeeThroughAlpha = 0.45f;
        /// <summary>How far toward the camera (art px) a light stands from the wall it lights, and each item from the one before it on the same feet line.</summary>
        const float LightNudge = 0.5f, TieNudge = 0.02f;

        /// <summary><paramref name="dir"/> is places/&lt;place&gt;/&lt;variant&gt;; the relief is the place's own.</summary>
        public static BakedArt Build(string dir, Transform parent)
        {
            var art = new GameObject("World").AddComponent<BakedArt>();
            art.transform.SetParent(parent, false);
            var data = art.Data = Art.Json(dir + "/place");
            var height = dir[..dir.LastIndexOf('/')] + "/height";
            art.Relief = new Relief(Art.Has(height) ? Art.Texture(height) : null);
            art.Size = Vector2Int.RoundToInt(Art.Point(data["size"]));
            art.Bg = Art.Color((string)data["bg"]);
            var atlases = new Texture2D[(int)data["atlases"]];
            for (var i = 0; i < atlases.Length; i++) atlases[i] = Art.Texture($"{dir}/atlas_{i}");
            float fps = (float)data["fps"];
            int loop = (int)data["loop"];
            var clips = new List<(int atlas, Piece piece)>();
            foreach (var c in data["clips"]) clips.Add(((int)c["atlas"], Piece.Of(c, Vector2.zero)));

            art.Ground(dir, data["below"], atlases, clips, fps, loop);
            var dark = Game.Phase >= Phase.Dusk;
            var ties = new Dictionary<int, int>();
            foreach (JObject it in data["items"])
            {
                bool light = (bool?)it["light"] ?? false, day = (bool?)it["day"] ?? false;
                if ((light && !dark) || (day && dark)) continue;
                var name = (string)it["name"];
                var y = (int)it["y"];
                ties[y] = ties.TryGetValue(y, out var n) ? n + 1 : 0;
                var piece = Piece.Of(it, Art.Point(it["at"]));
                piece.Feet = y;
                piece.Ground = art.Relief.Under(new Vector2(piece.At.x + piece.Size.x / 2f, y)) + ties[y] * TieNudge + (light ? LightNudge : 0);
                var built = art.items[name] = Pieces.Build(name, art.transform, atlases[(int)it["atlas"]], fps, loop, new[] { piece }, light);
                if (!light && piece.Size.y >= TallFrom) art.tall.Add((built.GetComponent<Renderer>(), new Rect(piece.At, piece.Size), y));
            }
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

        /// <summary>The ground: its still images as meshes over the relief, then its clips standing on it, one mesh per atlas.</summary>
        void Ground(string dir, JToken layer, Texture2D[] atlases, List<(int atlas, Piece piece)> clips, float fps, int loop)
        {
            foreach (var chunk in layer["chunks"])
            {
                var file = ((string)chunk["image"]).Replace(".png", "");
                var tex = Art.Texture($"{dir}/{file}");
                var at = Vector2Int.RoundToInt(Art.Point(chunk["at"]));
                var go = new GameObject(file);
                go.transform.SetParent(transform, false);
                go.AddComponent<MeshFilter>().sharedMesh = Relief.Mesh(new RectInt(at.x, at.y, tex.width, tex.height));
                go.AddComponent<MeshRenderer>().sharedMaterial = Art.Material(tex);
            }
            var byAtlas = new Dictionary<int, List<Piece>>();
            foreach (var d in layer["decals"])
            {
                var (atlas, clip) = clips[(int)d[0]];
                if (!byAtlas.TryGetValue(atlas, out var list)) byAtlas[atlas] = list = new();
                clip.At = new Vector2((float)d[1], (float)d[2]);
                clip.Offset = (int)d[3];
                clip.Feet = clip.At.y + clip.Size.y;
                clip.Ground = Relief.Under(new Vector2(clip.At.x + clip.Size.x / 2f, clip.Feet));
                list.Add(clip);
            }
            foreach (var (atlas, list) in byAtlas)
                Pieces.Build($"decals_{atlas}", transform, atlases[atlas], fps, loop, list);
        }
    }

    /// <summary>
    /// One picture placed in a place: where it is (art pixels), its frames in an atlas, which frame shows at each loop
    /// sample, and how many samples its loop runs ahead. Decals of one clip share its frames and sequence. A piece
    /// with a sway (art pixels at its top) bends in the wind in the shader. It stands on the ground (Ground px high) at
    /// its Feet row: the rows above stand upright, any rows below lie on the ground in front.
    /// </summary>
    public struct Piece
    {
        public Vector2 At;
        public float Feet, Ground;
        public Vector2Int Size;
        public Vector2Int[] Frames;
        public int[] Seq;
        public int Offset;
        public float Sway;

        public static Piece Of(JToken t, Vector2 at)
        {
            var f = (JArray)t["frames"];
            var frames = new Vector2Int[f.Count];
            for (var k = 0; k < f.Count; k++) frames[k] = Vector2Int.RoundToInt(Art.Point(f[k]));
            var seq = new List<int>();
            foreach (var run in t["seq"])
                for (var r = 0; r < (int)run[1]; r++) seq.Add((int)run[0]);
            return new Piece { At = at, Size = Vector2Int.RoundToInt(Art.Point(t["size"])), Frames = frames, Seq = seq.ToArray(), Sway = (float?)t["sway"] ?? 0 };
        }
    }

    /// <summary>
    /// Pieces of a place drawn from its atlas as one mesh. Each piece is two quads: the part above its feet row
    /// standing (facing the camera), the part below lying on the ground in front. Each plays its own run of frames through the shared loop; only the
    /// pieces whose frame changed are updated. A swaying piece's quads are widened by its sway on both sides, so the
    /// bent rows have room; the shader keeps to the piece's own texels (uv1) and bends them by uv2 (sway, phase).
    /// </summary>
    public sealed class Pieces : MonoBehaviour
    {
        const int Verts = 8; // per piece: standing quad, then lying quad
        Mesh mesh;
        Vector2[] uvs;
        Vector4[] rects;
        Piece[] pieces;
        int[] shown;
        Vector2 atlasSize;
        float fps;
        int loop, sample = -1;

        public static Pieces Build(string name, Transform parent, Texture2D atlas, float fps, int loop, IReadOnlyList<Piece> pieces, bool light = false)
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
            p.uvs = new Vector2[n * Verts];
            p.rects = new Vector4[n * Verts];
            var sways = new Vector2[n * Verts];
            var verts = new Vector3[n * Verts];
            var tris = new int[n * 12];
            var moving = false;
            for (var i = 0; i < n; i++)
            {
                var piece = p.pieces[i] = pieces[i];
                moving |= piece.Frames.Length > 1;
                var pad = Mathf.Ceil(piece.Sway);
                float x0 = piece.At.x - pad, x1 = piece.At.x + piece.Size.x + pad, top = piece.At.y, bottom = top + piece.Size.y;
                float split = Mathf.Clamp(piece.Feet, top, bottom), h = piece.Ground;
                // Standing: row r leans back to face the camera, so the whole card is as far from it as its feet.
                Vector3 Up(float x, float r) => Art.World(new Vector2(x, r), h + Art.Lean(piece.Feet - r));
                // Lying: a row on the ground.
                Vector3 Down(float x, float r) => Art.World(new Vector2(x, r), h);
                var v = i * Verts;
                verts[v] = Up(x0, top);
                verts[v + 1] = Up(x1, top);
                verts[v + 2] = Up(x1, split);
                verts[v + 3] = Up(x0, split);
                verts[v + 4] = Down(x0, split);
                verts[v + 5] = Down(x1, split);
                verts[v + 6] = Down(x1, bottom);
                verts[v + 7] = Down(x0, bottom);
                for (var k = 0; k < Verts; k++) sways[v + k] = new Vector2(piece.Sway, piece.At.x * 0.013f + piece.At.y * 0.004f);
                for (var q = 0; q < 2; q++)
                {
                    int t = i * 12 + q * 6, a = v + q * 4;
                    tris[t] = a;
                    tris[t + 1] = a + 1;
                    tris[t + 2] = a + 2;
                    tris[t + 3] = a;
                    tris[t + 4] = a + 2;
                    tris[t + 5] = a + 3;
                }
                p.SetFrame(i, piece.Seq[piece.Offset % piece.Seq.Length]);
            }
            p.mesh = new Mesh { name = name, indexFormat = verts.Length > 65000 ? UnityEngine.Rendering.IndexFormat.UInt32 : UnityEngine.Rendering.IndexFormat.UInt16 };
            p.mesh.SetVertices(verts);
            p.mesh.SetUVs(0, p.uvs);
            p.mesh.SetUVs(1, p.rects);
            p.mesh.SetUVs(2, sways);
            p.mesh.SetTriangles(tris, 0);
            go.AddComponent<MeshFilter>().sharedMesh = p.mesh;
            go.AddComponent<MeshRenderer>().sharedMaterial = Art.Material(atlas, light);
            p.enabled = moving;
            return p;
        }

        void SetFrame(int i, int frame)
        {
            shown[i] = frame;
            var piece = pieces[i];
            var a = piece.Frames[frame];
            var s = piece.Size;
            float u0 = a.x / atlasSize.x, u1 = (a.x + s.x) / atlasSize.x, pad = Mathf.Ceil(piece.Sway) / atlasSize.x;
            float v0 = 1f - a.y / atlasSize.y, v1 = 1f - (a.y + s.y) / atlasSize.y;
            var vs = Mathf.Lerp(v0, v1, Mathf.Clamp01((piece.Feet - piece.At.y) / s.y));
            var v = i * Verts;
            for (var q = 0; q < 2; q++)
            {
                float vt = q == 0 ? v0 : vs, vb = q == 0 ? vs : v1;
                uvs[v + q * 4] = new Vector2(u0 - pad, vt);
                uvs[v + q * 4 + 1] = new Vector2(u1 + pad, vt);
                uvs[v + q * 4 + 2] = new Vector2(u1 + pad, vb);
                uvs[v + q * 4 + 3] = new Vector2(u0 - pad, vb);
            }
            for (var k = 0; k < Verts; k++) rects[v + k] = new Vector4(u0, v0, u1, v1);
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
            if (!changed) return;
            mesh.SetUVs(0, uvs);
            mesh.SetUVs(1, rects);
        }

        void OnDestroy() => Destroy(mesh);
    }
}
