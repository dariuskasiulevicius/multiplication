# Fast Answers are judged against a per-Kid Target Time, not fixed seconds

The Kids are of mixed ages and type at very different speeds on their own devices, so a fixed threshold (the common "answer within 3 s" automaticity benchmark) would measure finger speed as much as recall: too strict for a 7-year-old tapping a 2-digit answer, too lax for an 11-year-old. Instead every Session opens with a Warm-up of five "type the number you see" taps; a rolling median of recent taps gives a separate 1-digit and 2-digit Baseline, and Target Time = Baseline for the answer's digit count + Recall Budget (4 s by default, 3 s Legend Recall Budget, both adjustable per Kid by the Parent).

## Considered Options

- **Fixed seconds (≤ 3 s, ≤ 5 s or ≤ 2 s)** — simple and comparable between Kids, but unfair across ages and input devices.
- **One-time calibration (first launch, then weekly)** — less friction, but typing speed improves over 100 Play Days and the Baseline goes stale.
- **Hidden calibration from ×1 / ×10 answers** — no extra step, but mixes recall into the typing measurement.

## Consequences

- Fast Answer, Mastered and Diamond mean "fast for this Kid at that time"; times in the Family Sheet are not directly comparable between Kids, which suits the decision not to rank siblings.
- Answers auto-submit when the typed digit count matches the answer, so the Warm-up measures the same input flow as real questions.
- Changing the rule later reinterprets all recorded answer history, so the Baseline in force is stored with each answer.
