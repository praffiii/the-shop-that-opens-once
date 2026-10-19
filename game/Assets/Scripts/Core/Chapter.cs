using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// One chapter's story, written as plain code. A chapter overrides <see cref="Start"/>, <see cref="Entered"/> and
    /// <see cref="Interact"/>, and uses the helpers below. Every helper that shows something must be awaited.
    /// </summary>
    public abstract class Chapter
    {
        protected readonly Main Main;
        /// <summary>Speaker names for the talk box. The courier's lines show only the portrait.</summary>
        readonly Dictionary<string, string> names = new();

        protected Chapter(Main main) => Main = main;

        /// <summary>An already finished step, for a chapter with nothing to do there.</summary>
        protected static Awaitable Done()
        {
            var done = new AwaitableCompletionSource();
            done.SetResult();
            return done.Awaitable;
        }

        /// <summary>Runs once when the chapter begins.</summary>
        public virtual Awaitable Start() => Done();

        /// <summary>Runs every time the courier arrives in a place, before they can move.</summary>
        public virtual Awaitable Entered(string place) => Done();

        /// <summary>Runs when the courier uses a hotspot or talks to someone; <paramref name="id"/> is the hotspot's id.</summary>
        public virtual Awaitable Interact(string id) => Done();

        /// <summary>Learns someone's name: the talk box and their hotspot use it from now on.</summary>
        protected void Known(string id, string displayName)
        {
            names[id] = displayName;
            Relabel();
        }

        /// <summary>Gives the people in the current place the names learned so far (Main calls it on arrival).</summary>
        public void Relabel()
        {
            foreach (var (id, displayName) in names)
                if (Main.Place && Main.Place.Find(id) is { Owner: not null } h)
                    h.Label = displayName;
        }

        protected Awaitable Say(string who, string text, string mood = "neutral") =>
            Main.Talk.Say(names.GetValueOrDefault(who, ""), who, text, mood, Actor(who));

        /// <summary>Someone's own line when the chapter has nothing for them, under the name on their hotspot.</summary>
        protected Awaitable Chat(string id)
        {
            var line = Main.Place.Who(id)?.Line;
            return line == null ? ShowText($"Nothing written here yet ({id}).") : Main.Talk.Say(Main.Place.Find(id).Label, id, line, "neutral", Actor(id));
        }

        /// <summary>Words with no speaker: what the courier sees or reads.</summary>
        protected Awaitable ShowText(string text) => Main.Talk.Say("", "", text);

        protected Awaitable<int> Choose(params string[] options) => Main.Talk.Choose(options);

        protected static void Note(string text) => Game.Note(text);

        protected static void Sfx(string name) => Sound.Play(name);

        /// <summary>Changes the music: dusk, shop, memory or resolved.</summary>
        protected void Music(string mood) => Sound.Mood(mood, Main.Place.Def.Indoors);

        protected void Hint(string text) => Main.Hud.Toast(text);

        protected Ant Actor(string id) => Main.Place ? Main.Place.Actor(id) : null;

        protected Vector2 Anchor(string name) => Main.Place.World.Anchor(name);

        /// <summary>Walks someone to a point along the place's walkable ground.</summary>
        protected async Awaitable Walk(string id, Vector2 to)
        {
            var who = Actor(id);
            await who.Walk(Main.Place.Walk.Path(who.Feet, to));
        }

        /// <summary>Glides the camera to show a point (such as an anchor), or back to the courier with null.</summary>
        protected Awaitable Look(Vector2? at) => Main.LookAt(at);

        protected Awaitable Go(string place, string spawn) => Main.Go(place, spawn);

        protected Awaitable Wait(float seconds) => Main.Wait(seconds);

        protected Awaitable Card(params string[] lines) => Main.ShowCard(lines);

        /// <summary>Marlow takes a keepsake from its shelf and hands it to the courier.</summary>
        protected async Awaitable HandOver(string keepsake, int shelf)
        {
            var marlow = Actor("marlow");
            var courier = Actor("courier");
            var art = Keepsakes.Art(keepsake, "xs");
            Main.Place.World.ShowItemIfAny($"keepsake_{shelf}", false);
            Main.Place.World.ShowItemIfAny($"box_open_{shelf}", true);
            Game.Mark("keepsake_taken");
            marlow.Held = art;
            marlow.Pose = "give";
            await Wait(0.7f);
            marlow.Held = null;
            marlow.Pose = "idle";
            courier.Held = art;
            courier.Pose = "receive";
            await Wait(0.7f);
            courier.Held = null;
            courier.Pose = "idle";
            Game.Bag.Add(keepsake);
            Sfx("motif");
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
            Sfx("right");
        }

        /// <summary>The keepsake is home: in Marlow's shop the clock moves on a minute and a lantern goes out.</summary>
        protected async Awaitable LanternGoesOut()
        {
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
            Sfx("chime");
            Game.LanternsOut = lit + 1;
            await Wait(0.8f);
        }
    }
}
