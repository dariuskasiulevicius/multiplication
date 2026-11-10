# Parent Settings sync both ways; the later change wins

ADR 0001 makes each Kid's device the source of truth and the Family Sheet a one-way copy. Parent Settings (daily minutes and both Recall Budgets) are the exception: the Parent wants to change them from the sheet without holding the Kid's device. The device keeps the time of its last Parent Settings change; every Sync sends the settings with that time, and the sheet's Settings tab keeps a Changed time that a simple `onEdit` trigger stamps when the Parent edits a row. If the device's change is later, the Sync writes it to the row; if the row's is later, the Sync reply carries the row's values and the device applies them. Equal times mean both are in step.

## Considered Options

- **Sheet always wins** — simplest, but a change in the Parent Menu would be undone by the next Sync unless the slider were removed, and the Parent wanted to keep it.
- **Device always wins (status quo)** — the sheet could only show settings, not change them.
- **Settings in the Setup Link** — needs a new link and opening it on the device for every change.

## Consequences

- An older script ignores the settings and an older app sends none, so either side can be updated first.
- A change reaches the device only on its next Sync; a device that is offline or not yet updated keeps its old values.
- Times come from two clocks (the device's and Google's); a badly wrong device clock could make an older change look newer. Edits are rare and minutes apart, so this is accepted.
- Values from the sheet are clamped to the Parent Menu's ranges on the device; the script puts a blank or mistyped cell back to the device's value.
