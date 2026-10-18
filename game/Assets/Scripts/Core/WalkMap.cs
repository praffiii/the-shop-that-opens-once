using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Where feet may stand in a place (the white pixels of its walk.png), and walking paths across it.
    /// Paths are found on a coarse grid, then straightened wherever a direct line stays walkable.
    /// </summary>
    public sealed class WalkMap
    {
        const int Cell = 4;
        const float Diagonal = 1.41421356f;

        readonly bool[] mask; // per art pixel, row 0 at the top
        readonly int width, height;
        readonly bool[] solid; // per grid cell
        readonly int cols, rows;

        /// <summary><paramref name="tex"/> is a walk.png imported readable (see Editor/PixelArtImport.cs).</summary>
        public WalkMap(Texture2D tex)
        {
            width = tex.width;
            height = tex.height;
            var pixels = tex.GetPixels32(); // rows from the bottom up
            mask = new bool[width * height];
            for (var y = 0; y < height; y++)
                for (var x = 0; x < width; x++)
                    mask[y * width + x] = pixels[(height - 1 - y) * width + x].r > 127;
            cols = (width + Cell - 1) / Cell;
            rows = (height + Cell - 1) / Cell;
            solid = new bool[cols * rows];
            for (var i = 0; i < solid.Length; i++)
                solid[i] = !Walkable(Center(i));
        }

        public bool Walkable(Vector2 p)
        {
            int x = Mathf.FloorToInt(p.x), y = Mathf.FloorToInt(p.y);
            return x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x];
        }

        /// <summary>Where feet moving from <paramref name="from"/> by <paramref name="motion"/> end up: the full move, or a slide along a wall.</summary>
        public Vector2 Slide(Vector2 from, Vector2 motion)
        {
            foreach (var m in new[] { motion, new Vector2(motion.x, 0), new Vector2(0, motion.y) })
                if (m != Vector2.zero && Walkable(from + m))
                    return from + m;
            return from;
        }

        /// <summary>
        /// Points to walk through from <paramref name="from"/> towards <paramref name="to"/>, ending on the walkable
        /// point nearest to it. Empty when there is no way there.
        /// </summary>
        public List<Vector2> Path(Vector2 from, Vector2 to)
        {
            int goal = NearestCell(to), start = NearestCell(from);
            var cells = goal < 0 || start < 0 ? null : Search(start, goal);
            if (cells == null) return new List<Vector2>();
            var points = new List<Vector2> { from };
            foreach (var c in cells) points.Add(Center(c));
            var last = points[^1];
            points.Add(Walkable(to) && Clear(last, to) ? to : last);
            return Straighten(points);
        }

        Vector2 Center(int cell) => new(cell % cols * Cell + Cell / 2f, cell / cols * Cell + Cell / 2f);

        bool Solid(int x, int y) => x < 0 || y < 0 || x >= cols || y >= rows || solid[y * cols + x];

        float Estimate(int a, int b) => Vector2.Distance(Center(a), Center(b)) / Cell;

        // A* over the grid. Diagonal steps are allowed only when both cells beside them are open.
        List<int> Search(int start, int goal)
        {
            var cost = new Dictionary<int, float> { [start] = 0 };
            var from = new Dictionary<int, int>();
            var open = new SortedSet<(float, int)> { (Estimate(start, goal), start) };
            var done = new HashSet<int>();
            while (open.Count > 0)
            {
                var (_, cur) = open.Min;
                open.Remove(open.Min);
                if (cur == goal)
                {
                    var path = new List<int> { cur };
                    while (from.TryGetValue(cur, out cur)) path.Add(cur);
                    path.Reverse();
                    return path;
                }
                if (!done.Add(cur)) continue;
                int cx = cur % cols, cy = cur / cols;
                for (var dy = -1; dy <= 1; dy++)
                    for (var dx = -1; dx <= 1; dx++)
                    {
                        int nx = cx + dx, ny = cy + dy;
                        if ((dx == 0 && dy == 0) || Solid(nx, ny)) continue;
                        var diagonal = dx != 0 && dy != 0;
                        if (diagonal && (Solid(cx + dx, cy) || Solid(cx, cy + dy))) continue;
                        var next = ny * cols + nx;
                        var g = cost[cur] + (diagonal ? Diagonal : 1f);
                        if (done.Contains(next) || (cost.TryGetValue(next, out var old) && old <= g)) continue;
                        cost[next] = g;
                        from[next] = cur;
                        open.Add((g + Estimate(next, goal), next));
                    }
            }
            return null;
        }

        int NearestCell(Vector2 p)
        {
            int cx = Mathf.FloorToInt(p.x / Cell), cy = Mathf.FloorToInt(p.y / Cell);
            for (var r = 0; r < 13; r++)
                for (var dy = -r; dy <= r; dy++)
                    for (var dx = -r; dx <= r; dx++)
                        if (Mathf.Max(Mathf.Abs(dx), Mathf.Abs(dy)) == r && !Solid(cx + dx, cy + dy))
                            return (cy + dy) * cols + cx + dx;
            return -1;
        }

        List<Vector2> Straighten(List<Vector2> points)
        {
            var result = new List<Vector2> { points[0] };
            var i = 0;
            while (i < points.Count - 1)
            {
                var j = points.Count - 1;
                while (j > i + 1 && !Clear(points[i], points[j])) j--;
                result.Add(points[j]);
                i = j;
            }
            return result;
        }

        bool Clear(Vector2 a, Vector2 b)
        {
            var steps = Mathf.CeilToInt(Vector2.Distance(a, b));
            for (var s = 1; s <= steps; s++)
                if (!Walkable(Vector2.Lerp(a, b, s / (float)steps)))
                    return false;
            return true;
        }
    }
}
