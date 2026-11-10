# Multiplication Challenge

A browser game that teaches kids the whole 1–10 multiplication table **to speed**, in a few minutes a day (9 by default, set per kid).

- **The Challenge** is 49 Play Days (7 × 7): seven Worlds of seven days, drawn as a 7 × 7 square on the Journey Grid.
- **Legend** keeps going to Play Day 100 (10 × 10) with fewer, longer Rounds and a stricter speed goal. Day 49 and day 100 end with a big ceremony; after day 100 it is free play with no streak to keep.
- Every day: a warm-up, about five Rounds (review, new facts, mix, speed, tricky ones) sized to the kid's recent pace so the day fills the kid's daily minutes (9 by default, the parent can set 3–15), then "see you tomorrow".
- Speed is judged against each kid's own typing speed plus a Recall Budget, so a 7-year-old and an 11-year-old are both challenged fairly.
- Facts level up on a 10 × 10 Sticker Board: bronze → silver → gold (mastered) → diamond.
- Each World's last day ends with a 20-question **Speed Trial** worth up to ⭐⭐⭐; every Play Day opens a **Mystery Chest**. Stars buy hats, buddies and sparkles for the kid's avatar in the **Shop** (tap the avatar). Looks only — nothing in the shop changes the game.
- Four themes (space, pirates, unicorns, pets), English and Lithuanian.
- Works offline after the first visit and can be added to the home screen.

The game's vocabulary (Play Day, World, Shield, Target Time…) is defined in [CONTEXT.md](CONTEXT.md). Key decisions are in [docs/adr](docs/adr).

Play it at **https://dariuskasiulevicius.github.io/multiplication/**

## For parents

1. Open the game and tap **For parents** (or go to `…/multiplication/#parent`).
2. Optionally connect a **Family Sheet** (below) to collect every kid's stats in one Google Sheet.
3. Add each kid's name. You get a **setup link** and a QR code per kid.
4. Open each link **on that kid's own device**. The kid picks a theme and the first day starts with a short quiz to find what they already know.

On a kid's device, ⚙️ opens the kid's own settings (how to play, language, sound, adventure). The small **Settings for parents** link at the bottom leads, behind a grown-up maths question, to daily practice minutes, the Recall Budget, stats (including Stars and Speed Trial results), sync, restore and backups.

**iPhone / iPad:** a game added to the home screen keeps its own storage, separate from Safari. The setup screen walks the kid through it: copy the setup link, add the game to the home screen, open it from there and tap **Paste setup link**.

## Family Sheet

Your kids' stats go to a Google Sheet that you own, through a small Apps Script. Nothing is stored anywhere else.

1. Create a new Google Sheet (any name).
2. In the sheet, open **Extensions → Apps Script**.
3. Delete the sample code and paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs). Click **Save**.
4. Click **Deploy → New deployment**. Next to "Select type" click the gear and choose **Web app**.
   - **Execute as:** Me
   - **Who has access:** Anyone
5. Click **Deploy** and allow access. Google warns that the app isn't verified: click **Advanced → Go to … (unsafe)**. It is your own script, running in your own account.
6. Copy the **Web app URL** (ends with `/exec`).
7. In the game, open **For parents**, paste the URL and tap **Connect**. Then add your kids and open their setup links.

The game creates these tabs:

| Tab | What's in it |
| --- | --- |
| `Days` | One row per kid per day: Play Day, minutes, questions, accuracy, % fast, median answer time, gold and diamond counts, streak, shields |
| `Answers` | Every answer: fact, given answer, correct, fast, time, Target Time and the typing baseline used |
| `Board · <name>` | Each kid's 10 × 10 Sticker Board |
| `State` | Full progress snapshot per kid, used to restore a device; also records the kid's active device |
| `Batches` | Bookkeeping so retried uploads are not counted twice |
| `Settings` | One row per kid: daily minutes, Recall Budget and Legend Recall Budget (seconds). Edit a value here and the kid's device takes it on its next sync |

Good to know:

- On first **Connect** the game stores a random secret in the script (**Project Settings → Script Properties → `SECRET`**). Requests without it are rejected. Connecting from a second parent device asks you to paste that secret.
- Each kid has one active device. Opening a kid's setup link on a new device restores their progress there; the old device then offers "Play on this device" to move back.
- Settings can be changed in the `Settings` tab or in **Settings for parents** on the kid's device; the later change wins. A kid's row appears after that device's first sync with this script version. The device picks up a sheet change on its next sync (opening the app, the Home screen, after every round), and today's rounds are resized if none has been played yet. Allowed values: 3–15 minutes, 1–15 seconds; out-of-range values are clamped, and a blank or mistyped cell is put back to the device's value.

### Updating the script

When `apps-script/Code.gs` changes, copy the new version into your sheet's script and publish it as a **new version of the same deployment** (a *new deployment* would get a new URL and break the setup links):

1. Open [`apps-script/Code.gs`](apps-script/Code.gs) on GitHub, click **Raw**, select all and copy.
2. Open your Family Sheet → **Extensions → Apps Script**.
3. In `Code.gs`, select all, delete, paste the new code and click **Save** (💾 or Ctrl/⌘ + S).
4. Click **Deploy → Manage deployments**, pick your existing **Web app** deployment and click the ✏️ pencil (**Edit**).
5. Under **Version** choose **New version**, optionally type a description, and click **Deploy**. If Google asks for access again, allow it (**Advanced → Go to … (unsafe)**, as during setup).
6. Check that the **Web app URL** shown is the same as before (it ends with `/exec`). Nothing changes in the game or the setup links.

Saving alone updates sheet triggers (like the `Settings` tab's edit stamp) but **not** the web app the game talks to; that only changes with step 5.

## Development

```bash
npm install
npm run dev      # http://localhost:5173/multiplication/
npm test         # Vitest: core game logic
npm run check    # svelte-check + TypeScript
npm run build    # production build in dist/
npm run icons    # regenerate the PNG icons in public/
```

Stack: Svelte 5, TypeScript, Vite, vite-plugin-pwa, Vitest. Progress lives in IndexedDB on each device.

```
src/core/      game rules, framework-free and unit-tested (facts, mastery, rounds, journey, placement)
src/data/      IndexedDB store, Family Sheet sync client, PWA helpers
src/ui/        screens and components
src/i18n/      English and Lithuanian strings
src/themes/    the four themes
apps-script/   Family Sheet backend (Google Apps Script)
```

Pushing to `main` runs the tests and deploys to GitHub Pages (**Settings → Pages → Source: GitHub Actions**).
