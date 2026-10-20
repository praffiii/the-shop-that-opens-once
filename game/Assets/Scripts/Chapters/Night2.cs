using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Night 2, The Stitched Rabbit (the word: Caring). Marlow's second box, carved PIP, holds Mochi: the patchwork rabbit
    /// Ratih sewed Pip after the whirlwind ten years ago, torn and lost in the mud flood two years ago. In the morning
    /// square the elders pity Pip, who screamed at the thunder all night; Valdo scorns the rag, the marble trio say Pip
    /// ran to Grandma Nora's, and Mia says not to give it back broken: chamomile from the Gardener's field for the smell,
    /// Ratih's red thread from Nora. At midday Nora gives the thread and a teak button, the Gardener's blooms are cut
    /// from among the brambles (minigame 2A), and at home on Mother's treadle machine the ear is sewn back on (minigame
    /// 2B). At dusk on Nora's steps Satria gives Pip his rabbit; Nora remembers Ratih sewing dolls for the frightened
    /// children in the storm's emergency tent, played as a sepia memory.
    /// </summary>
    public sealed class Night2 : NightChapter
    {
        /// <summary>Pip on Grandma Nora's steps, where Satria crouches to him, and where Ratih comes up in the memory.</summary>
        static readonly Vector2 Steps = new(345, 424), ByPip = new(386, 440), RatihFrom = new(436, 450);
        /// <summary>The marble ring on the square's east lawn, and where Satria crouches by it, beside Lulu.</summary>
        static readonly Vector2 Ring = new(1100, 890), ByRing = new(1134, 926);

        public Night2(Main main) : base(main) { }

        protected override int Night => 2;
        protected override string Title => "The Stitched Rabbit";
        protected override string Word => "Caring";
        protected override string Page =>
            "In the city where I worked eleven years, caring was a weakness: something that slowed you down and wasted precious time. Whatever broke went in the bin and was replaced within minutes.\n\n" +
            "But today, watching Pip hold that patchwork rabbit and smile in peace, I understood Mother's greatest legacy. Caring earns no applause and no big wage. It is being willing to sit quietly with someone who is afraid in the middle of a storm, and to stitch up the wounds no one can see with a thread of love.\n\n" +
            "Did I go all the way to the city only to run from the duty of caring for my own family's memories?";
        protected override string MorningLine => "Morning. Tea first. Then why this rabbit matters so much to Pip, without worrying his mother.";

        /// <summary>The rabbit as the day leaves it: torn, then mended.</summary>
        protected override string Keepsake => Game.Bag.Contains("rabbit_mended") ? "rabbit_mended" : "rabbit";

        protected override async Awaitable AtShop()
        {
            var fetching = FetchBox(1);
            await Say("marlow", "You came on time tonight.");
            await fetching;
            await HandOver();
            await Say("courier", "A name on the lid this time. PIP.", "surprised");
            await Say("marlow", "Open it.");
        }

        // What Marlow says of the torn rabbit.
        protected override async Awaitable Opened()
        {
            await Say("courier", "Pip? The little one who runs letters round the square? Mr Marlow, what business has a grown courier delivering a ragged cloth doll?", "puzzled");
            await Say("marlow", "This one isn't about time that stopped, like Helen's watch, Satria. It's about a fear that was never healed, because no one was left to tend it.");
            await Say("courier", "What fear? Pip's just an ordinary boy.");
            await Say("marlow", "A child's wound doesn't go because his body grows. Left alone, the fear hardens into anger and bitterness by the time he's grown. Deliver it before the next dusk dries up what courage he has left.");
        }

        protected override async Awaitable ResumeDay(string checkpoint)
        {
            switch (checkpoint)
            {
                case "midday":
                    await Go("square", "from_east");
                    Hint("Grandma Nora has Mother's red thread; the Gardener has the chamomile. Both are east.");
                    break;
                case "dusk":
                    await Go("satria_home", "door");
                    Hint("Pip is on Grandma Nora's steps.");
                    break;
                default:
                    await Start();
                    break;
            }
        }

        protected override async Awaitable Arrived(string place)
        {
            switch (place)
            {
                // on the way to the shop: since last night one lantern burns at the platform's end
                case "station" when Game.Phase == Phase.Night && !Game.Has("boxed") && !Game.Has("saw_lantern"):
                    Game.Mark("saw_lantern");
                    await Scene(async () =>
                    {
                        await Look(new Vector2(470, 262));
                        await ShowText("At the platform's end, by Helen's bench, one lantern is burning.");
                        await Say("courier", "Aunt Helen's kept it lit.", "smile");
                        await Look(null);
                    });
                    break;
                // out of the shop with the torn rabbit: what a courier carries, and nobody must see
                case "grove" when Game.Has("boxed") && !Game.Has("doubted"):
                    Game.Mark("doubted");
                    await Scene(async () =>
                    {
                        Actor("courier").FaceTo(0);
                        await Wait(0.6f);
                        await Say("courier", "Eleven years a city courier, and what I carried was deeds, machine parts, contracts stamped for millions. Fast, efficient, no feelings. Tonight it's a torn cloth doll that belongs to a village child.");
                        await Say("courier", "Am I losing my mind? And why does everything from that shop lead back to Mother?");
                        await Say("courier", "If Valdo saw me hugging a ragged doll in the dead of night, he'd say grief had cracked me. Nobody can know. Tomorrow I'll find out why it matters to Pip, without worrying his mother.");
                    });
                    break;
                // the morning's gossip on the benches
                case "square" when Game.Phase == Phase.Morning && !Game.Has("rumour"):
                    Game.Mark("rumour");
                    await Say("shopper", "Poor little Pip, screaming for his mother half the night... Every time the sky goes dark he's scared stiff the whirlwind's come back, the one ten years ago.");
                    await Say("florist", "When Ratih was alive, that boy always slept sound, hugging the rabbit doll she made him...");
                    Hint("Someone in the square might know about Pip and his rabbit.");
                    break;
            }
        }

        protected override async Awaitable Day(string id)
        {
            switch (id)
            {
                case "valdo" when Game.Phase == Phase.Morning && !Game.Has("asked_valdo"):
                    Game.Mark("asked_valdo");
                    await Say("courier", "Mr Valdo, a moment. Do you know of a child's doll that matters to someone in this village?");
                    await Say("valdo", "Mr Satria, are you quite well? Yesterday a rusty watch, today children's dolls?! The sugar-mill investors come from the city the day after tomorrow to check your boundaries!", "cross");
                    await Say("valdo", "If they see you wandering the village with rag scraps, they'll think you've cracked. Focus on the deed, Mr Satria. Don't make a fool of yourself.", "cross");
                    break;
                case "gigi" or "kiko" or "lulu" when Game.Phase == Phase.Morning && !Game.Has("asked_kids"):
                    await Kids();
                    break;
                case "mia" when Game.Phase == Phase.Morning && !Game.Has("asked_mia"):
                    await Mia();
                    break;
                case "nora" when Game.Phase == Phase.Midday && Game.Has("asked_mia") && !Game.Has("given_thread"):
                    await Nora();
                    break;
                case "gardener" when Game.Phase == Phase.Midday && Game.Has("asked_mia") && !Game.Bag.Contains("chamomile"):
                    await Gardener();
                    break;
                case "sewing" when Game.Bag.Contains("rabbit"):
                    var missing = !Game.Bag.Contains("red_thread") ? "Her spool's empty. Mia said Grandma Nora keeps Mother's red thread."
                        : !Game.Bag.Contains("chamomile") ? "The cloth still smells of mud. The chamomile first, from the Gardener's field."
                        : null;
                    if (missing != null) await Say("courier", missing);
                    else await Sew();
                    break;
                case "pip" when Game.Bag.Contains("rabbit"):
                    await Say("courier", "Not like this. Mia said it: give it to him broken and he'll only be more frightened. Mend it first.");
                    break;
                case "pip" when Game.Phase == Phase.Dusk && Game.Bag.Contains("rabbit_mended"):
                    await Pip();
                    break;
                default:
                    await base.Day(id);
                    break;
            }
        }

        // The marble trio at their ring on the lawn: Pip ran to Grandma Nora's in the thunder.
        async Awaitable Kids()
        {
            Game.Mark("asked_kids");
            await Scene(async () =>
            {
                Known("gigi", "Gigi");
                Known("kiko", "Kiko");
                Known("lulu", "Lulu");
                var courier = Actor("courier");
                await Walk("courier", ByRing);
                courier.FaceTo(Ring.x);
                courier.Pose = "crouch";
                Sfx("clink");
                await Wait(0.6f);
                await Say("courier", "Hello, you lot. Does anyone know a long-eared rabbit doll, with polka dots?");
                await Say("kiko", "Ha! That's a crybaby's toy! Pip was bawling last night when the lightning hit the old substation!", "smile");
                await Say("gigi", "He ran all the way to Grandma Nora's stilt house!");
                await Say("lulu", "Pip says the storm ghost ate his guardian rabbit.", "surprised");
                courier.Pose = "idle";
                Note("The children: Pip ran to Grandma Nora's stilt house in the thunder.");
            });
        }

        // Mia at her stall, tying spinach: why the rabbit matters, and how to mend it.
        async Awaitable Mia()
        {
            Game.Mark("asked_mia");
            await Scene(async () =>
            {
                await Say("courier", "Mia, the children say Pip was frightened of the thunder again last night?");
                await Say("mia", "Yes, Satria... Ever since the big storm ten years ago, when the whirlwind took our roof clean off, Pip goes to pieces whenever it thunders.", "sad");
                await Say("mia", "It was your mother, Ratih, who made him that patchwork rabbit, so he could sleep. But it got torn and swept away in the mud flood two years ago.", "sad");
                await Say("courier", "This one?");
                var courier = Actor("courier");
                courier.Held = Keepsakes.Art("rabbit", "xs");
                courier.Pose = "give";
                await Wait(0.8f);
                courier.Held = null;
                courier.Pose = "idle";
                await Say("mia", "Mochi...! Where did you... no. Don't tell me. But if you want to help, don't give him back like that! Pip would only get worse.", "surprised");
                await Say("mia", "The chamomile in the Gardener's field takes a musty smell out. And Grandma Nora has a red embroidery thread of your mother's.");
                Note("Mia: chamomile from the Gardener's field for the smell, and Mother's red thread from Grandma Nora. Don't give Mochi back broken.", keep: true);
            });
            await MovePhase(Phase.Midday);
            Checkpoint("midday");
            Hint("East: Grandma Nora at her loom, and the Gardener's chamomile field.");
        }

        // On her deck Nora gives Ratih's red thread from her sewing box, and a teak button for the eye.
        async Awaitable Nora()
        {
            Game.Mark("given_thread");
            await Scene(async () =>
            {
                var nora = Actor("nora");
                await Say("courier", "Grandma Nora, Mia says you keep a red thread of Mother's.");
                nora.Pose = "idle";
                nora.FaceTo(Actor("courier").Feet.x);
                await Say("nora", "Ratih's red thread... Ten years I've kept it in my sewing box, child, waiting for hands that would use it right.", "moved");
                await Give("nora", "red_thread");
                await Say("nora", "And take this. Teak, off the old ferry's rail. A rabbit oughtn't to look at the world with one eye.", "smile");
                await Give("nora", "button");
                await Say("nora", "Pip's on my steps. He won't come in, and he won't go home. Go gently.");
                nora.Pose = "weave";
                Note("Grandma Nora gave Mother's red thread and a teak button for Mochi's eye.");
            });
            Hint(Game.Bag.Contains("chamomile") ? "Home, to Mother's sewing machine." : "The Gardener's chamomile field is just up the path.");
        }

        // At his field's gate the Gardener lends his shears for the four full blooms in among the brambles.
        async Awaitable Gardener()
        {
            await Scene(async () =>
            {
                await Say("courier", "Gardener, I need four chamomile blooms. Full ones.");
                await Say("gardener", "For Ratih's rabbit, is it? Word goes round this village faster than water. The full blooms grow deep, in among the brambles. Here, my little shears.", "smile");
            });
            await Play(new ChamomileHarvest());
            await Scene(async () =>
            {
                await Receive("chamomile");
                await Say("gardener", "Steep them and mist the cloth with the water. Ratih always smelled of chamomile, you know. Pip will know it.", "smile");
                Note("The Gardener's chamomile: steep it, and mist the cloth.");
            });
            Hint(Game.Bag.Contains("red_thread") ? "Home, to Mother's sewing machine." : "Grandma Nora's loom is on her deck, by the bridge.");
        }

        // At home, at Mother's treadle machine: the ear sewn on in red thread, the button for the eye, the chamomile mist.
        async Awaitable Sew()
        {
            await Scene(async () =>
            {
                var courier = Actor("courier");
                await Walk("courier", Main.Place.Find("sewing").GlobalSpot);
                courier.FaceTo(Main.Place.Find("sewing").Position.x);
                await Say("courier", "Mother's machine. Her red thread back on its pin, where it belongs.");
            });
            await Play(new TreadleStitch());
            await Scene(async () =>
            {
                var courier = Actor("courier");
                foreach (var used in new[] { "red_thread", "button", "chamomile" }) Game.Bag.Remove(used);
                Sfx("spray");
                await Wait(0.9f);
                Swap("rabbit", "rabbit_mended");
                courier.Held = Keepsakes.Art("rabbit_mended", "xs");
                courier.Pose = "inspect";
                await ShowText("The ear holds fast in red cross-stitch, the button eye sits firm, and the chamomile leaves the cloth smelling warm and calm.");
                Sfx("lullaby");
                await Wait(1f);
                await Say("courier", "Mother used to hum while she sewed... I'd forgotten the tune till now.", "moved");
                courier.Held = null;
                courier.Pose = "idle";
            });
            await MovePhase(Phase.Dusk);
            Checkpoint("dusk");
            Hint("Pip is on Grandma Nora's steps.");
        }

        // Dusk on Nora's steps: Mochi home in Pip's arms, and Nora remembers Ratih in the storm's emergency tent.
        async Awaitable Pip() => await Handover("pip", async () =>
        {
            var pip = Actor("pip");
            var courier = Actor("courier");
            Sfx("lullaby");
            await Say("pip", "That smell... Mrs Ratih's chamomile tea...? Mochi?! Is it really Mochi?!", "surprised");
            pip.Pose = "moved";
            await Say("pip", "His ear's better... his eye's back... Mochi didn't get eaten by the storm!", "moved");
            courier.Pose = "idle";
            await Say("nora", "Lord above... Your mother sat up three nights without sleep in the emergency post, the storm ten years ago, Satria. Not hauling beams or digging ditches.", "moved");
            await Say("nora", "She sat cross-legged in a corner of the tent, tore up her best cotton dresses, and sewed dolls like this one, one by one, for every child crying alone.", "moved");
            await Memory(async () =>
            {
                Known("young_pip", "Pip");
                Known("mother", "Ratih");
                var little = Bring("young_pip", Steps);
                little.Seat = 8;
                little.Pose = "sit";
                little.FaceTo(0);
                var ratih = Bring("mother", RatihFrom);
                await Look(Steps + new Vector2(14, 4));
                Sfx("rain");
                await Wait(1f);
                await Walk("mother", ByPip);
                ratih.FaceTo(little.Feet.x);
                little.FaceTo(ratih.Feet.x);
                ratih.Held = Keepsakes.Art("rabbit_mended", "xs");
                ratih.Pose = "give";
                await Say("mother", "There now. This rabbit keeps watch all night, so you can sleep. His name is Mochi.", "smile");
                ratih.Held = null;
                ratih.Pose = "idle";
                little.Held = Keepsakes.Art("rabbit_mended", "xs");
                little.Pose = "receive";
                await Wait(0.8f);
                little.Pose = "moved";
                Sfx("rain");
                await Wait(1.2f);
            });
            await Look(Steps);
            await Say("nora", "She told me: 'Nora, a fallen house we can raise again with the carpenters. But a child's heart broken by fear has to be tended tonight, before the hurt sets hard.'", "moved");
            await Say("courier", "Mother didn't leave a stone monument or a gold plaque in this village, did she, Grandma... Only scraps of cloth, red thread, and the care she gave people who couldn't care for themselves.", "moved");
            await Say("nora", "And that will last longer than any river stone on this earth, Satria.", "moved");
        }, async () =>
        {
            var courier = Actor("courier");
            var pip = Actor("pip");
            await Look(Steps);
            await Walk("courier", ByPip);
            courier.FaceTo(pip.Feet.x);
            courier.Pose = "crouch";
            await ShowText("Satria crouches down, so his eyes are level with Pip's.");
            pip.FaceTo(courier.Feet.x);
            await Say("courier", "Pip... someone's come back to find you, from a long way off.");
        });

        // Someone gives the courier a thing they hold, and it goes into the bag.
        async Awaitable Give(string id, string item)
        {
            var owner = Actor(id);
            owner.FaceTo(Actor("courier").Feet.x);
            owner.Held = Keepsakes.Art(item, "xs");
            owner.Pose = "give";
            await Wait(0.6f);
            owner.Held = null;
            owner.Pose = "idle";
            await Receive(item);
        }
    }
}
