namespace Shop
{
    /// <summary>
    /// The village remembers: after each night's keepsake goes home, and each parcel the courier carried, the next
    /// day's villagers have something to say of it. Each word is said once, the first time the courier talks to them
    /// in its days, before their own lines.
    /// </summary>
    public static class Gossip
    {
        public readonly struct Word
        {
            /// <summary>Who says it, on which chapters, and only once this flag is kept (a delivery), if any.</summary>
            public readonly string Who, Line, Flag;
            public readonly int From, Until;

            public Word(string who, int from, int until, string line, string flag = null) =>
                (Who, From, Until, Line, Flag) = (who, from, until, line, flag);
        }

        static readonly Word[] All =
        {
            // Night 1's watch went home to Helen
            new("baker", 2, 2, "Helen came in for flour before the birds were up, humming. Helen! I near dropped the tray."),
            new("bram", 2, 2, "Helen left the lantern by her bench burning. First time in twenty years. I walked past it twice, just to look."),
            new("sam", 2, 2, "Helen asked the hall for the 1952 timetable. I found it in four minutes. I timed myself."),
            new("arlo", 2, 2, "Heard the damar did its work. Helen's watch ticks again, they say. Good oil, that."),
            new("mender", 2, 2, "That watch keeps time in Helen's pocket now. Best wheels I've set in years. Steady hands, lad."),
            new("helen", 2, 2, "I slept last night, love. Right through. I'd forgotten how."),
            // Night 2's Mochi went home to Pip
            new("mia", 3, 3, "Pip slept the whole night. The whole night! I sat up waiting for him to cry, and woke in the chair at dawn."),
            new("nora", 3, 3, "The boy came by at sunrise to show me the red ear. Ratih's thread, Ratih's stitch. She'd have laughed."),
            new("baker", 3, 3, "Pip bought two rolls this morning. One for him, one for the rabbit. Paid for both. I didn't argue."),
            new("sam", 3, 3, "Pip delivered me a letter addressed to 'The Rabbit Doctor, Bellwood'. I have forwarded it to you."),
            new("gardener", 3, 3, "Pip came asking if chamomile grows in pots. I gave him one. He says it's so Mochi can smell home."),
            new("helen", 3, 3, "Pip walked the platform with that rabbit under his arm, telling it about the trains. I told him the rest."),
            // Night 3's camera went home to Theo
            new("arlo", 4, 4, "Theo was down on the jetty at first light, drizzle and all, filming the boats in. Like him and your father used to."),
            new("baker", 4, 4, "Theo came in for bread. Five years! I gave him the good loaf and didn't say a word. Well. Two words."),
            new("mia", 4, 4, "Theo took a picture of Pip and his rabbit. I've never seen that boy stand so still."),
            new("helen", 4, 4, "Theo sat with me on the bench last evening. We didn't talk. Some people you don't need to."),
            new("leo", 4, 4, "Saw Theo come up the hill road yesterday, camera and all. First time in five years. I waved. He waved back."),
            new("salter", 4, 4, "Theo's door stood open all morning. I walked past it four times. Nosy, I know."),
            // Night 4's key went home to Sam
            new("baker", 5, 5, "Sam opened the hall at ten past nine this morning. Ten past! The square doesn't know what to do with itself."),
            new("helen", 5, 5, "Sam brought a flask of tea up to the platform for me. Sam! Something's eased in that one."),
            new("nora", 5, 5, "Sam came to tell me the archive's dry. Fifty years of paper saved. He told me twice, he was that pleased."),
            new("mia", 5, 5, "Sam smiled at me. At the stall. With teeth. I've had to sit down."),
            new("bram", 5, 5, "Sam came up the platform asking after the old timetables. We talked an hour. I didn't know he had an hour in him."),
            new("arlo", 5, 5, "Sam's pinned a notice: 'Archive open. Bring your old papers. Dry ones.' Had me laughing all morning."),
            // Night 5's shoes went home to Leo
            new("baker", 6, 7, "Leo went past the bakery at dawn like a gale. Flour everywhere. I've never been so glad to sweep."),
            new("nora", 6, 7, "Leo ran past my porch this morning. Not jogging, child. Running. I'd forgotten that boy could fly."),
            new("mia", 6, 7, "Pip raced Leo down the lane. Leo let him win by a whisker. The second time, he didn't."),
            new("helen", 6, 7, "Leo stopped at the stall, not even out of breath, and asked for two sugars. He's never taken sugar in his life."),
            new("sam", 6, 7, "Leo asked me to time him. Me! I used the hall clock. It is accurate to the second."),
            new("bram", 6, 7, "Young Leo came up the platform at a sprint and back down again. My old knees cheered."),
            // the post the courier carried
            new("nora", 2, 3, "Mia's letter is pinned by my loom, child. Next winter's shawl is already on it. Blue, this time.", "delivered_post_mia"),
            new("helen", 2, 3, "The porter's tea was the smoky kind, from the hills. I made a pot for the bench. Ta for carrying it, love.", "delivered_post_tea"),
            new("sam", 3, 4, "The Baker's rolls came warm, thanks to you. I wrote him a note of thanks. Four pages, single-spaced.", "delivered_post_rolls"),
            new("florist", 3, 4, "The Gardener's seeds came, and a day early. A day early! You must have frightened him, courier.", "delivered_post_seeds"),
            new("baker", 4, 5, "The coast's bonito went into a pie, and their sweet bread's in the oven. Fair's fair.", "delivered_post_fish"),
            new("mia", 4, 5, "Pip wears Nora's red jumper inside out. He says that way the warm side's out. I've stopped arguing.", "delivered_post_jumper"),
            new("bram", 5, 6, "Collected my umbrella from Helen's stall. Left it there again this morning. Some habits hold the roof up.", "delivered_post_umbrella"),
            new("herder", 5, 6, "The aphids have had the chaff, and the milk's come sweeter for it. A sip, courier? No? Your loss.", "delivered_post_chaff"),
            new("arlo", 6, 7, "The Mender's needles are the best I've owned. Three nets mended already. Tell him, if he asks. He won't.", "delivered_post_needles"),
            new("florist", 6, 7, "That salt the salter sent? Roses, a fortnight. I've stopped telling anyone why.", "delivered_post_salt"),
        };

        /// <summary>What they have yet to say of the days gone by, now marked said; null when nothing.</summary>
        public static string Next(string who)
        {
            foreach (var w in All)
            {
                var said = "said_" + w.Line;
                if (w.Who != who || Game.Chapter < w.From || Game.Chapter > w.Until || (w.Flag != null && !Game.Has(w.Flag)) || Game.Has(said)) continue;
                Game.Remember(said);
                return w.Line;
            }
            return null;
        }
    }
}
