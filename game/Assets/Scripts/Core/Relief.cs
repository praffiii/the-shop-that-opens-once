using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// The shape of a place's ground in the 3D view, from its height.png (ArtSource/export-world.js): how high each art
    /// pixel's surface stands above level 0, and whether it stands upright (a cliff or bank face). An area's map reaches
    /// past its edges, so its top left stands at an origin in the place. A place without one (the rooms) is flat.
    ///
    /// The art is drawn as the camera sees it, so an art pixel at row r on a surface h px high sits at depth r + h
    /// (<see cref="Art.World"/>). Seen along the camera's tilt, every pixel lands back where it was drawn; seen in
    /// perspective, cliffs stand up and the ground recedes.
    /// </summary>
    public sealed class Relief
    {
        readonly short[] height;
        readonly bool[] upright;
        readonly int width, rows;
        readonly Vector2Int origin;

        /// <summary><paramref name="tex"/> is a height.png imported readable (see Editor/PixelArtImport.cs), or null for flat ground; its top left is at <paramref name="origin"/> (art px).</summary>
        public Relief(Texture2D tex, Vector2Int origin)
        {
            this.origin = origin;
            if (tex == null) return;
            width = tex.width;
            rows = tex.height;
            var pixels = tex.GetPixels32(); // rows from the bottom up
            height = new short[width * rows];
            upright = new bool[width * rows];
            for (var y = 0; y < rows; y++)
                for (var x = 0; x < width; x++)
                {
                    var c = pixels[(rows - 1 - y) * width + x];
                    height[y * width + x] = (short)(c.r - 64);
                    upright[y * width + x] = c.g > 127;
                }
        }

        /// <summary>The surface height (art px) at art pixel (x, y), clamped to the map.</summary>
        public float Height(int x, int y) => height == null ? 0 : height[Index(x, y)];

        int Index(int x, int y) => Mathf.Clamp(y - origin.y, 0, rows - 1) * width + Mathf.Clamp(x - origin.x, 0, width - 1);

        /// <summary>The height of the ground under feet at <paramref name="feet"/>: the pixel just behind the feet line.</summary>
        public float Under(Vector2 feet) => Height(Mathf.FloorToInt(feet.x), Mathf.FloorToInt(feet.y) - 1);

        /// <summary>
        /// How high to stand something <paramref name="tall"/> px tall that leans back to face the camera (an ant) at
        /// <paramref name="feet"/>: on the ground, or raised toward the camera where the ground behind it climbs faster
        /// than it leans (steep stairs, the foot of a cliff), so the ground never covers it.
        /// </summary>
        public float Stand(Vector2 feet, int tall)
        {
            int x = Mathf.FloorToInt(feet.x), y = Mathf.FloorToInt(feet.y) - 1;
            var h = Height(x, y);
            for (var up = 1; up <= tall; up++) h = Mathf.Max(h, Height(x, y - up) - Art.Lean(up));
            return h;
        }

        bool Upright(int x, int y) => upright != null && upright[Index(x, y)];

        /// <summary>
        /// The ground under <paramref name="part"/> (art px) as a mesh showing a texture of that part. Each column of
        /// pixels is one strip: a flat pixel spans a row of depth, an upright one a pixel of height, and the strip
        /// runs on between them where the height jumps; straight runs are merged. Where two columns differ (along a
        /// cliff's ragged edge) a side wall closes the gap between them, which the perspective would show, textured
        /// with the higher column's pixels.
        /// </summary>
        public Mesh Mesh(RectInt part)
        {
            var verts = new List<Vector3>();
            var uvs = new List<Vector2>();
            var tris = new List<int>();
            var line = new List<Vector3>();
            // (depth, height, texture row) of each row's top and bottom, down one column and the one left of it,
            // ending on the top of the next part's first row so the parts join.
            int n = part.height * 2 + (part.yMax < origin.y + rows ? 1 : 0);
            Vector3[] left = new Vector3[n], here = new Vector3[n];
            float U(int x) => (Mathf.Clamp(x, part.xMin, part.xMax - 1) - part.xMin + 0.5f) / part.width;
            float V(float row) => 1 - (row - part.yMin) / part.height;
            void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d, Vector2 ua, Vector2 ub, Vector2 uc, Vector2 ud)
            {
                var i = verts.Count;
                verts.AddRange(new[] { a, b, c, d });
                uvs.AddRange(new[] { ua, ub, uc, ud });
                tris.AddRange(new[] { i, i + 1, i + 2, i, i + 2, i + 3 });
            }
            Vector3 At(float x, Vector3 p) => new(x, p.y, -p.x);
            for (var x = part.xMin - 1; x < part.xMax; x++)
            {
                for (var r = part.yMin; r < part.yMax; r++)
                {
                    var h = Height(x, r);
                    var k = (r - part.yMin) * 2;
                    here[k] = new Vector3(r + h, h, r);
                    here[k + 1] = Upright(x, r) ? new Vector3(r + h, h - 1, r + 1) : new Vector3(r + 1 + h, h, r + 1);
                }
                if (n % 2 == 1) here[n - 1] = new Vector3(part.yMax + Height(x, part.yMax), Height(x, part.yMax), part.yMax);
                if (x >= part.xMin)
                {
                    line.Clear();
                    foreach (var p in here) Add(line, p);
                    float u0 = (x - part.xMin) / (float)part.width, u1 = (x + 1 - part.xMin) / (float)part.width;
                    for (var k = 0; k < line.Count - 1; k++)
                        Quad(At(x, line[k]), At(x + 1, line[k]), At(x + 1, line[k + 1]), At(x, line[k + 1]),
                            new Vector2(u0, V(line[k].z)), new Vector2(u1, V(line[k].z)), new Vector2(u1, V(line[k + 1].z)), new Vector2(u0, V(line[k + 1].z)));
                    for (var k = 0; k < n - 1; k++)
                    {
                        Vector3 la = left[k], lb = left[k + 1], ha = here[k], hb = here[k + 1];
                        if (la == ha && lb == hb) continue;
                        var u = U(Mathf.Max(la.y, lb.y) >= Mathf.Max(ha.y, hb.y) ? x - 1 : x);
                        Quad(At(x, la), At(x, lb), At(x, hb), At(x, ha),
                            new Vector2(u, V(la.z)), new Vector2(u, V(lb.z)), new Vector2(u, V(hb.z)), new Vector2(u, V(ha.z)));
                    }
                }
                (left, here) = (here, left);
            }
            var mesh = new Mesh { name = $"ground {part}", indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 };
            mesh.SetVertices(verts);
            mesh.SetUVs(0, uvs);
            // The pixel shader reads a piece's texel rect and sway too; the ground has neither.
            mesh.SetUVs(1, new Vector4[verts.Count]);
            mesh.SetUVs(2, new Vector2[verts.Count]);
            mesh.SetTriangles(tris, 0);
            mesh.RecalculateBounds();
            return mesh;
        }

        // Adds a point to a column's line; a point going on straight from the last two replaces the last.
        static void Add(List<Vector3> line, Vector3 p)
        {
            var n = line.Count;
            if (n > 0 && line[n - 1] == p) return;
            if (n > 1)
            {
                Vector3 a = line[n - 1] - line[n - 2], b = p - line[n - 1];
                if (Vector3.Cross(a, b).sqrMagnitude < 1e-6f && Vector3.Dot(a, b) > 0)
                {
                    line[n - 1] = p;
                    return;
                }
            }
            line.Add(p);
        }
    }
}
