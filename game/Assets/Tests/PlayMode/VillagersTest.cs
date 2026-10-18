using System.Linq;
using NUnit.Framework;
using UnityEngine;

namespace Shop.Tests
{
    /// <summary>
    /// Everyone can be found: each stop on someone's round, and where the courier stands to talk to them there, can be
    /// walked to from where the courier arrives in the place, or from its way out.
    /// </summary>
    public sealed class VillagersTest
    {
        [Test]
        public void EveryoneCanBeReached()
        {
            foreach (var def in Places.Every.Where(d => d.People.Length > 0))
            {
                var walk = new WalkMap(Art.Texture($"places/{def.Id}/walk"));
                var exit = def.Hotspots.First(h => h.ExitTo != null);
                var from = def.Spawns.Count > 0 ? def.Spawns.Values.First() : exit.At + exit.Spot;
                foreach (var p in def.People)
                    foreach (var at in p.Round?.Select(s => s.At) ?? new[] { p.At })
                    {
                        if (p.Round != null) Assert.IsTrue(Reaches(walk, from, at), $"{def.Id}: {p.Id} cannot walk to the stop at {at}");
                        Assert.IsTrue(Reaches(walk, from, at + p.Spot), $"{def.Id}: the courier cannot walk up to {p.Id} at {at}");
                    }
            }
        }

        static bool Reaches(WalkMap walk, Vector2 from, Vector2 to)
        {
            var path = walk.Path(from, to);
            return walk.Walkable(to) && path.Count > 0 && Vector2.Distance(path[^1], to) < Place.Reach;
        }
    }
}
