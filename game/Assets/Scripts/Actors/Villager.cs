using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Keeps someone at their activity: they hold its pose where they stand, or walk their round from stop to stop,
    /// keeping each stop's pose for a while (at some, turned to the courier). Talked to, they stop and turn to the
    /// courier; taken into a scene, the story moves them. Either way they go back to it after, from the nearest stop.
    /// While they keep a pose they live in it: they stop work for a breath, glance about, hum, take turns talking with
    /// whoever stands by them, and turn to the courier coming past, so no two of them keep time like clockwork.
    /// </summary>
    public sealed class Villager : MonoBehaviour
    {
        /// <summary>Seconds between the small things they do while keeping a pose.</summary>
        const float BeatMin = 3f, BeatMax = 8f;
        /// <summary>How near (art px) someone stands to be company, and the courier comes to be noticed.</summary>
        const float CompanyNear = 44f, NoticeNear = 40f;
        /// <summary>Seconds before they turn to the courier again, and after the courier arrives before they first do.</summary>
        const float GreetAgain = 40f, Settling = 1.5f;
        /// <summary>Poses at work: they stop for a breath now and then.</summary>
        static readonly HashSet<string> Work = new() { "brew", "hammer", "polish", "sweep", "weave", "tend", "water", "rake", "fish", "photo", "peer", "look", "knead", "tinker" };
        static readonly HashSet<string> Young = new() { "pip", "kid", "grandkid", "leo" }, Old = new() { "nora", "bram", "helen", "marlow" };

        Person def;
        Ant ant;
        Place place;
        int at; // the stop they are at, or walking to
        float wait;
        bool walking, talking;
        string listening; // the pose they stopped in to listen
        // the pose they keep, the way they face in it (0: no side of their own), whether turned away, and to the courier
        string rest = "idle";
        int restFacing;
        bool restAway, restWatch;
        float beat, aside, greeted = -GreetAgain, since;
        Ant company;

        public static void Add(Ant ant, Person def, Place place)
        {
            var v = ant.gameObject.AddComponent<Villager>();
            (v.def, v.ant, v.place) = (def, ant, place);
            ant.Pace = Young.Contains(def.Id) ? 1.2f : Old.Contains(def.Id) ? .8f : Random.Range(.9f, 1.05f);
            if (def.Round == null)
            {
                ant.Feet = def.At;
                ant.Seat = def.Seat;
                ant.Floor = def.Floor;
                v.Hold();
                return;
            }
            ant.Feet = def.Round[0].At;
            v.Keep();
            v.wait = Random.Range(0f, v.wait); // so no two rounds keep step
        }

        /// <summary>Stops whatever they are doing and turns to the courier; someone sitting stays seated.</summary>
        public void Talk(float courierX)
        {
            talking = true;
            aside = 0;
            ant.Stop();
            ant.Pose = listening = ant.Carrying ? "carry" : ant.Pose == "sit" ? "sit" : "idle";
            ant.FaceTo(courierX);
        }

        /// <summary>Stops their activity where they are and stands by, for a scene to move them; someone sitting stays seated.</summary>
        public void Cue()
        {
            if (talking) return;
            talking = true;
            walking = false;
            aside = 0;
            ant.Stop();
            ant.Running = false;
            ant.Pose = listening = ant.Carrying ? "carry" : ant.Pose == "sit" ? "sit" : "idle";
        }

        /// <summary>Back to their activity from the nearest stop, unless the story has given them another pose meanwhile.</summary>
        public void Done()
        {
            if (!talking) return;
            talking = false;
            if (def.Round != null)
                for (var i = 0; i < def.Round.Length; i++)
                    if (Vector2.Distance(ant.Feet, def.Round[i].At) < Vector2.Distance(ant.Feet, def.Round[at].At)) at = i;
            if (ant.Pose == listening) Go();
        }

        // Keeps their activity where they stand.
        void Hold()
        {
            Settle(def.Pose, def.Facing, def.Away, false);
        }

        void Update()
        {
            if (talking) return;
            if (since == 0 && !walking)
            {
                // everyone is in the place now: who keeps them company
                company = Company();
                Resume();
            }
            since += Time.deltaTime;
            if (walking)
            {
                if (ant.Walking) return;
                walking = false;
                Keep();
            }
            else Live();
            if (!walking && def.Round != null && (wait -= Time.deltaTime) <= 0)
            {
                aside = 0;
                ant.Carrying = def.Round[at].Carry;
                ant.Running = def.Round[at].Run;
                at = (at + 1) % def.Round.Length;
                Go();
            }
        }

        // Walks on to the stop they are bound for (or back to their place); already there, keeps it.
        void Go()
        {
            var to = def.Round != null ? def.Round[at].At : def.At;
            var points = Vector2.Distance(ant.Feet, to) < 1f ? new List<Vector2>() : place.Walk.Path(ant.Feet, to);
            if (points.Count == 0)
            {
                Keep();
                return;
            }
            walking = true;
            _ = ant.Walk(points);
        }

        void Keep()
        {
            if (def.Round == null)
            {
                Hold();
                return;
            }
            var stop = def.Round[at];
            ant.Carrying = ant.Running = false;
            Settle(stop.Pose, stop.Facing, stop.Away, stop.Watch);
            wait = stop.Wait * Random.Range(.75f, 1.35f);
        }

        // Takes up a pose to keep, turned to whoever keeps them company there.
        void Settle(string pose, int facing, bool away, bool watch)
        {
            (rest, restFacing, restAway, restWatch) = (pose, facing != 0 ? facing : ant.Facing, away, watch);
            company = Company();
            aside = 0;
            beat = Random.Range(BeatMin, BeatMax);
            Resume();
        }

        // Back to the pose they keep, after a beat.
        void Resume()
        {
            ant.Pose = rest;
            if (restAway) ant.FaceAway();
            else if (restWatch && place.Player) ant.FaceTo(place.Player.Feet.x);
            else if (company && (rest is "talk" or "idle" or "sit")) ant.FaceTo(company.Feet.x);
            else ant.FaceTo(ant.Feet.x + restFacing * 8);
        }

        // Someone standing still near enough to keep them company, the nearest.
        Ant Company()
        {
            Ant best = null;
            var near = CompanyNear;
            foreach (var other in place.People)
            {
                var d = Vector2.Distance(other.Feet, ant.Feet);
                if (other == ant || other.Walking || !other.isActiveAndEnabled || d >= near) continue;
                (best, near) = (other, d);
            }
            return best;
        }

        // Their pose in between the stops: turning to the courier coming by, and a beat now and then.
        void Live()
        {
            if (aside > 0 && (aside -= Time.deltaTime) <= 0) Resume();
            if (place.Player is { } courier && Notice(courier)) return;
            if (aside > 0) return;
            if (restWatch && place.Player) Watch(place.Player.Feet.x);
            if ((beat -= Time.deltaTime) > 0) return;
            beat = Random.Range(BeatMin, BeatMax);
            Beat();
        }

        // The courier comes close: they look up from what they are doing and turn to them, now and then with a note
        // of hello.
        bool Notice(Ant courier)
        {
            if (since < Settling || Time.time - greeted < GreetAgain || Vector2.Distance(courier.Feet, ant.Feet) > NoticeNear) return false;
            greeted = Time.time;
            Aside(rest == "sit" || !Work.Contains(rest) ? rest : "idle", courier.Feet.x, 1.6f);
            if (Random.value < .5f) Bubble("smile");
            return true;
        }

        // One small thing, as their pose and company allow.
        void Beat()
        {
            var r = Random.value;
            company = Company();
            if (company && rest == "talk")
            {
                // a pause in the talk: they listen while the other answers, and now and then they laugh
                Aside("idle", company.Feet.x, Random.Range(1.5f, 3f));
                if (company.TryGetComponent<Villager>(out var other)) other.Answer(ant);
                if (r < .3f) Bubble("smile");
            }
            else if (company && rest is "idle" or "look" && r < .5f && ant.Has("talk")) Aside("talk", company.Feet.x, Random.Range(2f, 3.5f));
            else if (company && rest == "sit" && r < .3f) Bubble("smile"); // a word on the bench
            else if (Work.Contains(rest) && r < .45f) Aside("idle", ant.Feet.x - ant.Facing * 8, Random.Range(1.5f, 2.5f)); // a breath, looking about
            else if (Work.Contains(rest) && r < .6f) Bubble("smile"); // humming at it
            else if (!restWatch) Aside(rest, ant.Feet.x - ant.Facing * 8, Random.Range(.8f, 1.6f)); // a glance over the shoulder
        }

        // Their company has paused to listen: they answer, if they are free to.
        void Answer(Ant to)
        {
            if (talking || walking || aside > 0 || rest == "talk" || !ant.Has("talk")) return;
            Aside("talk", to.Feet.x, Random.Range(1.5f, 2.5f));
        }

        // A pose for a moment, turned toward x, then back to the pose they keep.
        void Aside(string pose, float x, float seconds)
        {
            if (ant.Has(pose)) ant.Pose = pose;
            ant.FaceTo(x);
            aside = seconds;
        }

        void Bubble(string mood)
        {
            if (Main.Instance && Main.Instance.Hud) Main.Instance.Hud.Emote(ant, mood);
        }

        // Turns to the courier when they pass to the other side, not at every step in front.
        void Watch(float x)
        {
            if (Mathf.Abs(x - ant.Feet.x) > 4f && (x > ant.Feet.x ? 1 : -1) != ant.Facing) ant.FaceTo(x);
        }
    }
}
