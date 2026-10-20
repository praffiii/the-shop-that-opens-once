namespace Shop
{
    /// <summary>
    /// The courier's own rounds, beside the night's keepsake: on each of Nights 1 to 5 two villagers ask him to take a
    /// letter or a parcel to someone else. He may, or not. Whatever he takes stays in the bag till it is delivered, on
    /// that day or a later one.
    /// </summary>
    public static class Post
    {
        public sealed class Delivery
        {
            /// <summary>The night it is asked on, its id in the bag, and who sends it to whom.</summary>
            public int Night;
            public string Id, From, To;
            /// <summary>A letter, or else a parcel.</summary>
            public bool Letter;
            /// <summary>Its name and what the courier sees of it in the bag; the sender asking, and the thanks.</summary>
            public string Name, Seen, Ask, Thanks;
        }

        public static readonly Delivery[] All =
        {
            new()
            {
                Night = 1, Id = "post_mia", From = "mia", To = "nora", Letter = true, Name = "Letter for Grandma Nora",
                Seen = "Mia's round hand: \"Grandma Nora, by the bridge.\" It smells faintly of spinach.",
                Ask = "Satria, you're walking about anyway... would you take this to Grandma Nora? Only my thanks for the shawl. I never get the time to go east.",
                Thanks = "From Mia? That girl. She thanks me for a shawl every winter, and every winter I knit her another.",
            },
            new()
            {
                Night = 1, Id = "post_tea", From = "porter", To = "helen", Name = "Parcel for Helen",
                Seen = "A small packet of tea, string-tied, labelled in the porter's square capitals: HELEN, TEA STALL.",
                Ask = "Courier! Helen's tea came in on the cart. My back says the platform's too far today. Would you?",
                Thanks = "My tea! The good leaves, from the hills. Tell that porter he's owed a cup, and he'll get it with sugar.",
            },
            new()
            {
                Night = 2, Id = "post_rolls", From = "baker", To = "sam", Name = "Rolls for Sam",
                Seen = "Two warm rolls in a paper bag, the top folded over twice, the Baker's way.",
                Ask = "Sam takes his breakfast at his desk and forgets to eat it. Drop these rolls at the hall for him, would you?",
                Thanks = "Rolls, from the Baker? He worries more than my mother did. Thank him for me. Properly, mind.",
            },
            new()
            {
                Night = 2, Id = "post_seeds", From = "florist", To = "gardener", Letter = true, Name = "Note for the Gardener",
                Seen = "A folded note in green ink: \"MARIGOLD SEED. YOU PROMISED.\" Underlined twice.",
                Ask = "The Gardener's owed me marigold seed since spring. Take him my note? He forgets anything that isn't written down.",
                Thanks = "Marigolds! Right, right. Tell her Thursday. I'll write that down too, somewhere.",
            },
            new()
            {
                Night = 3, Id = "post_fish", From = "fisher", To = "baker", Name = "Smoked fish for the Baker",
                Seen = "A smoked fish wrapped in banana leaf and newspaper. It smells wonderful, and very strong.",
                Ask = "That's for the Baker, in trade for his loaves, same as every week. Run it up to the square for me?",
                Thanks = "Smoked bonito! The coast never forgets. There'll be sweet bread in it for them on Thursday.",
            },
            new()
            {
                Night = 3, Id = "post_jumper", From = "nora", To = "mia", Name = "Nora's knitting",
                Seen = "A small red jumper, folded round a sprig of lavender. Pip's size, or a little bigger.",
                Ask = "A jumper for Pip, for the cold nights. Take it to his mother, child. My knees won't do the hill today.",
                Thanks = "Oh, Nora... She's knitted him one every year since the whirlwind. He's grown out of four.",
            },
            new()
            {
                Night = 4, Id = "post_umbrella", From = "helen", To = "bram", Letter = true, Name = "Helen's note for the Captain",
                Seen = "Helen's note, short and underlined: \"Bram. Your umbrella. My stall. AGAIN.\"",
                Ask = "Bram's left his umbrella at my stall again, in this weather. Take him this note. He never listens to me twice.",
                Thanks = "Hah! My umbrella. Seventy years I've owned umbrellas, and never kept one a week.",
            },
            new()
            {
                Night = 4, Id = "post_chaff", From = "farmhand", To = "herder", Name = "Sack of dry chaff",
                Seen = "A sack of dry chaff, tied at the neck. Dry, which today is saying a lot.",
                Ask = "The rain's got into the herder's feed shed. Would you carry this dry chaff over to him? It's light, I promise.",
                Thanks = "Dry chaff! The aphids will thank you, in their way. Mostly by eating it.",
            },
            new()
            {
                Night = 5, Id = "post_needles", From = "mender", To = "arlo", Name = "Net needles for Arlo",
                Seen = "Three wooden net needles in a twist of oilcloth, their points ground sharp.",
                Ask = "Arlo's net needles, ground sharp. He'll be at the jetty, or under a boat. Mind the points.",
                Thanks = "Sharp as gulls' beaks! The Mender's the only one left who grinds them the old way.",
            },
            new()
            {
                Night = 5, Id = "post_salt", From = "salter", To = "florist", Name = "Twist of sea salt",
                Seen = "A twist of coarse sea salt in brown paper, for the flower seller.",
                Ask = "For the flower seller. She salts her cut stems, says it keeps them. I say she's mad, but she pays.",
                Thanks = "My salt! She thinks I'm mad, you know. My roses last a fortnight.",
            },
        };
    }
}
