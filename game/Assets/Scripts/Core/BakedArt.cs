using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Draws a place exported by ArtSource/export.py in 3D. The ground is a mesh shaped by the place's relief (cliffs
    /// stand up). Every item, and every decal (trees, glints), stands on its feet line as a card facing the camera
    /// (<see cref="Art.Lean"/>), unless it is a house built in 3D (<see cref="House"/>); the depth buffer sorts them
    /// with the characters. Everything plays one shared loop, so the whole place stays in step.
    /// Lights (lit windows, lamps, fireflies) are there at dusk and night only, never graded, and all but the fireflies
    /// glow on what is near them; day items (butterflies) only in the morning and at midday.
    /// </summary>
    public sealed class BakedArt : MonoBehaviour
    {
        public Vector2Int Size { get; private set; }
        public Color Bg { get; private set; }
        /// <summary>The whole place.json (anchors, paths, hotspots, extras).</summary>
        public JObject Data { get; private set; }
        public Relief Relief { get; private set; }

        readonly Dictionary<string, GameObject> items = new();
        readonly List<Vector4> lamps = new();
        readonly Vector4[] glows = new Vector4[MaxLamps];
        readonly List<Mesh> meshes = new(); // the ground's and the houses', made here
        // Tall items that turn see-through while someone stands behind them: their renderer, art box and feet row.
        readonly List<(Renderer renderer, Rect box, float y)> tall = new();
        readonly HashSet<Renderer> faded = new();
        static readonly int FadeId = Shader.PropertyToID("_Fade");
        const int TallFrom = 40; // art px
        const float SeeThroughAlpha = 0.45f;
        /// <summary>How far toward the camera (art px) a light, or anything hung on a wall, stands from the wall, and each item from the one before it on the same feet line.</summary>
        const float LightNudge = 0.5f, TieNudge = 0.02f;
        /// <summary>How far a light glows (art px) past half its size, and how many lights the shader takes at once.</summary>
        const float LampReach = 40f;
        const int MaxLamps = 32;
        static readonly int LampsId = Shader.PropertyToID("_Lamps"), LampCountId = Shader.PropertyToID("_LampCount");

        /// <summary><paramref name="dir"/> is places/&lt;place&gt;/&lt;variant&gt;; the relief is the place's own. Lit (underground), its lights burn at every hour.</summary>
        public static BakedArt Build(string dir, Transform parent, bool lit = false)
        {
            var art = new GameObject("World").AddComponent<BakedArt>();
            art.transform.SetParent(parent, false);
            var data = art.Data = Art.Json(dir + "/place");
            var height = dir[..dir.LastIndexOf('/')] + "/height";
            art.Relief = new Relief(Art.Has(height) ? Art.Texture(height) : null, data["origin"] is JArray origin ? Vector2Int.RoundToInt(Art.Point(origin)) : Vector2Int.zero);
            art.Size = Vector2Int.RoundToInt(Art.Point(data["size"]));
            art.Bg = Art.Color((string)data["bg"]);
            var atlases = new Texture2D[(int)data["atlases"]];
            for (var i = 0; i < atlases.Length; i++) atlases[i] = Art.Texture($"{dir}/atlas_{i}");
            float fps = (float)data["fps"];
            int loop = (int)data["loop"];
            var clips = new List<(int atlas, Piece piece)>();
            foreach (var c in data["clips"]) clips.Add(((int)c["atlas"], Piece.Of(c, Vector2.zero)));

            art.Ground(dir, data["below"], atlases, clips, fps, loop);
            var dark = lit || Game.Phase >= Phase.Dusk;
            var ties = new Dictionary<int, int>();
            foreach (JObject it in data["items"])
            {
                bool light = (bool?)it["light"] ?? false, day = (bool?)it["day"] ?? false;
                if ((light && !dark) || (day && dark)) continue;
                var name = (string)it["name"];
                var atlas = atlases[(int)it["atlas"]];
                if (it["model"] is JObject model)
                {
                    art.items[name] = art.House(name, model, atlas, Art.Point(it["frames"][0]), light);
                    continue;
                }
                var y = (int)it["y"];
                ties[y] = ties.TryGetValue(y, out var n) ? n + 1 : 0;
                var piece = Piece.Of(it, Art.Point(it["at"]));
                piece.Feet = y;
                if (it["body"] is JArray body) piece.Body = new Vector4((float)body[0], (float)body[1], (float)body[2], (float)body[3]);
                // A card on a house stands on the ground under the house's front (on), raised to where it hangs (lift).
                var on = it["on"] is JArray o ? Art.Point(o) : new Vector2(piece.At.x + piece.Size.x / 2f, y);
                piece.Ground = art.Relief.Under(on) + ((float?)it["lift"] ?? 0) + ties[y] * TieNudge + (light || piece.OnWall ? LightNudge : 0);
                var built = Pieces.Build(name, art.transform, atlas, fps, loop, new[] { piece }, light);
                art.items[name] = built.gameObject;
                var middle = piece.At + (Vector2)piece.Size / 2;
                if (light) art.Lamp(Art.World(middle, piece.Ground + piece.Feet - middle.y), Mathf.Max(piece.Size.x, piece.Size.y), name);
                else if (piece.Size.y >= TallFrom) art.tall.Add((built.GetComponent<Renderer>(), new Rect(piece.At, piece.Size), y));
            }
            return art;
        }

        /// <summary>
        /// Gives the shader the lights nearest to a point (world): it takes only so many, and a place can hold more,
        /// but never more than that on one screen.
        /// </summary>
        public void LightNear(Vector3 at)
        {
            if (lamps.Count <= MaxLamps) return;
            lamps.Sort((a, b) => ((Vector3)a - at).sqrMagnitude.CompareTo(((Vector3)b - at).sqrMagnitude));
            Glow();
        }

        /// <summary>Gives the shader this place's lights (the nearest, if there are more than it takes).</summary>
        public void Glow()
        {
            lamps.CopyTo(0, glows, 0, Mathf.Min(MaxLamps, lamps.Count));
            Shader.SetGlobalVectorArray(LampsId, glows);
            Shader.SetGlobalFloat(LampCountId, Mathf.Min(MaxLamps, lamps.Count));
        }

        // A light that glows on its surroundings, at a point in the place (art px) and as big as size; fireflies don't.
        void Lamp(Vector3 at, float size, string name)
        {
            if (name.StartsWith("firefly")) return;
            lamps.Add((Vector4)transform.TransformPoint(at) + new Vector4(0, 0, 0, (size / 2 + LampReach) * transform.lossyScale.x));
        }

        /// <summary>
        /// A house built in 3D (ArtSource/model.js), standing on the ground at its front line (at): each face its
        /// picture from the atlas on its four corners (texels across, up, rows back), shaded by how far it turns from the
        /// sun, so it lights and shadows as the sun moves. A lit window is a face of a light model, glowing over its wall.
        /// </summary>
        GameObject House(string name, JObject model, Texture2D atlas, Vector2 frame, bool light)
        {
            var at = Art.Point(model["at"]);
            var ground = Relief.Under(at);
            var sun = RenderSettings.sun && RenderSettings.sun.enabled ? -RenderSettings.sun.transform.forward : Vector3.zero;
            var verts = new List<Vector3>();
            var uvs = new List<Vector2>();
            var shades = new List<Vector4>();
            var tris = new List<int>();
            Vector2 min = new(float.MaxValue, float.MaxValue), max = -min;
            Vector2 Uv(float x, float y) => new(x / atlas.width, 1 - y / atlas.height);
            foreach (var face in model["faces"])
            {
                var v = verts.Count;
                foreach (var c in face["corners"])
                {
                    float up = (float)c[1];
                    var drawn = new Vector2(at.x + (float)c[0], at.y - (float)c[2] - up);
                    verts.Add(Art.World(drawn, ground + up));
                    (min, max) = (Vector2.Min(min, drawn), Vector2.Max(max, drawn));
                }
                var r = face["rect"];
                float x0 = frame.x + (float)r[0], y0 = frame.y + (float)r[1], x1 = x0 + (float)r[2], y1 = y0 + (float)r[3];
                uvs.AddRange(new[] { Uv(x0, y0), Uv(x1, y0), Uv(x1, y1), Uv(x0, y1) });
                // The face's outward normal in the world, where the place's scale stretches heights and depths.
                var normal = Vector3.Cross(transform.TransformVector(verts[v + 1] - verts[v]), transform.TransformVector(verts[v + 3] - verts[v])).normalized;
                var away = light || sun == Vector3.zero ? 0 : 1 - Mathf.Round(Mathf.Clamp01(Vector3.Dot(normal, sun) * 3) * 4) / 4;
                for (var k = 0; k < 4; k++) shades.Add(new Vector4(0, 0, away, 0));
                tris.AddRange(new[] { v, v + 1, v + 2, v, v + 2, v + 3 });
                if (light) Lamp((verts[v] + verts[v + 2]) / 2, Mathf.Max((float)r[2], (float)r[3]), name);
            }
            var mesh = new Mesh { name = name };
            meshes.Add(mesh);
            mesh.SetVertices(verts);
            mesh.SetUVs(0, uvs);
            mesh.SetUVs(1, new Vector4[verts.Count]);
            mesh.SetUVs(2, shades);
            mesh.SetTriangles(tris, 0);
            mesh.RecalculateBounds();
            var go = new GameObject(name);
            go.transform.SetParent(transform, false);
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var renderer = go.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = Art.Material(atlas, light);
            if (!light && max.y - min.y >= TallFrom) tall.Add((renderer, Rect.MinMaxRect(min.x, min.y, max.x, max.y), at.y));
            return go;
        }

        /// <summary>A point named in the exported scene (feet positions and points of interest).</summary>
        public Vector2 Anchor(string name) => Art.Point(Data["anchors"][name]);

        public bool HasAnchor(string name) => Data["anchors"][name] != null;

        public void ShowItem(string name, bool visible) => items[name].SetActive(visible);

        /// <summary>Like <see cref="ShowItem"/>, for items only some places, or times of day, have.</summary>
        public void ShowItemIfAny(string name, bool visible)
        {
            if (items.TryGetValue(name, out var item)) item.SetActive(visible);
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

        void OnDestroy()
        {
            foreach (var mesh in meshes) Destroy(mesh);
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
                var mesh = Relief.Mesh(new RectInt(at.x, at.y, tex.width, tex.height));
                meshes.Add(mesh);
                go.AddComponent<MeshFilter>().sharedMesh = mesh;
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
    /// its Feet row: the rows above stand upright, any rows below lie on the ground in front. A building has a Body: its
    /// eave and ridge rows and the x of its side walls, so it stands as a house does (<see cref="Pieces"/>).
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
        public Vector4 Body; // eave row, ridge row, left and right wall (art px); zero for none, no walls for a building's lights
        /// <summary>Hung on a building (its lights, smoke, lanterns): its body, no walls of its own.</summary>
        public readonly bool OnWall => Body != Vector4.zero && Body.w <= Body.z;

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
    /// Pieces of a place drawn from its atlas as one mesh. A piece is a few quads: the part above its feet row
    /// standing, leaning back to face the camera; the part below lying on the ground in front. A building stands as a
    /// house does instead: its front wall upright from its feet to its eave, its roof sloping back from the eave to the
    /// ridge (<see cref="Pitch"/>), what rises over the ridge (towers, chimneys) upright there, and side walls with a
    /// gable each, coloured from the wall's own edge column and shaded darker. Each piece plays its own run of frames
    /// through the shared loop; only the pieces whose frame changed are updated. A swaying piece's quads are widened by
    /// its sway on both sides, so the bent rows have room; the shader keeps to the piece's own texels (uv1) and bends
    /// them by uv2 (sway, phase, shade).
    /// </summary>
    public sealed class Pieces : MonoBehaviour
    {
        /// <summary>A roof's rise over its run; it climbs as many art rows as rise and run together.</summary>
        const float Pitch = 1.2f;
        const float SideShade = 0.3f;
        Mesh mesh;
        Vector2[] uvs, texels;
        Vector4[] rects;
        Piece[] pieces;
        int[] shown, first;
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
            p.first = new int[n + 1];
            var verts = new List<Vector3>();
            var texels = new List<Vector2>();
            var sways = new List<Vector4>();
            var tris = new List<int>();
            var moving = false;
            for (var i = 0; i < n; i++)
            {
                var piece = p.pieces[i] = pieces[i];
                moving |= piece.Frames.Length > 1;
                p.first[i] = verts.Count;
                var sway = new Vector2(piece.Sway, piece.At.x * 0.013f + piece.At.y * 0.004f);
                // A quad from four (3D point, art point) corners, top left first, clockwise.
                void Quad(float shade, params (Vector3 at, Vector2 art)[] c)
                {
                    var v = verts.Count;
                    foreach (var (at, art) in c)
                    {
                        verts.Add(at);
                        texels.Add(art - piece.At);
                        sways.Add(new Vector4(sway.x, sway.y, shade, 0));
                    }
                    tris.AddRange(new[] { v, v + 1, v + 2, v, v + 2, v + 3 });
                }
                var pad = Mathf.Ceil(piece.Sway);
                float x0 = piece.At.x - pad, x1 = piece.At.x + piece.Size.x + pad, top = piece.At.y, bottom = top + piece.Size.y;
                float feet = Mathf.Clamp(piece.Feet, top, bottom), h = piece.Ground;
                // Row r of the piece, at height up above its ground: up px up something standing lies up px back.
                (Vector3, Vector2) At(float x, float r, float up) => (Art.World(new Vector2(x, r), h + up), new Vector2(x, r));
                void Band(float r0, float r1, System.Func<float, float> up)
                {
                    (r0, r1) = (Mathf.Max(r0, top), Mathf.Min(r1, bottom));
                    if (r1 > r0) Quad(0, At(x0, r0, up(r0)), At(x1, r0, up(r0)), At(x1, r1, up(r1)), At(x0, r1, up(r1)));
                }
                Band(feet, bottom, r => 0);
                float f = piece.Feet, eave = piece.Body.x, ridge = piece.Body.y;
                if (piece.Body == Vector4.zero) Band(top, feet, r => Art.Lean(f - r));
                else
                {
                    float wall = f - eave, run = (eave - ridge) / (1 + Pitch), crest = wall + run * Pitch;
                    Band(eave, feet, r => f - r);
                    Band(ridge, Mathf.Min(eave, feet), r => wall + (eave - r) * Pitch / (1 + Pitch));
                    Band(top, Mathf.Min(ridge, feet), r => crest + ridge - r);
                    // The sides: depth runs back from the front wall (the feet row) as far as the roof's two slopes.
                    (Vector3, Vector2) Side(float x, float back, float up, float row) =>
                        (Art.World(new Vector2(x, f - back - up), h + up), new Vector2(x, row));
                    // (A building's lights and smoke have its body but no walls of their own.)
                    if (piece.Body.w > piece.Body.z)
                    foreach (var (x, inside) in new[] { (piece.Body.z, 0.5f), (piece.Body.w, -0.5f) })
                    {
                        float u = x + inside, low = eave + 2;
                        Quad(SideShade, Side(x, 0, wall, eave), Side(x, 2 * run, wall, eave), Side(x, 2 * run, 0, f - 0.5f), Side(x, 0, 0, f - 0.5f));
                        Quad(SideShade, Side(x, 0, wall, low), Side(x, run, crest, low), Side(x, 2 * run, wall, low), Side(x, 2 * run, wall, low));
                        for (var k = verts.Count - 8; k < verts.Count; k++) texels[k] = new Vector2(u - piece.At.x, texels[k].y);
                    }
                }
                p.shown[i] = piece.Seq[piece.Offset % piece.Seq.Length];
            }
            p.first[n] = verts.Count;
            p.texels = texels.ToArray();
            p.uvs = new Vector2[verts.Count];
            p.rects = new Vector4[verts.Count];
            for (var i = 0; i < n; i++) p.SetFrame(i, p.shown[i]);
            p.mesh = new Mesh { name = name, indexFormat = verts.Count > 65000 ? UnityEngine.Rendering.IndexFormat.UInt32 : UnityEngine.Rendering.IndexFormat.UInt16 };
            p.mesh.SetVertices(verts);
            p.mesh.SetUVs(0, p.uvs);
            p.mesh.SetUVs(1, p.rects);
            p.mesh.SetUVs(2, sways);
            p.mesh.SetTriangles(tris, 0);
            p.mesh.RecalculateBounds();
            go.AddComponent<MeshFilter>().sharedMesh = p.mesh;
            go.AddComponent<MeshRenderer>().sharedMaterial = Art.Material(atlas, light);
            p.enabled = moving;
            return p;
        }

        // Each vertex shows its art point (texels, relative to the piece's corner) in the frame's place in the atlas.
        void SetFrame(int i, int frame)
        {
            shown[i] = frame;
            var piece = pieces[i];
            var a = piece.Frames[frame];
            var s = piece.Size;
            var rect = new Vector4(a.x / atlasSize.x, 1f - a.y / atlasSize.y, (a.x + s.x) / atlasSize.x, 1f - (a.y + s.y) / atlasSize.y);
            for (var k = first[i]; k < first[i + 1]; k++)
            {
                uvs[k] = new Vector2((a.x + texels[k].x) / atlasSize.x, 1f - (a.y + texels[k].y) / atlasSize.y);
                rects[k] = rect;
            }
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
