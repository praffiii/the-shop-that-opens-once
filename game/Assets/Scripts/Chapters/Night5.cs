using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Night 5, The Mismatched Running Shoes (the word: Moving). Marlow's fifth box, carved LEO, holds Leo's old canvas
    /// running shoes, their soles two sizes, the rubber gone hard as river stone: twenty years ago he drove his legs
    /// through the storm to tell the station the night train was still waiting for Satria's family, ran his soles
    /// through on the coral, and has never sprinted since, sure he came too late. On the square next morning the market
    /// says Leo limped up his hill with his knees shaking; Valdo, measuring the road, sees rubbish; the Baker's lad says
    /// the rubber would snap Leo's foot, and the Mender could resole them with new damar. At midday they are resoled at
    /// the forge (minigame 5A); at dusk Satria races the sun up Leo's hill in them (minigame 5B), and at the top, with
    /// the last light, the shoes go back to Leo.
    /// </summary>
    public sealed class Night5 : NightChapter
    {
        /// <summary>Up on Leo's hill in front of the hut, where Satria comes to the top of the sprint.</summary>
        static readonly Vector2 HillTop = new(840, 246);

        public Night5(Main main) : base(main) { }

        protected override int Night => 5;
        protected override string Title => "The Mismatched Running Shoes";
        protected override string Word => "Moving";
        protected override string Page =>
            "In the city, moving fast is what they pay you for. Faster deliveries, faster replies, faster everything.\n\n" +
            "But speed without the right direction inside you is only running away. I know. I ran for eleven years.\n\n" +
            "Moving on isn't about how fast we leave the past behind. It's about being willing to carry it with us, in every step. Leo has stopped running from his past. Now he can walk on, in peace.";
        protected override string WakeLine => "...Five strokes. Under a full moon.";
        protected override string MorningLine => "Morning. Tea first. Then the square, and someone who knows these shoes.";
        protected override string DayErrand => "The square, and someone who knows these shoes.";
        protected override string Breakfast => "A seed loaf from the Baker, and with it a note from Sam, folded in three: \"Breakfast. Eaten properly. Sitting down. S.\" He sits down.";

        /// <summary>The shoes as the day leaves them: stiff and mossy, then resoled and shining.</summary>
        protected override string Keepsake => Game.Bag.Contains("shoes_mended") ? "shoes_mended" : "shoes";

        protected override string Asking => "Do you know whose shoes these are?";

        // Asked round about the shoes: only one ant ever ran in shoes like these, and the Baker's lad knows every runner.
        static readonly Dictionary<string, Reaction> Asked = new()
        {
            ["mia"] = new("Spiked shoes, two sizes... Only one ant on this island ever ran in shoes like those, Satria.", "surprised", "Mia: only one ant on the island ever ran in shoes like these."),
            ["pip"] = new("Running shoes! Mr Leo says he used to be the fastest ant alive. I don't believe him. His knees go click.", "smile", "Pip: Leo says he was once the fastest ant alive."),
            ["sam"] = new("There's a photograph in the hall: the island races, nineteen fifty-two. The winner's in shoes just like those.", "neutral", "Sam: the winner of the 1952 island races wore shoes like these."),
            ["baker"] = new("My lad knows every runner on the island, past and present. Catch him on his rounds.", "smile", "The Baker: his lad knows every runner on the island."),
            ["shopper"] = new("Hard as stone, that rubber. Whoever ran in those now would snap an ankle."),
            ["helen"] = new("Someone ran the whole coast road to the station, the night of the storm. I never knew who.", "sad"),
            ["mender"] = new("Canvas and spikes, rubber gone to stone. New damar would make them whole. Bring them to the forge if you want them mended.", "neutral", "The Mender: new damar would make the shoes whole again."),
            ["bram"] = new("Those spikes chewed up my platform once. A lad ran in from the storm, shouting for the night train.", "moved"),
            ["porter"] = new("Proper racing spikes. You'd not catch me running in those. Or at all."),
            ["nora"] = new("Leo's feet bled on the coral that night, child. He's not run since.", "sad", "Grandma Nora: Leo's feet bled on the coral one night, and he has not run since."),
            ["theo"] = new("I photographed a race once. The winner's shoes didn't match. He said it brought him luck.", "moved"),
            ["arlo"] = new("Coral cut those soles. You can tell by the edges. Somebody ran the reef road."),
            ["fisher"] = new("Somebody's legs did a lot of miles in those."),
            ["salter"] = new("Rubber like that goes hard in the salt air, given twenty years."),
            ["gardener"] = new("Those are a runner's. Leo's up on his hill every evening, if you're asking whose.", "neutral", "The Gardener: Leo is up on his hill every evening."),
            ["farmhand"] = new("Spikes like that would ruin my rows. Keep off the field in them, mind.", "smile"),
            ["herder"] = new("You'd scare every aphid in the pen, clattering about in those."),
        };
        protected override Dictionary<string, Reaction> Reactions => Asked;

        protected override async Awaitable AtShop()
        {
            var fetching = FetchBox(4);
            await Say("marlow", "Five strokes. The moon's full, so you'll not need the lantern much.");
            await fetching;
            await HandOver();
            await Say("courier", "LEO, on the lid.", "surprised");
            await Say("marlow", "Open it.");
        }

        // What Marlow says of Leo's shoes.
        protected override async Awaitable Opened()
        {
            await Say("courier", "Running shoes? The soles are two different sizes... Who could run in shoes like these?", "puzzled");
            await Say("marlow", "Leo could. The fastest legs the Bellwood colony ever bore.");
            await Say("courier", "Mr Leo? He was stretching on the coffee stall's terrace, two mornings ago.", "surprised");
            await Say("marlow", "Twenty years ago he drove those legs through the storm, to tell the station the night train was still waiting for your family. He ran his soles through on the coral rock. He jogs his laps, slowly, but he has never sprinted since.", "sad");
            await Say("marlow", "He believes he came too late, and cost your parents their future. Take them to him before regret stiffens his legs for good. And Satria... some of us run because we are afraid to look back.");
        }

        protected override async Awaitable ResumeDay(string checkpoint)
        {
            switch (checkpoint)
            {
                case "midday":
                    await Go("station", "from_square");
                    Hint("The Mender's forge, by the line.");
                    break;
                case "dusk":
                    await Go("station", "forge_door");
                    Hint("Leo's hill, in the east, before the sun goes down.");
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
                // on the way to the shop, the one new sight: the rain gone, and the full moon out
                case "station" when Game.Phase == Phase.Night && !Game.Has("boxed") && !Game.Has("saw_moon"):
                    Game.Mark("saw_moon");
                    await ShowText("The rain has gone east. The air smells of wet earth, and the full moon is bright enough to walk by.");
                    break;
                // out of the shop with Leo's shoes
                case "grove" when Game.Has("boxed") && !Game.Has("doubted"):
                    Game.Mark("doubted");
                    await Scene(async () =>
                    {
                        Actor("courier").FaceTo(0);
                        await Wait(0.6f);
                        await Say("courier", "Running because you're afraid to look back... Eleven years I've run every route in the city. Never a day off. Never a holiday.");
                        await Say("courier", "Was that so I'd never have the time to miss them?", "sad");
                        await Say("courier", "Not a word about these to anyone, not the market and not Valdo. In the morning I find Mr Leo, and learn what happened the last day he ran.");
                    });
                    break;
                // the morning market's gossip, overheard
                case "square" when Game.Phase == Phase.Morning && !Game.Has("rumour"):
                    Game.Mark("rumour");
                    await Say("florist", "Mr Leo was limping up his hill again this morning... his knees were shaking something awful!");
                    await Say("shopper", "And when he was young, no ant on this island could touch him in a sprint...");
                    Note("On the square: Leo limped up his hill this morning, his knees shaking. Once nobody could match his sprint.");
                    Hint("Somebody on the square might know these shoes. Show them round.");
                    break;
                // the race against the sun up Leo's hill, and the shoes back to him at the top with the last light
                case "east" when Game.Phase == Phase.Dusk && Game.Bag.Contains("shoes_mended") && !Game.Has("resolved"):
                    await Sprint();
                    break;
            }
        }

        protected override async Awaitable Day(string id)
        {
            switch (id)
            {
                case "valdo" when Game.Phase == Phase.Morning && !Game.Has("asked_valdo"):
                    await Valdo();
                    break;
                case "breadboy" when Game.Phase == Phase.Morning && !Game.Has("lad_lead"):
                    await Lad();
                    break;
                case "mender" or "shoe_press" when Game.Phase == Phase.Midday && Game.Bag.Contains("shoes"):
                    await Resole();
                    break;
                case "leo" when Game.Bag.Contains("shoes"):
                    await Say("courier", "Not yet. Not in shoes that would snap his foot.");
                    break;
                default:
                    await base.Day(id);
                    break;
            }
        }

        // Valdo, measuring the main road for its paving, sees only a scavenger's rags.
        async Awaitable Valdo()
        {
            Game.Mark("asked_valdo");
            await Scene(async () =>
            {
                var valdo = Actor("valdo");
                var courier = Actor("courier");
                await Say("courier", "Mr Valdo, have you ever seen spiked running shoes like these?");
                valdo.Pose = "idle";
                valdo.FaceTo(courier.Feet.x);
                courier.Held = Keepsakes.Art("shoes", "xs");
                courier.Pose = "give";
                await Say("valdo", "Ugh. Torn canvas, the sole off, rusty spikes, and that smell... Scavenger's rags, Mr Satria. Selling junk for your bus fare home now?", "cross");
                courier.Held = null;
                courier.Pose = "idle";
                await Say("valdo", "Three days left. The investors come on the morning of Day Eight. Tidy that house of yours, and stop wandering about with rubbish.");
                valdo.Pose = "write";
                Note("Valdo took Leo's shoes for a scavenger's rags. He reminded me: the investors come on the morning of Day Eight.");
            });
        }

        // The Baker's lad, back from his rounds: whose shoes these are, and who can mend them; the day moves to midday.
        async Awaitable Lad()
        {
            Game.Mark("lad_lead");
            await Scene(async () =>
            {
                var lad = Actor("breadboy");
                var courier = Actor("courier");
                await Say("courier", "Hey, friend. Do you know who these spiked running shoes belong to?");
                lad.Pose = "idle";
                lad.FaceTo(courier.Feet.x);
                courier.Held = Keepsakes.Art("shoes", "xs");
                courier.Pose = "give";
                await Say("breadboy", "Those are Mr Leo's! The legendary ones! Every evening he's up on his hill, staring at the dead line.", "surprised");
                courier.Held = null;
                courier.Pose = "idle";
                await Say("breadboy", "But don't just hand them over. That rubber's gone hard as river stone. Run in it, and it'd snap the joints of his foot!");
                await Say("breadboy", "Take them to the Mender's forge. He'll glue them with new damar resin.", "smile");
                lad.Pose = "carry";
                Note("The Baker's lad: Leo is on his hill every evening. The rubber is hard as stone; the Mender can resole the shoes with damar.", keep: true);
            });
            await MovePhase(Phase.Midday);
            Checkpoint("midday");
            Hint("The Mender's forge, by the line.");
        }

        // At the forge the Mender knows the shoes, and they are resoled in his press (minigame 5A); the day moves to dusk.
        async Awaitable Resole()
        {
            await Scene(async () =>
            {
                var mender = Actor("mender");
                var courier = Actor("courier");
                await Say("courier", "Mr Mender, could you help me restore the soles of Mr Leo's shoes?");
                mender.Pose = "idle";
                mender.FaceTo(courier.Feet.x);
                courier.Held = Keepsakes.Art("shoes", "xs");
                courier.Pose = "give";
                await Wait(0.6f);
                courier.Held = null;
                courier.Pose = "idle";
                await Say("mender", "These spikes... I've not seen these shoes in twenty years, lad.", "moved");
                await Say("mender", "I've liquid pine damar on the heater, and the press in the corner. Let's give them a sole fit for him again!", "smile");
                var stepping = Walk("mender", Main.Place.Find("resin_heater").GlobalSpot);
                await Walk("courier", Main.Place.Find("shoe_press").GlobalSpot);
                courier.FaceTo(Main.Place.Find("shoe_press").Position.x);
                await stepping;
                mender.FaceTo(courier.Feet.x);
            });
            await Play(new ResinResole());
            Swap("shoes", "shoes_mended");
            await Scene(async () =>
            {
                Sfx("wax_press");
                await ShowText("The sole bonds tight and springy. The spikes come up clean of rust, and a rub of beeswax brings the old red back to the canvas.");
                await Say("mender", "There. Fit for a champion. He'll be up on his hill at sundown. Don't keep him waiting.", "smile");
                Note("The Mender resoled Leo's shoes with new damar. They shine again.");
            });
            await MovePhase(Phase.Dusk);
            Checkpoint("dusk");
            Hint("Leo's hill, in the east, before the sun goes down.");
        }

        // At the hill's foot Leo sees him coming: up the hill against the sun (minigame 5B), and at the top, the shoes
        // go back to him as the light leaves the sea.
        async Awaitable Sprint()
        {
            await Scene(async () =>
            {
                var leo = Actor("leo");
                await Look(leo.Feet);
                await Say("leo", "Courier! What's that in your hand? Bring it up here, then. And see if you can beat the sun to the top!", "smile");
                await Look(null);
                await Say("courier", "Breathe. Drive the legs. Don't look back.");
            });
            await Play(new HillSprint());
            Game.Mark("sprinted");
            var courier = Actor("courier");
            courier.Feet = HillTop;
            courier.FaceTo(Actor("leo").Feet.x);
            await Handover("leo", async () =>
            {
                var leo = Actor("leo");
                await Say("leo", "My service shoes... the emergency runner's shoes. Twenty years.", "moved");
                await Say("leo", "I'm the one who failed, son. When I reached the station the whistle had blown, and the landslide had buried the line.", "sad");
                await Say("courier", "You never failed. In the hall's archive yesterday I read the register. My parents chose to stay, of their own will, to help their neighbours.", "moved");
                await Say("courier", "The train never left them behind... and you never let anyone down.");
                leo.Pose = "moved";
                await ShowText("Leo covers his face with his hands, and the sea wind takes the sound of it.");
                await Say("leo", "Thank you, son... for freeing an old man from the past.", "moved");
                leo.Pose = "idle";
            }, async () =>
            {
                Actor("courier").Pose = "tired";
                await Say("courier", "Mr Leo... your running shoes are ready to wear again.", "moved");
                Actor("courier").Pose = "idle";
                await Meet("leo", Actor("leo").Feet);
            });
        }
    }
}
