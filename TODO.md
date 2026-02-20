# TODO

## Released (1.0.1)
- [x] Instant text capture on `Instalog` screen
- [x] `Inbox` list with swipe-to-delete
- [x] `Wrap Up` flow with swipe-to-archive and bucket sorting
- [x] Bucket management (create/delete)
- [x] `Review` screen with activity heatmap, bucket trends, and search
- [x] iOS widget support with configurable quick-log presets
- [x] Paywall + StoreKit purchase/restore flow
- [x] Export all data and clear all data actions in Settings
- [x] Onboarding flow and in-app hint overlays

## Feedback → New Features (Backlog)
- [ ] Add edit log text after save
- [ ] Add undo after delete/archive actions
- [ ] Add "view all history" (not only today-focused flows)
- [ ] Improve widget setup onboarding (step-by-step in app)
- [ ] Add optional bucket rename support
- [ ] Add optional pin/favorite buckets for faster wrap-up

## Feedback → Reminder Features (Backlog)
- [ ] Add gentle reminders with optional due time ("Hey, do this by 3:00 PM")
- [ ] Add reminder creation from quick capture flow (text + optional time)
- [ ] Add simple reminder list (Upcoming / Completed)
- [ ] Add one-tap complete/snooze actions for reminders
- [ ] Add configurable reminder tone style (gentle/default)
- [ ] Add per-reminder repeat options (none, daily, weekdays)
- [ ] Add local notification scheduling for reminder times
- [ ] Add in-app quiet hours to suppress non-urgent reminders
- [ ] Add lightweight "today reminders" section in main flow
- [ ] Add reminder-to-log conversion when completed (optional)
- [ ] Add permission handling UX for notifications (allow later, re-enable tips)

## Feature Proposal → Gentle Task Manager Tab
- [ ] Add new `Tasks` tab in bottom navigation
- [ ] Keep tab scope minimal: task title + optional due time + gentle reminder
- [ ] Show two calm sections only: `Today` and `Later`
- [ ] Add quick actions: complete, snooze 1h, snooze tomorrow
- [ ] Add optional "Convert to Log" when task is completed
- [ ] Add empty-state copy that feels supportive, not urgent

### Gentle UX Guardrails (for Tasks)
- [ ] No streaks, no overdue shame states, no red warning language
- [ ] Use soft copy ("nudge", "later", "when ready")
- [ ] Default reminders to off unless user enables per task
- [ ] Avoid noisy badges; use subtle indicators only
- [ ] Keep capture <10 seconds end-to-end

### Calm Feedback Copy (Draft)
- [ ] Snooze 1h confirmation: "I know you're busy right now — no worries. I'll remind you again in a bit."
- [ ] Snooze tomorrow confirmation: "All good. Let's pick this up tomorrow."
- [ ] Reminder set confirmation: "Got it. I'll gently remind you at {time}."
- [ ] Task completed feedback: "Nice. Marked done — one thing off your mind."
- [ ] Empty state: "Nothing urgent here. Add something when you're ready."

### Calm Copy Style Guide (Do / Don’t)
- [ ] Do acknowledge reality: "I know you're busy right now"
- [ ] Do normalize delay: "No worries", "when you're ready"
- [ ] Do offer a clear next step: "I'll remind you again at {time}"
- [ ] Do keep copy short and human (1–2 lines)
- [ ] Don’t use guilt language: "overdue", "missed", "behind"
- [ ] Don’t use alarmist urgency unless explicitly critical
- [ ] Don’t over-notify; prefer fewer, softer nudges

### Reusable Message Templates
- [ ] Reminder trigger: "Quick nudge: {task}. Want to do it now or later?"
- [ ] Snooze selected: "Totally okay — I’ll check in again at {time}."
- [ ] Quiet hours active: "Quiet hours are on. I’ll hold this until {time}."
- [ ] Permission denied: "Reminders are off right now. You can enable them anytime in Settings."

## Now
- [ ] Verify App Store Connect processing status for submitted build
- [ ] Fill in release metadata for version 1.0.1 (description, keywords, screenshots)
- [ ] Submit version 1.0.1 for review
- [ ] Smoke test key flows on TestFlight build:
  - [ ] Instalog capture
  - [ ] Inbox swipe-to-delete
  - [ ] Wrap Up swipe archive/sort
  - [ ] Widget quick-log button
  - [ ] Paywall purchase + restore

## Next
- [ ] Confirm widget behavior on iOS 17+ lock/home screen variants
- [ ] Validate bucket limits and free-tier gates (logs/buckets/widget presets)
- [ ] Review export JSON shape and import-readiness for future migration
- [ ] Clean up stale build artifacts from project root

## Later
- [ ] Add release checklist doc (`RELEASE.md`) for repeatable submissions
- [ ] Add lightweight QA checklist per screen
- [ ] Reconcile App Store copy with implemented features (avoid overpromising sync)
- [ ] Evaluate moving storage layer from AsyncStorage wrapper to MMKV (if needed)
