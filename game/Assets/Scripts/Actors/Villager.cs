using System.Collections.Generic;
using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Keeps someone at their activity: they hold its pose where they stand, or walk their round from stop to stop,
    /// keeping each stop's pose for a while (at some, turned to the courier). Talked to, they stop and turn to the
    /// courier; taken into a scene, the story moves them. Either way they go back to it after, from the nearest stop.
    /// </summary>
    public sealed class Villager : MonoBehaviour
    {
        Person def;
        Ant ant;
        Place place;
        int at; // the stop they are at, or walking to
        float wait;
        bool walking, talking;
        string listening; // the pose they stopped in to listen

        public static void Add(Ant ant, Person def, Place place)
        {
            var v = ant.gameObject.AddComponent<Villager>();
            (v.def, v.ant, v.place) = (def, ant, place);
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
            ant.Stop();
            ant.Pose = listening = ant.Carrying ? "carry" : ant.Pose == "sit" ? "sit" : "idle";
            ant.FaceTo(courierX);
        }

        /// <summary>Stops their activity where they are and stands by, for a scene to move them.</summary>
        public void Cue()
        {
            if (talking) return;
            talking = true;
            walking = false;
            ant.Stop();
            ant.Running = false;
            ant.Pose = listening = ant.Carrying ? "carry" : "idle";
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
            ant.Pose = def.Pose;
            ant.Facing = def.Facing;
            if (def.Away) ant.FaceAway();
        }

        void Update()
        {
            if (talking) return;
            if (walking)
            {
                if (ant.Walking) return;
                walking = false;
                Keep();
            }
            else if (def.Round != null && def.Round[at].Watch && place.Player is { } courier)
                Watch(courier.Feet.x);
            if (!walking && def.Round != null && (wait -= Time.deltaTime) <= 0)
            {
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
            ant.Pose = stop.Pose;
            if (stop.Away) ant.FaceAway();
            else if (stop.Watch && place.Player) ant.FaceTo(place.Player.Feet.x);
            else if (stop.Facing != 0) ant.FaceTo(ant.Feet.x + stop.Facing * 8);
            wait = stop.Wait;
        }

        // Turns to the courier when they pass to the other side, not at every step in front.
        void Watch(float x)
        {
            if (Mathf.Abs(x - ant.Feet.x) > 4f && (x > ant.Feet.x ? 1 : -1) != ant.Facing) ant.FaceTo(x);
        }
    }
}
