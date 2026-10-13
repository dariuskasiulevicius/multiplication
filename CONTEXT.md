# Multiplication Challenge

A browser game in which each Kid learns all 100 multiplication Facts (1–10 × 1–10) to speed through a short daily practice Challenge, while the Parent follows progress in a Family Sheet.

## Language

### People

**Kid**:
A child playing the game on their own device; one Kid per device.

**Active Device**:
The single device whose Syncs the Family Sheet accepts for a Kid; opening that Kid's Setup Link on another device Restores there and moves the Active Device.
_Avoid_: Player, user, student, profile

**Parent**:
The adult who sets up Kids' devices, tunes their settings and reads their stats.
_Avoid_: Admin, teacher

### Facts and speed

**Fact**:
One ordered multiplication question a × b with a, b in 1..10; 3 × 7 and 7 × 3 are different Facts, 100 in total.
_Avoid_: Question, problem, card, exercise

**Fact Pair**:
The two Facts a × b and b × a, which are always introduced together.

**New Fact**:
A Fact not yet Introduced to the Kid; it never appears in Review.

**Introduced**:
The state of a Fact after its Fact Pair was presented with a dot-grid and trick, or after a correct Placement Quiz answer.
_Avoid_: Unlocked, learned

**Weak Fact**:
An Introduced Fact ranked for extra practice: first any Fact answered wrong in the last 3 Play Days, then lower Tier, then slower recent answers relative to Target Time.
_Avoid_: Hard fact, problem fact

**Fact Family**:
All Facts that share one multiplier, e.g. the ×7 family.
_Avoid_: Table, row

**Baseline**:
A Kid's current pure typing time for a 1-digit or a 2-digit number, measured during Warm-up.

**Recall Budget**:
The extra time allowed on top of Baseline to recall a Fact — 4 s by default, adjustable per Kid by the Parent.
_Avoid_: Bonus time, grace period

**Legend Recall Budget**:
The stricter Recall Budget — 3 s by default, adjustable per Kid — used to judge Diamond at any time and all speed during Legend.

**Target Time**:
Baseline for the answer's digit count plus Recall Budget (or Legend Recall Budget during Legend).
_Avoid_: Time limit, timeout (nothing ever times out)

**Legend Target Time**:
Baseline for the answer's digit count plus Legend Recall Budget; checked for every answer from Play Day 1.

**Fast Answer**:
A correct answer given within Target Time.

**Slow Answer**:
A correct answer given after Target Time; counts as correct but earns no speed credit.

**Mastered**:
A Fact that received Fast Answers on 3 different Play Days.
_Avoid_: Learned, known, done

**Tier**:
A Fact's visible level: Unseen → Bronze (answered correctly once) → Silver (one Fast Answer) → Gold (Mastered) → Diamond (within Legend Target Time on 3 different Play Days, earnable before Legend too).
_Avoid_: Level, rank

**Dusty**:
A mark on a Fact whose latest answer was wrong; its Tier is kept, and the next Fast Answer removes the mark.
_Avoid_: Broken, lost, demoted

### Practice

**Placement Quiz**:
A one-time ~3 minute quiz on a Kid's first launch that detects Facts the Kid already knows, so they are not drilled as new; together with two short Rounds it forms Play Day 1.

**Warm-up**:
Five "type the number you see" taps that open every Session and update Baseline.

**Round**:
About 10 questions of one kind — Review, New Facts, Speed or Mixed.

**Core Rounds**:
The fixed set of Rounds (about 5 normally, 3 in Legend) that must be finished to earn a Play Day.

**Bonus Round**:
An optional Round played after Core Rounds, allowed until the Daily Cap.

**Daily Cap**:
9 minutes of play per calendar day, summed over all Sessions; after it the game sends the Kid away until tomorrow.

**Session**:
One continuous sitting in the app, from opening to leaving; a Play Day's Core Rounds may be spread over several Sessions on the same calendar day.

### Challenge

**Play Day**:
A calendar day (device local date) on which the Kid finished Core Rounds.
_Avoid_: Day (alone), lesson

**Challenge**:
The main journey of 49 (7 × 7) Play Days through 7 Worlds, continued by Legend up to 100 (10 × 10) Play Days.

**World**:
A themed stage drawn as one part of the Journey Grid — a row of 7 Play Days in the Challenge, or a ring in Legend; the next World unlocks by Play Days, never by score.
_Avoid_: Chapter, level, week

**Legend World**:
One of the three Worlds of Legend, each a ring that grows the Journey Grid's square: to 8 × 8 (Play Day 64, 15 Play Days), 9 × 9 (Play Day 81, 17 Play Days) and 10 × 10 (Play Day 100, 19 Play Days).

**Speed Trial**:
A 20-question test at the end of a World — about half Facts Introduced in that World, the rest the Kid's Weak Facts — scored 1–3 Stars (50 / 75 / 90 % Fast Answers); it can be retried in Bonus time, only the best attempt counts, and it never blocks progress.
_Avoid_: Boss, exam, test

**Legend**:
The phase from Play Day 50 to Play Day 100, with fewer Core Rounds, speed judged by Legend Recall Budget, played through three Legend Worlds.
_Avoid_: Expert mode, extension

**Free Play**:
Practice after Play Day 100, with no Streak pressure.

**Streak**:
The number of consecutive calendar days that were either Play Days or covered by a Shield.

**Shield**:
A token that automatically covers one missed calendar day so the Streak survives; a Kid starts with 1, earns 1 per completed World and holds at most 2.
_Avoid_: Freeze, life

### Rewards and look

**Star**:
The currency earned in Speed Trials and Mystery Chests and spent on Cosmetics.
_Avoid_: Coin, point

**Cosmetic**:
A purely visual avatar item with no effect on play.

**Mystery Chest**:
A random reward (Stars or a Cosmetic) given when a Play Day is earned.

**Theme**:
A visual skin — Space, Pirates, Unicorn or Pets — that names and draws Worlds and the avatar but never changes rules; a Kid may switch Theme at any time without losing progress.
_Avoid_: Skin, world (a World is a stage, not a Theme)

**Journey Grid**:
A 10 × 10 grid with one cell per Play Day, filled row by row in the 7 × 7 square during the Challenge and ring by ring to 10 × 10 during Legend; it also shows Streak and Shields.
_Avoid_: Journey map, calendar, path

**Sticker Board**:
The 10 × 10 grid of all Facts, each shown in its Tier.
_Avoid_: Heatmap, table

### Setup and stats

**Setup Link**:
A per-Kid link (also shown as a QR code) generated by the Parent that configures a Kid's device.

**Family Sheet**:
The Parent's own Google Sheet that receives every Kid's stats.

**Sync**:
Sending a finished Session's data and a full progress snapshot to the Family Sheet.

**Restore**:
Rebuilding a Kid's progress on a device from the snapshot in the Family Sheet.

**Parent Menu**:
The settings area on a Kid's device, behind an adult gate.

## Relationships

- A **Kid** has exactly one **Active Device**, one **Theme**, one **Streak** and 0–2 **Shields**; progress is never merged between devices
- A **Kid** has 100 **Facts**, each in exactly one **Tier**; a Tier never goes down, a wrong answer only makes the Fact **Dusty** and a **Weak Fact**
- A **Session** starts with one **Warm-up** and contains zero or more **Rounds**
- A **Play Day** is earned once per calendar day, when **Core Rounds** are finished; Core Rounds left unfinished at midnight are lost, but their answers still count toward **Facts**
- Each **Session** starts with its own **Warm-up**, even when continuing the same day's **Core Rounds**
- A **World** ends with one **Speed Trial** and earns one **Shield** on completion
- The **Challenge** has 7 **Worlds** of 7 **Play Days** (the 7 × 7 square), then **Legend** with 3 **Legend Worlds** (rings to 8 × 8, 9 × 9, 10 × 10), then **Free Play**
- The **Journey Grid** (Play Days) and the **Sticker Board** (Facts) are both 10 × 10; the finish line is both full
- **Target Time** = **Baseline** + **Recall Budget**; a **Fast Answer** beats it
- A **Fact** becomes **Mastered** (Gold) after **Fast Answers** on 3 different **Play Days**; Fast Answers in the **Placement Quiz** count toward this
- A **Parent** creates one **Setup Link** per **Kid**; all **Kids** **Sync** into one **Family Sheet**

## Example dialogue

> **Dev:** "A **Kid** missed Tuesday. Is the **Streak** lost?"
> **Parent:** "Not if a **Shield** is left — it's used automatically. But Tuesday still isn't a **Play Day**, so it doesn't count toward the next **World**."
> **Dev:** "And 7 × 8 answered correctly but slowly every day this week?"
> **Parent:** "Those are **Slow Answers** — correct, so it's Bronze, but it only turns Gold after **Fast Answers** on 3 different **Play Days**."
> **Dev:** "Fast against what — 3 seconds?"
> **Parent:** "No fixed number. **Target Time** is that Kid's own typing **Baseline** plus the **Recall Budget**."

## Flagged ambiguities

- "day" was used for both a calendar day and a day of practice — resolved: **Play Day** is a day with finished **Core Rounds**; Streak and Shields work on calendar days.
- "week" was used for both 7 calendar days and a **World** — resolved: rules use **World** (a Journey Grid row or ring); "week" is not a game term.
- "mastered" and "gold" were used interchangeably — resolved: **Mastered** is the state, Gold is the **Tier** that displays it.
- "7 weeks" was the Challenge goal — resolved: the goal is 49 **Play Days**; missed days move the finish date later, and **Shields** are earned per completed **World**, not per calendar week.
- "Legend" named both the late phase and the top speed standard — resolved: **Legend** is the phase (Play Day 50+); Diamond and **Legend Target Time** are tracked from Play Day 1.
- Legend milestones were "every 10 Play Days" — resolved: milestones are the square numbers 64, 81 and 100, each closing a **Legend World**.
- "level" was used for both **Tier** and **World** — resolved: avoid "level".
