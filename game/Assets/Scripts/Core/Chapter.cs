using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// One chapter's story, written as plain code. A chapter overrides <see cref="Start"/>, <see cref="Entered"/>,
    /// <see cref="Interact"/>, <see cref="Stepped"/> and <see cref="Closed"/>, and uses the helpers below. Every helper that shows something must be awaited.
    /// Scenes are alive: anyone the story speaks through or moves leaves their activity for the scene and goes back to
    /// it after (<see cref="Wrap"/>), and a step started without awaiting it plays on through the lines that follow,
    /// so people walk and act while they talk:
    /// <code>var fetching = FetchKeepsake("watch", 0); await Say("marlow", "..."); await fetching;</code>
    /// </summary>
    public abstract class Chapter
    {
        protected readonly Main Main;
        /// <summary>Speaker names for the talk box. The courier's lines show only the portrait.</summary>
        readonly Dictionary<string, string> names = new();
        /// <summary>The villagers taken into the scene, back to their activity once it ends.</summary>
        readonly HashSet<Villager> cued = new();
        /// <summary>The people a memory brought in, gone when it ends.</summary>
        readonly List<string> brought = new();
        // how often each villager's lines have been heard this chapter, so the next talk says the next one
        readonly Dictionary<string[], int> chats = new();

        protected Chapter(Main main) => Main = main;

        /// <summary>An already finished step, for a chapter with nothing to do there.</summary>
        protected static Awaitable Done()
        {
            var done = new AwaitableCompletionSource();
            done.SetResult();
            return done.Awaitable;
        }

        /// <summary>The time of day the chapter begins at: a night begins at the midnight bell.</summary>
        public virtual Phase StartPhase => Phase.Night;
        /// <summary>The keepsake on the chapter card's stamp; with none, Marlow's lantern is on it.</summary>
        public virtual string Stamp => null;

        /// <summary>Runs once when the chapter begins.</summary>
        public virtual Awaitable Start() => Done();

        /// <summary>Picks the chapter up at a checkpoint it saved (<see cref="Checkpoint"/>) when the player continues; by default it starts over.</summary>
        public virtual Awaitable Resume(string checkpoint) => Start();

        /// <summary>Saves the game here, for Continue to pick up at (<see cref="Resume"/>).</summary>
        protected static void Checkpoint(string id) => Game.Save(id);

        /// <summary>Runs every time the courier arrives in a place, before they can move.</summary>
        public virtual Awaitable Entered(string place) => Done();

        /// <summary>Runs when the courier uses a hotspot or talks to someone; <paramref name="id"/> is the hotspot's id.</summary>
        public virtual Awaitable Interact(string id) => Done();

        /// <summary>Runs when the courier steps onto an unseen spot (<see cref="Hotspot.Step"/>) for the first time in the chapter.</summary>
        public virtual Awaitable Stepped(string id) => Done();

        /// <summary>
        /// Why a way out is shut for now, which the courier says before stepping back from it; null while it is open.
        /// <paramref name="id"/> is the exit's hotspot id. Marlow's door opens only at midnight, until the night's
        /// keepsake is home.
        /// </summary>
        public virtual string Closed(string id) =>
            id == "shop_door" && (Game.Phase != Phase.Night || Game.Has("handed_over")) ? "CLOSED, says the card on the door. It has hung there as long as anyone can remember." : null;

        /// <summary>Learns someone's name: the talk box and their hotspot use it from now on.</summary>
        protected void Known(string id, string displayName)
        {
            names[id] = displayName;
            Relabel();
        }

        /// <summary>Satria knows everyone in Bellwood: he grew up with them (and Valdo met his bus).</summary>
        protected void KnowVillage()
        {
            foreach (var (id, name) in new[] { ("helen", "Helen"), ("baker", "Baker"), ("leo", "Leo"), ("theo", "Theo"), ("nora", "Grandma Nora"), ("gardener", "Gardener"), ("mia", "Mia"), ("pip", "Pip"), ("sam", "Sam"),
                         ("shopper", "Shopper"), ("florist", "Flower seller"), ("farmhand", "Farmhand"), ("herder", "Aphid herder"), ("valdo", "Valdo"), ("arlo", "Arlo"), ("mender", "Mender"), ("bram", "Captain Bram") })
                Known(id, name);
        }

        /// <summary>Gives the people in the current place the names learned so far (Main calls it on arrival).</summary>
        public void Relabel()
        {
            foreach (var (id, displayName) in names)
                if (Main.Place && Main.Place.Find(id) is { Owner: not null } h)
                    h.Label = displayName;
        }

        /// <summary>Someone's line. The courier turns to whoever speaks, unless walking.</summary>
        protected Awaitable Say(string who, string text, string mood = "neutral")
        {
            var speaker = Actor(who);
            if (speaker && who != "courier" && Actor("courier") is { Walking: false } courier) courier.FaceTo(speaker.Feet.x);
            return Main.Talk.Say(names.GetValueOrDefault(who, ""), who, text, mood, speaker);
        }

        /// <summary>Someone's own line when the chapter has nothing for them, under the name on their hotspot, or what the courier sees in a thing.</summary>
        protected Awaitable Chat(string id)
        {
            if (Main.Place.Find(id)?.Text is { } seen) return ShowText(seen);
            var lines = Main.Place.Who(id)?.Lines;
            if (lines == null) return Debug.isDebugBuild ? ShowText($"Nothing written here yet ({id}).") : Done(); // a player never meets a placeholder
            var n = chats.GetValueOrDefault(lines);
            chats[lines] = n + 1;
            return Main.Talk.Say(Main.Place.Find(id).Label, id, lines[n % lines.Length], "neutral", Actor(id));
        }

        /// <summary>Words with no speaker: what the courier sees or reads.</summary>
        protected Awaitable ShowText(string text) => Main.Talk.Say("", "", text);

        protected Awaitable<int> Choose(params string[] options) => Main.Talk.Choose(options);

        protected static void Note(string text, bool keep = false) => Game.Note(text, keep);

        protected static void Sfx(string name) => Sound.Play(name);

        /// <summary>Changes the music: dusk, shop, memory or resolved.</summary>
        protected void Music(string mood) => Sound.Mood(mood, Main.Place.Def.Indoors);

        protected void Hint(string text) => Main.Hud.Toast(text);

        /// <summary>Someone in the current place, taken into the scene: a villager leaves their activity until it ends.</summary>
        protected Ant Actor(string id)
        {
            var ant = Main.Place ? Main.Place.Actor(id) : null;
            if (ant && ant.TryGetComponent<Villager>(out var villager) && cued.Add(villager)) villager.Cue();
            return ant;
        }

        /// <summary>The scene is over: everyone taken into it goes back to their activity (Main calls it).</summary>
        public void Wrap()
        {
            foreach (var villager in cued)
                if (villager) villager.Done();
            cued.Clear();
        }

        protected Vector2 Anchor(string name) => Main.Place.World.Anchor(name);

        /// <summary>Walks someone to a point along the place's walkable ground.</summary>
        protected async Awaitable Walk(string id, Vector2 to)
        {
            var who = Actor(id);
            await who.Walk(Main.Place.Walk.Path(who.Feet, to));
        }

        /// <summary>Glides the camera to show a point (such as an anchor), or back to the courier with null.</summary>
        protected Awaitable Look(Vector2? at) => Main.LookAt(at);

        protected Awaitable Go(string place, string spawn, Vector2? at = null) => Main.Go(place, spawn, at);

        protected Awaitable Wait(float seconds) => Main.Wait(seconds);

        /// <summary>The story moves the time of day on (<see cref="Main.MovePhase"/>); watched, the light turns round everyone as they are.</summary>
        protected Awaitable MovePhase(Phase to, bool watched = false) => Main.MovePhase(to, watched);

        protected Awaitable Card(params string[] lines) => Main.ShowCard(lines);

        /// <summary>Into a cinematic scene (bars over the top and bottom, the camera closer) or back out of it.</summary>
        protected Awaitable Cinema(bool on) => Main.Cinema(on);

        /// <summary>An important moment played as a cutscene: into the cinematic view, the scene, and back out, even if the scene fails.</summary>
        protected async Awaitable Scene(System.Func<Awaitable> scene)
        {
            await Cinema(true);
            try { await scene(); }
            finally { await Cinema(false); }
        }

        /// <summary>A minigame played over the world till it is won: after a fail its mentor (or Satria) says that fail's line, and R starts it over.</summary>
        protected async Awaitable Play(Minigame game)
        {
            Main.Talk.Close();
            Main.Board.Show(game);
            try
            {
                for (var outcome = await Main.Board.Round(); outcome != Minigame.Outcome.Won; outcome = await Main.Board.Round())
                {
                    var (who, line) = outcome == Minigame.Outcome.FailA ? game.FailA : game.FailB;
                    await Say(who, line, who == "courier" ? "neutral" : "smile");
                    Main.Talk.Close();
                    await Main.Board.Retry();
                }
            }
            finally
            {
                Main.Board.Close();
            }
        }

        /// <summary>
        /// A memory of 1952 played where it happened: through the cream curtain the light turns sepia, the memory's
        /// music plays and everyone of the present is gone; the scene plays with the people it brings
        /// (<see cref="Bring"/>), and through the curtain again all is as it was.
        /// </summary>
        protected async Awaitable Memory(System.Func<Awaitable> scene)
        {
            var place = Main.Place;
            var present = new List<Ant>(place.People) { place.Player };
            present.RemoveAll(ant => !ant.gameObject.activeSelf);
            Main.Talk.Close();
            await Main.Fade(true);
            foreach (var ant in present) ant.gameObject.SetActive(false);
            Main.Sepia = true;
            Music("memory");
            await Main.Fade(false);
            try
            {
                await scene();
            }
            finally
            {
                Main.Talk.Close();
                await Main.Fade(true);
                foreach (var id in brought) place.Leave(id);
                brought.Clear();
                foreach (var ant in present)
                    if (ant) ant.gameObject.SetActive(true);
                Main.Sepia = false;
                Music(place.Def.Music);
                await Main.Fade(false);
            }
        }

        /// <summary>Someone in a memory, standing at a point till it ends.</summary>
        protected Ant Bring(string id, Vector2 at)
        {
            brought.Add(id);
            return Main.Place.Bring(id, at);
        }

        /// <summary>Marlow fetches the night's box from the cabinet: he goes to it and takes it out of its cubby.</summary>
        protected async Awaitable FetchBox(int box)
        {
            var marlow = Actor("marlow");
            await Walk("marlow", Anchor($"box_{box}"));
            marlow.FaceAway();
            if (Actor("courier") is { Walking: false } courier) courier.FaceTo(marlow.Feet.x);
            await Wait(0.6f);
            Main.Place.World.ShowItemIfAny($"keepsake_{box}", false);
            Game.Mark("keepsake_taken");
            marlow.Held = Keepsakes.Art($"box_{box}", "xs", "closed");
            await Wait(0.3f);
        }

        /// <summary>Marlow brings the box he fetched back to the counter and hands it to the courier, who holds it.</summary>
        protected async Awaitable HandOver()
        {
            var marlow = Actor("marlow");
            var courier = Actor("courier");
            await Walk("marlow", Anchor("marlow"));
            marlow.FaceTo(courier.Feet.x);
            courier.FaceTo(marlow.Feet.x);
            var art = marlow.Held;
            marlow.Pose = "give";
            await Wait(0.7f);
            marlow.Held = null;
            marlow.Pose = "idle";
            courier.Held = art;
            courier.Pose = "receive";
            await Wait(0.7f);
            courier.Pose = "idle";
        }

        /// <summary>The courier opens the box up close (<see cref="Shop.Reveal"/>) and the keepsake goes into the bag.</summary>
        protected async Awaitable OpenBox(int box, string keepsake)
        {
            var courier = Actor("courier");
            courier.Pose = "inspect";
            await Wait(0.4f);
            Main.Talk.Close();
            await Main.Reveal.Show(box, keepsake);
            courier.Held = null;
            courier.Pose = "idle";
            Game.Bag.Add(keepsake);
        }

        /// <summary>The courier takes something given him, and it goes into the bag.</summary>
        protected async Awaitable Receive(string item)
        {
            var courier = Actor("courier");
            courier.Held = Keepsakes.Art(item, "xs");
            courier.Pose = "receive";
            Sfx("pop");
            await Wait(0.7f);
            courier.Held = null;
            courier.Pose = "idle";
            Game.Bag.Add(item);
        }

        /// <summary>Someone gives the courier a thing they hold, and it goes into the bag.</summary>
        protected async Awaitable Give(string id, string item)
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

        /// <summary>A keepsake changes in the bag where it lies, as the day mends it.</summary>
        protected static void Swap(string from, string to)
        {
            var at = Game.Bag.IndexOf(from);
            if (at >= 0) Game.Bag[at] = to;
        }

        /// <summary>The courier gives a keepsake to its owner, who takes it and keeps holding it.</summary>
        protected async Awaitable GiveKeepsake(string id, string keepsake)
        {
            var owner = Actor(id);
            var courier = Actor("courier");
            var art = Keepsakes.Art(keepsake, "xs");
            owner.FaceTo(courier.Feet.x);
            courier.FaceTo(owner.Feet.x);
            courier.Held = art;
            courier.Pose = "give";
            await Wait(0.7f);
            courier.Held = null;
            courier.Pose = "idle";
            owner.Held = art;
            owner.Pose = "receive";
            Game.Bag.Remove(keepsake);
            Game.Mark("handed_over");
            Sfx("right");
        }

        /// <summary>The keepsake is home: the view cuts to Marlow's shop, where the clock moves on a minute, a lantern goes out, and its box is back in the cabinet, open and empty; then back to where the courier stood.</summary>
        protected async Awaitable LanternGoesOut()
        {
            var (place, feet) = (Main.Place.Def.Id, Actor("courier").Feet);
            await Go("shop", "counter");
            Music("resolved");
            await Look(Anchor("clock"));
            var world = Main.Place.World;
            var lit = Game.LanternsOut;
            await Wait(0.8f);
            world.ShowItemIfAny($"clock_{1017 + lit}", false);
            world.ShowItemIfAny($"clock_{1018 + lit}", true);
            Sfx("tick");
            await Wait(0.6f);
            world.ShowItemIfAny($"lantern_{lit}", false);
            world.ShowItemIfAny($"box_open_{lit}", true);
            Sfx("chime");
            Game.LanternsOut = lit + 1;
            await Wait(0.8f);
            await Go(place, "", feet);
        }
    }
}
