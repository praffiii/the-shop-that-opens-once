using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Not part of the story: a short run through every system (walking, places, talking, choices, the bag, handing
    /// over a keepsake, a lantern going out, saving), from the title's editor-only option. Night 1 replaces it.
    /// </summary>
    public sealed class DevChapter : Chapter
    {
        public DevChapter(Main main) : base(main) { }

        public override async Awaitable Start()
        {
            await Card("Systems test", "Not part of the story.");
            await Go("station", "start");
            Hint("Click to walk, or use WASD (hold Shift to run). Space uses what is close.");
        }

        public override async Awaitable Entered(string place)
        {
            if (place != "shop" || Game.Has("met_marlow")) return;
            Game.Mark("met_marlow");
            // the handover as a cinematic scene: Marlow leaves what he was doing for the counter as the courier comes
            // up to it, talks on as he fetches the night's box from the cabinet, and the courier opens it
            await Cinema(true);
            var coming = Walk("marlow", Anchor("marlow"));
            var stepping = Walk("courier", Anchor("counter"));
            await Look(Anchor("counter"));
            await Say("marlow", "You found the shop. Good.");
            await coming;
            await stepping;
            var fetching = FetchBox(0);
            await Say("marlow", "Every night, one box. Tonight, this one.");
            await fetching;
            await HandOver();
            await Say("marlow", "Open it.");
            await OpenBox(0, "watch");
            await Say("marlow", "It belongs to someone waiting on the old platform. Take it to them.");
            await Cinema(false);
            await Look(null);
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
                    await Say("marlow", Game.Bag.Count > 0 ? "The platform is up the steps and past the forge, by the tea stall." : "Mind the lanterns.");
                    break;
                default:
                    await Chat(id);
                    break;
            }
        }
    }
}
