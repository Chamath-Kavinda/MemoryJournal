/**
 * The bundled lessons (section 5.7). They are plain strings in a small markdown subset, so they
 * ship inside the app, read offline, and need no markdown loader in Metro, Jest or Electron:
 *
 * - `## ` starts a section.
 * - A line starting with `- ` is a list item; consecutive items form one list.
 * - Anything else is a paragraph. Blank lines separate paragraphs.
 *
 * No other markdown is used (no bold, links, code, tables or images), and tutorials.test.ts checks
 * that. Every lesson ends with a `## Try it tonight` section holding one or more paragraphs.
 */

export interface Lesson {
  id: string;
  title: string;
  /** One sentence for the lesson list. */
  summary: string;
  /** A rough reading time in whole minutes. */
  minutes: number;
  body: string;
}

const WHAT_MEMORY_IS = `
## Memory is rebuilt, not replayed

A memory is not a recording. Each time you remember something, your mind rebuilds it from pieces: images, words, feelings and the place you were in. That is why a memory can feel vivid and still be wrong in small details.

## Three steps

- Taking it in. What you pay attention to at that moment decides most of what you can use later.
- Keeping it. Memories stay stronger when they connect to things you already know.
- Finding it again. Often what feels like forgetting is a failure to find a memory, not proof that it is gone.

## What helps

- Attention: put the phone down for the few seconds a name, number or place needs.
- Meaning: ask how the new thing relates to something you know.
- Trying to recall: pulling something out of memory strengthens it more than reading it again.
- Spacing: coming back to it after a gap works better than going over it many times in one sitting.

## Why this journal helps

Writing your day each evening is a form of trying to recall. You search your memory for the day without looking at photos or messages, and you write what you find. The recall score only compares you with your own history. It is a motivation tool, not a medical measure.

## Try it tonight

Open today's page and write what you did, hour by hour, before you check your phone, photos or messages. Stop when you run out of memories. Do not force the rest.
`.trim();

const MEMORY_PALACE = `
## Use a place you know

The memory palace is an old method: you leave the things you want to remember at fixed spots in a place you know very well. Your own home is the best choice, because you can walk through it in your mind without effort.

## Build the route

Pick a route with five to eight stops and always walk it in the same order. For example: the front door, the hallway, the kitchen table, the sink, the sofa, the bedroom door, the bed.

## Leave one item at each stop

Turn each thing you want to remember into a picture and leave it at a stop. The picture works best when it is large, odd, moving and involves the senses. If you need to remember milk, bread and batteries, picture milk pouring out of the keyhole at the front door, a loaf of bread asleep on the hallway floor, and batteries rolling around on the kitchen table.

## Walk it in your mind

To recall, close your eyes and walk the route from the start. Look at each stop and see what is there.

## Tips

- Keep the order the same every time.
- Put only one item at each stop.
- Start with a short route and make it longer when it feels easy.
- Reuse a route after a few days. Picture each stop clearly so that the old pictures fade.

## Try it tonight

Choose five stops in your home. Leave the first five things you did today at those stops, one each. Then walk the route in your mind and write each item under the matching hour on today's page.
`.trim();

const LINKING_STORIES = `
## A chain instead of a list

A list is hard to hold because each item stands alone. Linking joins each item to the next one with a single picture in which both of them appear. When you remember one item, it pulls the next one with it.

## Make the picture work

- Make things very big, very small or very strange.
- Make them do something to each other instead of sitting side by side.
- Use movement, sound, smell and feeling, and the odder the better.
- Use your own people and places, because they already mean something to you.

## An example

Say you need to remember a key, bread, an umbrella and a phone. A giant key slices a loaf of bread. Every slice opens up like an umbrella and floats away. The umbrella lands on a phone, which rings so loudly that the umbrella shakes. Tell the story once or twice, and the four items come back in order.

## From pictures to a story

When a list is longer, join the pictures into one short story, with each step leading to the next. A story that has a beginning and an end is easier to hold than a row of separate pictures.

## Try it tonight

Take six things from today, such as people, places or tasks. Link them in order into one short story and tell it to yourself once. Then write the six items in today's page.
`.trim();

const CHUNKING_NUMBERS = `
## Why chunk

You can only hold a few separate items in mind at once. A long number is a long row of separate items, which is why it slips away. Grouping digits into chunks makes each chunk one item, so you hold fewer things.

## Split the number

Break the number into groups of two to four digits. A phone number such as 0771234567 is easier as 077, 123 and 4567. Say the groups out loud with a small pause between them.

## Give each chunk a meaning

- A chunk can be a year you know, such as 1995, or an age.
- It can be a house number, a price or a date.
- It can be turned into a picture and left at a stop of your memory palace.

The more a chunk means to you, the less effort it takes to keep.

## Check yourself

Look away for a minute, then say the chunks in order. If one is missing, give it a stronger meaning and try again later.

## Try it tonight

Choose one number from today, such as a phone number, a price or a house number. Split it into chunks and give each chunk a meaning or a picture. Look away and recall it, then write the chunks on today's page next to the person or place they belong to.
`.trim();

const NAMES_AND_FACES = `
## Names are lost at the start

Most names are forgotten because they were never really heard. The moment of the introduction is when your mind is busy with how you look and what to say, so the name goes by.

## A few steps

- Listen for the name and slow down for that moment.
- Say it back right away, for example: Nice to meet you, Anika.
- Ask about it: how it is spelled, or where it comes from.
- Pick one feature of the face or the way the person stands.
- Link the name to that feature with a picture. For Rose, picture a rose behind her ear.
- Use the name once or twice in the conversation.

## Check yourself

Later in the day, try to recall the name and the feature without looking anything up. If you cannot find the name, look at it afterwards and make the picture stronger.

## Try it tonight

Think of one person you met today. Write their name, where you met, one feature and one thing they said. If you like, create a tag for them in the People category and mention it on today's page.
`.trim();

const SPACED_RECALL = `
## Recall first, then check

The best way to practice is to try to recall something before you look at it. The effort of searching is what makes the memory stronger. Looking first and calling it recall does not give the same benefit.

## Come back after gaps

Come back to what you want to keep after a gap, and make the gaps longer each time. A common pattern is the same evening, the next day, three days later and a week later. It is better to come back a little late than not at all.

## How to do it

- Close the page and say or write what you remember.
- Check against the original.
- Mark what you missed.
- Come back to the missed parts at the next gap.

## In this journal

Days stay exactly as you saved them. If you remember more later, you write it as a new pass. Highlight additions shows which words you added. Details you add to a day that is two days old or older raise your recall score, because they show you found more in your memory than before.

## Try it tonight

Without opening it, try to recall what you wrote two days ago. Then open that day and compare. Add anything you now remember that the page is missing.
`.trim();

const EVENING_REVIEW = `
## A short ritual

A habit lasts when it is small and happens at the same time. The evening review is ten minutes after 9 PM, when today's page unlocks. You go through your day, write what you find, and stop.

## The ten minutes

- Sit down at the same time and place each evening.
- Walk through the day hour by hour and write what comes to you.
- Add a name, a number or a place, and use a tag for the ones that matter.
- Stop when you run out of memories, and save.

## Keep it going

- Tie it to something you already do, such as after dinner or before brushing your teeth.
- Let the daily reminder at 9 PM bring you back if you forget.
- A day counts toward your streak when you save your first pass between 9 PM and midnight with at least 20 words.
- A freeze covers one missed day, and you earn one for every seven days in a row, up to two.
- If you miss a day, come back the next evening. You do not need to make it up.

## Try it tonight

Choose a time after 9 PM and write today's page from start to finish in about ten minutes. Aim for at least 20 words, then save.
`.trim();

/** The lessons in the order they are taught. Ids are stored in the user's progress, so keep them. */
export const LESSONS: readonly Lesson[] = [
  {
    id: 'what-memory-is',
    title: 'What memory actually is',
    summary: 'Memory is rebuilt each time you use it, and a few habits make it stronger.',
    minutes: 3,
    body: WHAT_MEMORY_IS,
  },
  {
    id: 'memory-palace',
    title: 'The memory palace',
    summary: 'Leave what you want to remember at the stops of a route through your own home.',
    minutes: 4,
    body: MEMORY_PALACE,
  },
  {
    id: 'linking-stories',
    title: 'Linking and visual stories',
    summary: 'Join items into a chain of pictures so that each one brings the next.',
    minutes: 3,
    body: LINKING_STORIES,
  },
  {
    id: 'chunking-numbers',
    title: 'Chunking numbers',
    summary: 'Split long numbers into groups and give each group a meaning.',
    minutes: 3,
    body: CHUNKING_NUMBERS,
  },
  {
    id: 'names-and-faces',
    title: 'Names and faces',
    summary: 'Hear the name, say it, and link it to a picture of the person.',
    minutes: 3,
    body: NAMES_AND_FACES,
  },
  {
    id: 'spaced-recall',
    title: 'Spaced recall',
    summary: 'Recall without looking, check, and come back after longer gaps.',
    minutes: 3,
    body: SPACED_RECALL,
  },
  {
    id: 'evening-review',
    title: 'Evening review habit',
    summary: 'A ten-minute routine after 9 PM that you can keep going.',
    minutes: 3,
    body: EVENING_REVIEW,
  },
];
