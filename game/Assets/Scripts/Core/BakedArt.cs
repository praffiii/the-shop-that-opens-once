using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Draws a place exported by ArtSource/export.py. The ground is drawn under everyone. Each item is depth-sorted
    /// by its feet line with the characters. The air (smoke, leaves, birds) is drawn over all. Everything plays one
    /// shared loop, so the whole place stays in step.
    /// </summary>
    public sealed class BakedArt : MonoBehaviour
    {
        public const int Below = -32000, Above = 32000;

        public Vector2Int Size { get; private set; }
        public Color Bg { get; private set; }
        /// <summary>The whole place.json (anchors, paths, hotspots, extras).</summary>
        public JObject Data { get; private set; }

        readonly Dictionary<string, Pieces> items = new();

        /// <summary>Sorting order for something whose feet are at art row <paramref name="y"/>: items, then people, then what people hold.</summary>
        public static int Order(float y, int layer = 0) => Mathf.RoundToInt(y) * 4 + layer;

        public static BakedArt Build(string dir, Transform parent)
        {
            var art = new GameObject("World").AddComponent<BakedArt>();
            art.transform.SetParent(parent, false);
            var data = art.Data = Art.Json(dir + "/place");
            art.Size = Vector2Int.RoundToInt(Art.Point(data["size"]));
            art.Bg = Art.Color((string)data["bg"]);
            var atlas = Art.Texture(dir + "/atlas");
            float fps = (float)data["fps"];
            int loop = (int)data["loop"];

            art.Image(dir, data["below"], Below);
            Pieces.Build("below", art.transform, atlas, fps, loop, (JArray)data["below"]["tiles"], Below + 1);
            foreach (JObject it in data["items"])
            {
                var name = (string)it["name"];
                art.items[name] = Pieces.Build(name, art.transform, atlas, fps, loop, new JArray(it), Order((float)it["y"]));
            }
            if (data["above"] is JObject above)
            {
                art.Image(dir, above, Above);
                Pieces.Build("above", art.transform, atlas, fps, loop, (JArray)above["tiles"], Above + 1);
            }
            return art;
        }

        /// <summary>A point named in the exported scene (feet positions and points of interest).</summary>
        public Vector2 Anchor(string name) => Art.Point(Data["anchors"][name]);

        public bool HasAnchor(string name) => Data["anchors"][name] != null;

        public void ShowItem(string name, bool visible) => items[name].gameObject.SetActive(visible);

        /// <summary>Like <see cref="ShowItem"/>, for items only some places have.</summary>
        public void ShowItemIfAny(string name, bool visible)
        {
            if (items.TryGetValue(name, out var item)) item.gameObject.SetActive(visible);
        }

        void Image(string dir, JToken layer, int order)
        {
            var file = ((string)layer["image"]).Replace(".png", "");
            var sr = new GameObject(file).AddComponent<SpriteRenderer>();
            sr.transform.SetParent(transform, false);
            sr.sprite = Art.Sprite(Art.Texture($"{dir}/{file}"));
            sr.sharedMaterial = Art.SpriteMaterial;
            sr.sortingOrder = order;
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
        Vector2Int[][] frames;  // atlas position of each piece's frames
        int[][] seqs;            // frame index of each piece at every loop sample
        int[] shown;
        Vector2Int[] sizes;
        Vector2 atlasSize;
        float fps;
        int loop, sample = -1;

        public static Pieces Build(string name, Transform parent, Texture2D atlas, float fps, int loop, JArray pieces, int order)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var p = go.AddComponent<Pieces>();
            p.fps = fps;
            p.loop = loop;
            p.atlasSize = new Vector2(atlas.width, atlas.height);
            int n = pieces.Count;
            p.frames = new Vector2Int[n][];
            p.seqs = new int[n][];
            p.sizes = new Vector2Int[n];
            p.shown = new int[n];
            p.uvs = new Vector2[n * 4];
            var verts = new Vector3[n * 4];
            var tris = new int[n * 6];
            var moving = false;
            for (var i = 0; i < n; i++)
            {
                var piece = pieces[i];
                var at = Art.Point(piece["at"]);
                var size = p.sizes[i] = Vector2Int.RoundToInt(Art.Point(piece["size"]));
                var f = (JArray)piece["frames"];
                p.frames[i] = new Vector2Int[f.Count];
                for (var k = 0; k < f.Count; k++) p.frames[i][k] = Vector2Int.RoundToInt(Art.Point(f[k]));
                var seq = new List<int>();
                foreach (var run in piece["seq"])
                    for (var r = 0; r < (int)run[1]; r++) seq.Add((int)run[0]);
                p.seqs[i] = seq.ToArray();
                moving |= f.Count > 1;

                verts[i * 4] = Art.World(at);
                verts[i * 4 + 1] = Art.World(at + new Vector2(size.x, 0));
                verts[i * 4 + 2] = Art.World(at + new Vector2(size.x, size.y));
                verts[i * 4 + 3] = Art.World(at + new Vector2(0, size.y));
                tris[i * 6] = i * 4;
                tris[i * 6 + 1] = i * 4 + 1;
                tris[i * 6 + 2] = i * 4 + 2;
                tris[i * 6 + 3] = i * 4;
                tris[i * 6 + 4] = i * 4 + 2;
                tris[i * 6 + 5] = i * 4 + 3;
                p.SetFrame(i, p.seqs[i][0]);
            }
            p.mesh = new Mesh { name = name, indexFormat = verts.Length > 65000 ? UnityEngine.Rendering.IndexFormat.UInt32 : UnityEngine.Rendering.IndexFormat.UInt16 };
            p.mesh.SetVertices(verts);
            p.mesh.SetUVs(0, p.uvs);
            p.mesh.SetTriangles(tris, 0);
            go.AddComponent<MeshFilter>().sharedMesh = p.mesh;
            var mr = go.AddComponent<MeshRenderer>();
            mr.sharedMaterial = Art.Material(atlas);
            mr.sortingOrder = order;
            p.enabled = moving;
            return p;
        }

        void SetFrame(int i, int frame)
        {
            shown[i] = frame;
            var a = frames[i][frame];
            var s = sizes[i];
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
            for (var i = 0; i < seqs.Length; i++)
            {
                var seq = seqs[i];
                if (seq.Length < 2) continue;
                var f = seq[s % seq.Length];
                if (f == shown[i]) continue;
                SetFrame(i, f);
                changed = true;
            }
            if (changed) mesh.SetUVs(0, uvs);
        }

        void OnDestroy() => Destroy(mesh);
    }
}
