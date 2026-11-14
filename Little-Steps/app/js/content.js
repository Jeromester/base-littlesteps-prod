// Little Steps — reference content.
// Milestones: adapted from CDC "Learn the Signs. Act Early." checklists (2022 revision),
// written in neutral language. Vaccines: DOH Expanded Program on Immunization (EPI) and the
// Philippine Pediatric Society (PPS) recommended childhood schedule. Schedules change —
// the app always tells parents to confirm with their pedia.

window.LS_CONTENT = (function () {
  const CAT = {
    social: { label: "Social & feelings", icon: "💛" },
    language: { label: "Talking & understanding", icon: "💬" },
    thinking: { label: "Thinking & learning", icon: "🧩" },
    movement: { label: "Moving & doing", icon: "🤸" },
  };

  // [months, label, {category: [items]}]
  const raw = [
    [2, "2 months", {
      social: ["Calms down when spoken to or picked up", "Looks at your face", "Seems happy to see you when you walk up", "Smiles when you talk to or smile at them"],
      language: ["Makes sounds other than crying", "Reacts to loud sounds"],
      thinking: ["Watches you as you move", "Looks at a toy for several seconds"],
      movement: ["Holds head up when on tummy", "Moves both arms and both legs", "Opens hands briefly"],
    }],
    [4, "4 months", {
      social: ["Smiles on their own to get your attention", "Chuckles when you try to make them laugh", "Looks at you, moves, or makes sounds to keep your attention"],
      language: ["Makes cooing sounds like “oooo” and “aahh”", "Makes sounds back when you talk", "Turns head toward the sound of your voice"],
      thinking: ["Opens mouth when they see breast or bottle, if hungry", "Looks at their hands with interest"],
      movement: ["Holds head steady without support when held", "Holds a toy when you put it in their hand", "Swings an arm at toys", "Brings hands to mouth", "Pushes up onto elbows or forearms on tummy"],
    }],
    [6, "6 months", {
      social: ["Knows familiar people", "Likes to look at self in a mirror", "Laughs"],
      language: ["Takes turns making sounds with you", "Blows “raspberries”", "Makes squealing noises"],
      thinking: ["Puts things in mouth to explore them", "Reaches to grab a toy they want", "Closes lips to show they don’t want more food"],
      movement: ["Rolls from tummy to back", "Pushes up with straight arms on tummy", "Leans on hands for support when sitting"],
    }],
    [9, "9 months", {
      social: ["Is shy, clingy, or fearful around strangers", "Shows several facial expressions, like happy, sad, angry, surprised", "Looks when you call their name", "Reacts when you leave (looks, reaches, or cries)", "Smiles or laughs at peek-a-boo"],
      language: ["Makes sounds like “mamamama” and “bababa”", "Lifts arms up to be picked up"],
      thinking: ["Looks for objects dropped out of sight", "Bangs two things together"],
      movement: ["Gets to a sitting position alone", "Moves things from one hand to the other", "Uses fingers to “rake” food toward self", "Sits without support"],
    }],
    [12, "1 year", {
      social: ["Plays games with you, like pat-a-cake"],
      language: ["Waves “bye-bye”", "Calls a parent “mama,” “dada,” or another special name", "Understands “no” (pauses or stops)"],
      thinking: ["Puts something in a container, like a block in a cup", "Looks for things they saw you hide"],
      movement: ["Pulls up to stand", "Walks while holding on to furniture", "Drinks from a cup without a lid as you hold it", "Picks things up between thumb and pointer finger"],
    }],
    [15, "15 months", {
      social: ["Copies other children while playing", "Shows you an object they like", "Claps when excited", "Hugs a stuffed toy or doll", "Shows you affection (hugs, cuddles, kisses)"],
      language: ["Tries to say one or two words besides “mama” or “dada”", "Looks at a familiar object when you name it", "Follows directions given with a gesture and words", "Points to ask for something or get help"],
      thinking: ["Tries to use things the right way, like a phone, cup, or book", "Stacks at least two small objects"],
      movement: ["Takes a few steps alone", "Feeds self some food with fingers"],
    }],
    [18, "18 months", {
      social: ["Moves away from you but looks to make sure you’re close", "Points to show you something interesting", "Puts hands out for you to wash them", "Looks at a few pages in a book with you", "Helps you dress them (pushes arm through sleeve)"],
      language: ["Tries to say three or more words besides “mama” or “dada”", "Follows one-step directions without gestures"],
      thinking: ["Copies you doing chores, like sweeping", "Plays with toys in a simple way, like pushing a toy car"],
      movement: ["Walks without holding on", "Scribbles", "Drinks from a cup without a lid (some spills are fine)", "Feeds self with fingers", "Tries to use a spoon", "Climbs on and off a couch or chair"],
    }],
    [24, "2 years", {
      social: ["Notices when others are hurt or upset", "Looks at your face to see how to react to something new"],
      language: ["Points to things in a book when you ask", "Says at least two words together, like “more milk”", "Points to at least two body parts when asked", "Uses gestures like blowing a kiss or nodding yes"],
      thinking: ["Holds something in one hand while using the other", "Tries switches, knobs, or buttons on a toy", "Plays with more than one toy at a time"],
      movement: ["Kicks a ball", "Runs", "Walks up a few stairs, with or without help", "Eats with a spoon"],
    }],
    [30, "2½ years", {
      social: ["Plays next to, and sometimes with, other children", "Says “Look at me!” to show what they can do", "Follows simple routines when told"],
      language: ["Says about 50 words", "Says two or more words together, with an action word", "Names things in a book when you point and ask", "Uses words like “I,” “me,” or “we”"],
      thinking: ["Uses things to pretend, like feeding a doll", "Shows simple problem-solving, like standing on a stool to reach", "Follows two-step instructions", "Knows at least one color"],
      movement: ["Uses hands to twist things, like doorknobs or lids", "Takes some clothes off alone", "Jumps with both feet", "Turns book pages one at a time"],
    }],
    [36, "3 years", {
      social: ["Calms down within 10 minutes after you leave", "Notices other children and joins them to play"],
      language: ["Has a back-and-forth conversation (2+ exchanges)", "Asks who, what, where, or why questions", "Says what’s happening in a picture when asked", "Says their first name when asked", "Is understood by others most of the time"],
      thinking: ["Draws a circle after you show how", "Avoids touching hot things when warned"],
      movement: ["Strings items together, like large beads", "Puts on some clothes alone", "Uses a fork"],
    }],
    [48, "4 years", {
      social: ["Pretends to be something else during play", "Asks to play with children if none are around", "Comforts others who are hurt or sad", "Avoids danger, like not jumping from tall heights", "Likes to be a “helper”", "Changes behavior based on where they are"],
      language: ["Says sentences with four or more words", "Says some words from a song, story, or rhyme", "Talks about something that happened during the day", "Answers simple questions like “What is a coat for?”"],
      thinking: ["Names a few colors", "Tells what comes next in a well-known story", "Draws a person with three or more body parts"],
      movement: ["Catches a large ball most of the time", "Serves food or pours water, with supervision", "Unbuttons some buttons", "Holds a crayon between fingers and thumb"],
    }],
    [60, "5 years", {
      social: ["Follows rules or takes turns in games", "Sings, dances, or acts for you", "Does simple chores at home"],
      language: ["Tells a story with at least two events", "Answers simple questions about a story", "Keeps a conversation going (3+ exchanges)", "Uses or recognizes simple rhymes"],
      thinking: ["Counts to 10", "Names some numbers between 1 and 5", "Uses time words like “yesterday” and “tomorrow”", "Pays attention for 5–10 minutes during activities", "Writes some letters of their name", "Names some letters when you point to them"],
      movement: ["Buttons some buttons", "Hops on one foot"],
    }],
  ];

  const milestoneGroups = raw.map(([months, label, cats]) => ({
    months,
    label,
    items: Object.entries(cats).flatMap(([cat, list]) =>
      list.map((text, i) => ({ id: `m${months}-${cat}-${i}`, cat, text }))
    ),
  }));

  // Vaccine doses. `at` = recommended age in days from birth (chronological age, as for all babies).
  // epi: true = part of the DOH routine schedule, given free at health centers.
  const W = 7, M = 30.44;
  const vaccines = [
    { id: "bcg", name: "BCG", note: "Protects against severe forms of tuberculosis", at: 0, group: "At birth", epi: true },
    { id: "hepb0", name: "Hepatitis B (birth dose)", note: "Ideally within 24 hours of birth", at: 0, group: "At birth", epi: true },

    { id: "dtp1", name: "DTP-Hib-HepB 1", note: "Pentavalent or hexavalent shot", at: 6 * W, group: "6 weeks", epi: true },
    { id: "polio1", name: "Polio 1 (OPV/IPV)", at: 6 * W, group: "6 weeks", epi: true },
    { id: "pcv1", name: "Pneumococcal (PCV) 1", at: 6 * W, group: "6 weeks", epi: true },
    { id: "rota1", name: "Rotavirus 1", note: "Oral drops", at: 6 * W, group: "6 weeks" },

    { id: "dtp2", name: "DTP-Hib-HepB 2", at: 10 * W, group: "10 weeks", epi: true },
    { id: "polio2", name: "Polio 2 (OPV/IPV)", at: 10 * W, group: "10 weeks", epi: true },
    { id: "pcv2", name: "Pneumococcal (PCV) 2", at: 10 * W, group: "10 weeks", epi: true },
    { id: "rota2", name: "Rotavirus 2", at: 10 * W, group: "10 weeks" },

    { id: "dtp3", name: "DTP-Hib-HepB 3", at: 14 * W, group: "14 weeks", epi: true },
    { id: "polio3", name: "Polio 3 (OPV + IPV)", at: 14 * W, group: "14 weeks", epi: true },
    { id: "pcv3", name: "Pneumococcal (PCV) 3", at: 14 * W, group: "14 weeks", epi: true },
    { id: "rota3", name: "Rotavirus 3", note: "Only for 3-dose brands — ask your pedia", at: 14 * W, group: "14 weeks" },

    { id: "flu1", name: "Influenza", note: "From 6 months, then yearly. First time: 2 doses, 4 weeks apart", at: 6 * M, group: "6 months" },

    { id: "mr1", name: "Measles (MR/MMR) 1", at: 9 * M, group: "9 months", epi: true },
    { id: "ipv2", name: "Polio IPV 2", at: 9 * M, group: "9 months", epi: true },
    { id: "je1", name: "Japanese Encephalitis 1", at: 9 * M, group: "9 months" },

    { id: "mmr2", name: "MMR 2", at: 12 * M, group: "12 months", epi: true },
    { id: "var1", name: "Varicella (chickenpox) 1", at: 12 * M, group: "12 months" },
    { id: "hepa1", name: "Hepatitis A 1", at: 12 * M, group: "12 months" },
    { id: "pcvb", name: "Pneumococcal booster", note: "Depends on the schedule your pedia uses", at: 12 * M, group: "12 months" },

    { id: "dtpb1", name: "DTP-Hib-Polio booster", at: 15 * M, group: "15–18 months" },
    { id: "hepa2", name: "Hepatitis A 2", note: "6–12 months after the first dose", at: 18 * M, group: "15–18 months" },

    { id: "je2", name: "Japanese Encephalitis booster", note: "1–2 years after the first dose", at: 24 * M, group: "2 years" },
    { id: "typhoid", name: "Typhoid", at: 24 * M, group: "2 years" },

    { id: "dtpb2", name: "DTP-Polio booster", at: 48 * M, group: "4–6 years" },
    { id: "mmr3", name: "MMR booster", at: 48 * M, group: "4–6 years" },
    { id: "var2", name: "Varicella 2", at: 48 * M, group: "4–6 years" },
  ].map((v) => ({ ...v, at: Math.round(v.at) }));

  const firsts = [
    { key: "smile", label: "First smile", icon: "😊" },
    { key: "laugh", label: "First laugh", icon: "😂" },
    { key: "roll", label: "First roll over", icon: "🔄" },
    { key: "binyag", label: "Binyag", icon: "🕊️" },
    { key: "food", label: "First taste of food", icon: "🥣" },
    { key: "tooth", label: "First tooth", icon: "🦷" },
    { key: "sit", label: "First time sitting up", icon: "🪑" },
    { key: "crawl", label: "First crawl", icon: "🐢" },
    { key: "word", label: "First word", icon: "🗣️" },
    { key: "steps", label: "First steps", icon: "👣" },
    { key: "haircut", label: "First haircut", icon: "✂️" },
    { key: "beach", label: "First trip to the beach", icon: "🏖️" },
    { key: "birthday", label: "First birthday", icon: "🎂" },
  ];

  return { CAT, milestoneGroups, vaccines, firsts };
})();
