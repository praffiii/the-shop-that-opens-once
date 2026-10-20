using System.Linq;
using NUnit.Framework;
using UnityEngine;

namespace Shop.Tests
{
    /// <summary>
    /// Everyone can be found: each stop on someone's round, and where the courier stands to talk to them there, can be
    /// walked to from where the courier arrives in the place, or from its way out; everyone out of doors has
    /// something of their own to say; and the village's news of the days gone by is said once, on its days.
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

        [Test]
        public void TheVillageRemembersOnce()
        {
            Game.NewGame();
            Game.StartChapter(2, Phase.Morning);
            Assert.IsNull(Gossip.Next("nora"), "Mia's letter was never carried, so Nora has no word of it");
            Game.Remember("delivered_post_mia");
            StringAssert.Contains("Mia's letter", Gossip.Next("nora"));
            Assert.IsNull(Gossip.Next("nora"), "A word is said once");
            Game.StartChapter(3, Phase.Morning);
            StringAssert.Contains("red ear", Gossip.Next("nora"), "The next day, news of Pip's Mochi");
            Game.StartChapter(4, Phase.Morning);
            Assert.IsNull(Gossip.Next("nora"), "Old news is not said");
            Game.NewGame();
        }

        static bool Reaches(WalkMap walk, Vector2 from, Vector2 to)
        {
            var path = walk.Path(from, to);
            return walk.Walkable(to) && path.Count > 0 && Vector2.Distance(path[^1], to) < Place.Reach;
        }
    }
}
