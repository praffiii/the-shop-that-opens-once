using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Not part of the story: a short run through every system (walking, places, talking, choices, the bag, handing
    /// over a keepsake, a lantern going out, saving) on the art carried over from Godot. The Prologue replaces it.
    /// </summary>
    public sealed class DevChapter : Chapter
    {
        public DevChapter(Main main) : base(main) { }

        public override async Awaitable Start()
        {
            await Card("Systems test", "Not part of the story.");
            await Go("village", "start");
            Hint("Click to walk, or use WASD. Space uses what is close.");
        }

        public override async Awaitable Entered(string place)
        {
            if (place != "shop" || Game.Has("met_marlow")) return;
            Game.Mark("met_marlow");
            await Say("marlow", "You found the shop. Good.");
            await Say("marlow", "This belongs to someone waiting at the old station. Take it to them.");
            await HandOver("watch", 0);
            Hint("Press E to look in your bag.");
        }

        public override async Awaitable Interact(string id)
        {
            switch (id)
            {
                case "helen" when Game.Bag.Contains("watch"):
                    await Say("helen", "Another evening, another train that doesn't come.");
                    if (await Choose("Show the watch", "Goodbye") != 0) return;
                    await GiveKeepsake("helen", "watch");
                    await Say("helen", "Oh. Where did you find this?", "moved");
                    await LanternGoesOut();
                    await Main.EndChapter();
                    break;
                case "marlow":
                    await Say("marlow", Game.Bag.Count > 0 ? "The station is down the road, past the signpost." : "Mind the lanterns.");
                    break;
                default:
                    await ShowText($"Nothing written here yet ({id}).");
                    break;
            }
        }
    }
}
