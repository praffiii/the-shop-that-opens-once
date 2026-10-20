using System.Linq;
using NUnit.Framework;
using UnityEngine;

namespace Shop.Tests
{
    /// <summary>
    /// Everyone can be found: each stop on someone's round, and where the courier stands to talk to them there, can be
    /// walked to from where the courier arrives in the place, or from its way out; and everyone out of doors has
    /// something of their own to say.
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

        [Test]
        public void EveryoneOutdoorsHasSomethingToSay()
        {
            foreach (var def in Places.Every.Where(d => !d.Indoors))
                foreach (var p in def.People)
                    Assert.IsTrue(p.Lines is { Length: > 0 } && p.Lines.All(l => !string.IsNullOrWhiteSpace(l)), $"{def.Id}: {p.Id} has nothing to say");
        }

        static bool Reaches(WalkMap walk, Vector2 from, Vector2 to)
        {
            var path = walk.Path(from, to);
            return walk.Walkable(to) && path.Count > 0 && Vector2.Distance(path[^1], to) < Place.Reach;
        }
    }
}
