# Play Reminders are empty Web Push messages sent by the Family Sheet

Kids forgot to play for days and lost their Streak. A reminder must reach the Kid's phone at set times only while today's Play Day isn't earned, and the game is a static PWA on GitHub Pages whose only server is the Family Sheet's Apps Script. So the sheet decides: a time-driven trigger runs every 15 minutes, and at each of the Kid's reminder times it checks the Days tab for today's Play Day and sends a Web Push message to the Kid's device if there is none. The device subscribes in the Parent Menu and sends its subscription with every Sync; the script keeps it in a Reminders tab.

The message is empty. Web Push payloads must be encrypted (ECDH + AES-GCM), which Apps Script cannot do; an empty push needs only the VAPID signature. The service worker writes the words from the Kid's saved progress (name, Theme avatar, Streak), so nothing about the Kid passes through Apple's or Google's push service. VAPID needs ES256, which Apps Script lacks too, so the script signs with its own P-256 ECDSA (BigInt, RFC 6979 nonce). The key pair is made once by the first browser that turns reminders on (WebCrypto has a proper random source; Apps Script does not) and kept in the script's properties, next to the shared secret.

## Considered Options

- **The ntfy app** — the script posts to ntfy.sh, a free push relay, and each phone runs the ntfy app subscribed to a private topic. Far less code, but the notification comes from another app, and the Parent installs and sets it up on every phone.
- **A push service such as Firebase or OneSignal** — they encrypt and sign for us, but each needs an account, its own SDK in the game, and a key or service account in the script.
- **Reminders the device schedules itself** — no browser API for that works on iPhone (Notification Triggers were dropped; Periodic Background Sync is Android-only and runs when the browser chooses), and the device can't know about a Play Day it already earned until it runs.
- **A phone alarm** — no code, but it rings on days already played.

## Consequences

- On iPhone and iPad reminders work only for the game added to the Home Screen (iOS 16.4+); the Parent Menu says so.
- The trigger and push sending need two new Google permissions (external requests and triggers), asked when the Parent deploys the updated script.
- A Play Day earned offline still gets reminders until the device syncs; a device that synced in the last 20 minutes is taken to be playing and gets none.
- An older app sends no subscription and an older script ignores it, so either side can be updated first. The signing code runs only in the trigger, so if BigInt failed in Apps Script, only reminders would stop, not Sync.
- The signer is not constant-time; it runs on Google's servers and signs only one-hour tokens for empty messages, so timing attacks are not a concern.
