using UnityEngine;

namespace Shop
{
    /// <summary>
    /// Keeps someone at their activity: they hold its pose where they stand, or walk their round from stop to stop,
    /// keeping each stop's pose for a while. Talked to, they stop and turn to the courier, and go back to it after.
    /// </summary>
    public sealed class Villager : MonoBehaviour
    {
        Person def;
        Ant ant;
        WalkMap walk;
        int at; // the stop they are at, or walking to
        float wait;
        bool walking, talking;
        string listening; // the pose they stopped in to listen

        public static void Add(Ant ant, Person def, WalkMap walk)
        {
            var v = ant.gameObject.AddComponent<Villager>();
            (v.def, v.ant, v.walk) = (def, ant, walk);
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

        /// <summary>Back to their activity, unless the story has given them another pose meanwhile.</summary>
        public void Done()
        {
            talking = false;
            if (ant.Pose != listening) return;
            if (def.Round == null) Hold();
            else Go();
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
            if (talking || def.Round == null) return;
            if (walking)
            {
                if (ant.Walking) return;
                walking = false;
                Keep();
            }
            else if ((wait -= Time.deltaTime) <= 0)
            {
                ant.Carrying = def.Round[at].Carry;
                ant.Running = def.Round[at].Run;
                at = (at + 1) % def.Round.Length;
                Go();
            }
        }

        // Walks on to the stop they are bound for; already there, keeps it.
        void Go()
        {
            var points = walk.Path(ant.Feet, def.Round[at].At);
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
            var stop = def.Round[at];
            ant.Carrying = ant.Running = false;
            ant.Pose = stop.Pose;
            if (stop.Facing != 0) ant.FaceTo(ant.Feet.x + stop.Facing * 8);
            wait = stop.Wait;
        }
    }
}
