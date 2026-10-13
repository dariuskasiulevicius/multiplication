# Multiplication Challenge

A browser game that teaches kids the whole 1–10 multiplication table **to speed**, in 5–9 minutes a day.

- **The Challenge** is 49 Play Days (7 × 7): seven Worlds of seven days, drawn as a 7 × 7 square on the Journey Grid.
- **Legend** keeps going to Play Day 100 (10 × 10) with shorter sessions and a stricter speed goal.
- Every day: a warm-up, about five short Rounds (review, new facts, mix, speed, tricky ones), then "see you tomorrow".
- Speed is judged against each kid's own typing speed plus a Recall Budget, so a 7-year-old and an 11-year-old are both challenged fairly.
- Facts level up on a 10 × 10 Sticker Board: bronze → silver → gold (mastered) → diamond.
- Four themes (space, pirates, unicorns, pets), English and Lithuanian.
- Works offline after the first visit and can be added to the home screen.

The game's vocabulary (Play Day, World, Shield, Target Time…) is defined in [CONTEXT.md](CONTEXT.md). Key decisions are in [docs/adr](docs/adr).

Play it at **https://dariuskasiulevicius.github.io/multiplication/**

## For parents

1. Open the game and tap **For parents** (or go to `…/multiplication/#parent`).
2. Optionally connect a **Family Sheet** (below) to collect every kid's stats in one Google Sheet.
3. Add each kid's name. You get a **setup link** and a QR code per kid.
4. Open each link **on that kid's own device**. The kid picks a theme and the first day starts with a short quiz to find what they already know.

The parent menu on a kid's device (⚙️, behind a grown-up maths question) lets you change the Recall Budget, see stats, sync, restore and back up progress.

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

Good to know:

- On first **Connect** the game stores a random secret in the script (**Project Settings → Script Properties → `SECRET`**). Requests without it are rejected. Connecting from a second parent device asks you to paste that secret.
- Each kid has one active device. Opening a kid's setup link on a new device restores their progress there; the old device then offers "Play on this device" to move back.
- After changing `Code.gs`, use **Deploy → Manage deployments → Edit → Version: New version**. This keeps the same URL, so setup links stay valid.

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
