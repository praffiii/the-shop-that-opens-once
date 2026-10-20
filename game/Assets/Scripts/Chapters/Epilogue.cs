using UnityEngine;

namespace Shop
{
    /// <summary>
    /// The Epilogue, The Morning After (Day 8). At half past seven the gap in the banyan's roots where Marlow's shop
    /// stood is grown shut, and Satria makes his peace with it. At nine, before the hall, with Valdo's gold pen held out
    /// and the whole village watching, he tears the contract in two (minigame 8); Valdo storms off and the square
    /// cheers. At half past ten, at his own gate, he and the Mender nail the new board to the railings, SATRIA'S POST,
    /// the Baker hands sweet bread round to the whole village, and on his porch, in his green courier's cap, the
    /// credits roll.
    /// </summary>
    public sealed class Epilogue : Chapter
    {
        /// <summary>Where Satria stands before the hall's door to face Valdo, and where the courier comes into the square for it.</summary>
        static readonly Vector2 Mark = new(662, 406), Into = new(640, 520);
        /// <summary>Who cheers, once the contract is torn and once the board is up (Bram comes to the gate only).</summary>
        static readonly string[] Crowd = { "helen", "baker", "sam", "leo", "nora", "mia", "pip", "theo", "mender", "bram" };
        /// <summary>Where the courier comes up the east road to his gate, and where he and the Mender stand to nail the board to the railings.</summary>
        static readonly Vector2 Road = new(877, 512), Railings = new(800, 484), Holding = new(830, 484);

        public Epilogue(Main main) : base(main) { }

        public override Phase StartPhase => Phase.Morning;

        // 07:30, the banyan grove: the shop is gone, the roots grown shut where it stood.
        public override async Awaitable Start()
        {
            KnowVillage();
            await Card("Epilogue: The Morning After", "Day 8, 07:30. The banyan grove.");
            await Go("grove", "from_station");
            await Scene(async () =>
            {
                var courier = Actor("courier");
                await Look(Anchor("from_shop") + new Vector2(0, -24));
                await Walk("courier", Anchor("from_shop") + new Vector2(0, 14));
                courier.FaceAway();
                Sfx("wind");
                await Wait(1f);
                await ShowText("The morning sun pours through the banyan's crown, and the dew shines on the grass. Where the gap in the giant roots held Marlow's shop, hanging roots have grown down to the ground, and wildflowers bloom along their foot.");
                await ShowText("No board, no door. As if the shop had never been.");
                await Say("courier", "It's gone... for good. No brass bell at midnight, no boxes on the black velvet.", "moved");
                await Say("courier", "Marlow kept this village till his work was done. Now it's our turn, in the daylight.");
                await Say("courier", "Eleven years I ran through the city looking for what life means. It was never how fast you can run away. It's how deep you dare to put your roots down, where you stand.", "moved");
                await Say("courier", "Mother... Father... this house will never be sold.", "smile");
            });
            await Gathering();
        }

        public override async Awaitable Resume(string checkpoint)
        {
            KnowVillage();
            switch (checkpoint)
            {
                case "square":
                    await Gathering();
                    break;
                case "home":
                    await Home();
                    break;
                default:
                    await Start();
                    break;
            }
        }

        public override string Closed(string id) => Game.Phase == Phase.Morning ? "Nine o'clock. The hall first." : "Everyone's here, at the gate.";

        public override async Awaitable Interact(string id)
        {
            switch (id)
            {
                case "mender" when !Game.Has("board_up"):
                    await Board();
                    break;
                case "baker" when Game.Has("board_up"):
                    await Bread();
                    await Porch();
                    break;
                default:
                    await Chat(id);
                    break;
            }
        }

        // 09:00, the square: the whole village before the hall, Valdo with his gold pen, and the contract torn in two.
        async Awaitable Gathering()
        {
            Checkpoint("square");
            await Card("09:00. The square, before the hall.");
            await Go("square", "", Into);
            await Scene(async () =>
            {
                var courier = Actor("courier");
                var valdo = Actor("valdo");
                await Look(new Vector2(652, 436));
                valdo.Held = Keepsakes.Art("briefcase", "xs", "");
                var walking = Walk("courier", Mark);
                await Say("valdo", "Nine o'clock sharp! A wise choice, Mr Satria. The city is waiting for you with cash to spare.", "smile");
                await walking;
                courier.FaceTo(valdo.Feet.x);
                valdo.FaceTo(courier.Feet.x);
                await Say("valdo", "Where's the draft I gave you? This pen is filled with gold ink. Sign beside the stamp.", "smile");
                courier.Held = Keepsakes.Art("contract", "xs");
                courier.Pose = "give";
                await Say("courier", "Here it is, Mr Valdo.");
                valdo.Held = null;
                valdo.Pose = "receive";
                await Say("valdo", "Splendid! Hand it over!", "smile");
                courier.Held = null;
                courier.Pose = "idle";
            });
            await Play(new ContractTear());
            Swap("contract", "contract_torn");
            await Scene(async () =>
            {
                var courier = Actor("courier");
                var valdo = Actor("valdo");
                courier.Pose = "tear";
                Sfx("tear");
                await Wait(0.8f);
                Sfx("flutter");
                courier.Pose = "idle";
                await ShowText("SRRRK! The thick paper tears in two across the silent square. The scraps go up on the sea wind of the morning.");
                valdo.Pose = "shocked";
                await Say("valdo", "SATRIA! Are you MAD?! You've torn up a contract worth hundreds of thousands in silver! You'd rather live in that ramshackle hut than in comfort in the city?!", "surprised");
                valdo.Pose = "idle";
                await Say("courier", "That house is no hut, Mr Valdo. It's where my parents taught me what it means to be sincere, to care, and to stand by each other.", "smile");
                await Say("courier", "And this village is no investment of yours. Go home to the city. There's no land for sale here. Not for greed.");
                var helen = Actor("helen");
                await Walk("helen", courier.Feet + new Vector2(-20, 0));
                helen.FaceTo(courier.Feet.x);
                helen.Pose = "hug";
                await Say("helen", "You heard him, Valdo. Pack your case, before I chase you off with my platform broom!", "cross");
                await Say("baker", "Ha! And don't forget to settle your coffee at the stall, agent!", "smile");
                valdo.Pose = "stamp";
                Sfx("stamp");
                await Say("valdo", "None of you have a future! You'll be sorry, living out your days in this backward village!", "cross");
                valdo.Pose = "idle";
                var going = Walk("valdo", new Vector2(1000, 600));
                helen.Pose = "idle";
                // the square bursts into cheers, Pip leaps to hug Satria, and Theo raises his camera
                await Wait(1.2f);
                Sfx("cheer");
                foreach (var id in Crowd) if (Actor(id) is { } ant) { ant.FaceTo(courier.Feet.x); ant.Pose = "cheer"; }
                await ShowText("The square bursts into cheers.");
                var pip = Actor("pip");
                await Walk("pip", courier.Feet + new Vector2(18, 4));
                pip.FaceTo(courier.Feet.x);
                courier.FaceTo(pip.Feet.x);
                pip.Pose = "hug";
                courier.Pose = "hug";
                await Say("pip", "You stayed! You STAYED! Mochi said you would!", "smile");
                courier.Pose = "idle";
                pip.Pose = "idle";
                helen.Pose = "hug";
                await Say("helen", "Ratih would be so proud of you, love. So proud.", "moved");
                var theo = Actor("theo");
                theo.Pose = "photo";
                Sfx("shutter");
                await Say("theo", "Hold still, all of you! Some mornings want keeping.", "smile");
                await Say("mender", "And now your gate, Satria! I carved you a board last night, teak, from the old bridge's offcuts.", "smile");
                await going;
                Main.Place.Leave("valdo");
                Note("Valdo's contract is torn up before the whole village, and he has gone back to the city.", keep: true);
            });
            await MovePhase(Phase.Midday);
            Checkpoint("home");
            await Home();
        }

        // 10:30: the whole village come up the east road with him to his gate.
        async Awaitable Home()
        {
            await Card("10:30. Satria's house.");
            await Go("east", "", Road);
            Hint("The Mender has the new board.");
        }

        // The new board, nailed to the railings by his gate: SATRIA'S POST, FOR ALL THE COLONY.
        async Awaitable Board()
        {
            await Scene(async () =>
            {
                var courier = Actor("courier");
                var mender = Actor("mender");
                await Say("mender", "Here she is. Hold her square against the railings, and mind your thumbs.", "smile");
                var stepping = Walk("mender", Holding);
                await Walk("courier", Railings);
                await stepping;
                courier.FaceAway();
                mender.FaceAway();
                courier.Pose = "hammer";
                mender.Pose = "hammer";
                for (var i = 0; i < 4; i++)
                {
                    Sfx("thump");
                    await Wait(0.45f);
                }
                Game.Mark("board_up");
                Main.Place.FollowStory();
                courier.Pose = "idle";
                mender.Pose = "idle";
                // a step back off the railings, to see the board up
                stepping = Walk("mender", Holding + new Vector2(8, 18));
                await Walk("courier", Railings + new Vector2(-6, 18));
                await stepping;
                courier.FaceCamera();
                mender.FaceTo(courier.Feet.x);
                await ShowText("The teak board goes up on the railings by the gate: SATRIA'S POST, FOR ALL THE COLONY.");
                await Say("courier", "Satria's Post... From Bellwood, for all the colony. Thank you, Mender. Truly.", "moved");
                Note("The new board is up on the railings by the gate: SATRIA'S POST, FOR ALL THE COLONY.");
            });
            Hint("The Baker has sweet bread for everyone.");
        }

        // The Baker's sweet bread, handed round to the whole village at the gate.
        async Awaitable Bread()
        {
            await Scene(async () =>
            {
                var courier = Actor("courier");
                var baker = Actor("baker");
                baker.Carrying = true;
                await Walk("baker", courier.Feet + new Vector2(26, 4));
                baker.FaceTo(courier.Feet.x);
                courier.FaceTo(baker.Feet.x);
                await Say("baker", "Sweet bread, still warm! For the new post office, and for every ant in Bellwood!", "smile");
                baker.Carrying = false;
                Sfx("cheer");
                foreach (var id in Crowd) if (Actor(id) is { } ant) { ant.FaceTo(courier.Feet.x); ant.Pose = "cheer"; }
                await ShowText("The Baker hands warm sweet bread round to everyone gathered at Satria's gate.");
                foreach (var id in Crowd) if (Actor(id) is { } ant) ant.Pose = "idle";
            });
        }

        // His own porch, in his green courier's cap, the sea wind coming up the valley: and the credits.
        async Awaitable Porch()
        {
            await Cinema(true);
            var courier = Actor("courier");
            // through his gate and up onto his porch, the village behind him at the railings
            await Look(Anchor("home") + new Vector2(0, 30));
            await Walk("courier", Anchor("home"));
            courier.FaceCamera();
            Sfx("wind");
            await ShowText("Satria stands on the porch of his house in his green courier's cap, his chest open to the sea wind, smiling, at peace. The clear sky stretches wide over Bellwood's hills.");
            await Say("courier", "I'm home.", "smile");
            Main.Talk.Close();
            Music("letter");
            await Wait(1.5f);
            await Main.ShowCredits();
            Main.Finish();
        }
    }
}
