# Family Sheet via Apps Script is the only backend

The app is a static site on GitHub Pages, so it has no server of its own. Kid progress lives on each Kid's device (IndexedDB) and is the source of truth during play; after every Session the app Syncs session rows, answer rows and a full progress snapshot to the Parent's own Google Sheet through an Apps Script web app bound to that sheet. The same snapshot powers Restore when a device loses its storage. We chose this because it costs nothing, needs no accounts on the Kids' devices, keeps Kid data in a sheet the Parent owns, and gives the Parent charts and history for free.

The Apps Script URL and a shared secret are never committed: the repo is public, so they travel only inside per-Kid Setup Links (URL hash) and are stored on the device. The script rejects requests without the secret.

## Considered Options

- **Firebase / Supabase** — live sync and dashboards, but needs accounts, Kid data in a third-party project, and more to maintain.
- **EmailJS or daily email with attachment** — Parent declined email; client-side email services also limit attachments and route data through a third party.
- **Google Form `formResponse` POST** — no script, but blind (no acknowledgement, so no reliable retry or de-duplication) and only one flat tab.
- **Writing to the sheet with the Sheets API** — requires OAuth sign-in on each Kid's device.
- **Hardcoding the script URL in the repo** — simplest setup, but anyone reading the public repo could write to the Family Sheet.

## Consequences

- Moving to a real backend later means re-issuing Setup Links to every device and migrating sheet history.
- Requests are sent as `text/plain` JSON so the browser makes a simple CORS request without a preflight, which Apps Script cannot answer.
- Each Session carries a UUID so the script can drop duplicates when the device retries.
- Because each device is its own source of truth, a Kid has one Active Device: the script rejects Syncs from any other device, and moving devices means Restore, never merge.
