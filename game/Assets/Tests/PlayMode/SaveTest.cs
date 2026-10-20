using NUnit.Framework;

namespace Shop.Tests
{
    /// <summary>What the courier carries and knows survives a save and load, and goes on into the next chapter.</summary>
    public sealed class SaveTest
    {
        [Test]
        public void SavesAndLoadsTheStory()
        {
            var saved = Game.Raw;
            try
            {
                Game.NewGame();
                Game.StartChapter(3, Phase.Night);
                Game.Bag.AddRange(new[] { "contract", "watch" });
                Game.Mark("met_marlow");
                Game.Remember("helen_lantern");
                Game.Note("A passing clue.");
                Game.Note("A standing fact.", keep: true);
                Game.Phase = Phase.Midday;
                Game.Save("midday");

                Game.NewGame();
                Assert.IsTrue(Game.Load());
                Assert.AreEqual(3, Game.Chapter);
                Assert.AreEqual(Phase.Midday, Game.Phase);
                Assert.AreEqual("midday", Game.Checkpoint);
                CollectionAssert.AreEqual(new[] { "contract", "watch" }, Game.Bag);
                Assert.IsTrue(Game.Has("met_marlow") && Game.Has("helen_lantern"));
                CollectionAssert.AreEqual(new[] { "A passing clue.", "A standing fact." }, Game.Notes);

                Game.StartChapter(4, Phase.Night);
                CollectionAssert.AreEqual(new[] { "contract", "watch" }, Game.Bag, "The bag goes on into the next chapter");
                Assert.IsFalse(Game.Has("met_marlow"), "A chapter's flags end with it");
                Assert.IsTrue(Game.Has("helen_lantern"), "A standing fact stays");
                CollectionAssert.AreEqual(new[] { "A standing fact." }, Game.Notes, "Only kept notes stay");
            }
            finally
            {
                Game.Raw = saved;
                Game.NewGame();
            }
        }
    }
}
