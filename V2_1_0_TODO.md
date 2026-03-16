# Instalog v2.1.0 TODO

> Target: First post-review update. Focus on polish, feedback fixes, and small quality-of-life wins.
> Current in review: v2.0.0

---

## Bug Fixes & Polish
- [ ] Show visual indicator on tasks that have carried over from a previous day (e.g. subtle "from yesterday" label)
- [ ] Fix any reported crash/ANR issues from App Store review or early user feedback
- [ ] Audit snooze behavior — snoozed tasks updating `dateKey` may confuse "Today" vs "Later" split
- [ ] Ensure completed tasks from wrap-up don't re-appear on next app launch

## UX Improvements
- [ ] Add edit log text after save (top backlog request)
- [ ] Add undo after swipe-to-delete / swipe-to-archive
- [ ] Add bucket rename support in Settings
- [ ] Improve empty state copy on Tasks screen to feel supportive, not clinical

## Tasks Tab
- [ ] Add "from [date]" carried-forward label on overdue tasks (soft, no red/shame language)
- [ ] Add bulk "clear all completed tasks" action
- [ ] Validate recurring task spawn doesn't create duplicates if app is opened multiple times in one day
- [ ] Test snooze → notification → re-open flow end-to-end

## Notifications
- [ ] Add quiet hours setting (suppress non-urgent reminders between configurable hours)
- [ ] Review notification permission re-prompt UX (currently no re-enable guidance after denial)
- [ ] Add "Reminder set" confirmation toast (calm copy: "Got it. I'll gently remind you at {time}.")

## Settings & Data
- [ ] Add optional bucket pin/favorite for faster wrap-up ordering
- [ ] Validate export JSON includes tasks + moods (not just logs)
- [ ] Add "view all logs" history screen (not filtered to today only)

## Onboarding
- [ ] Improve widget setup onboarding (step-by-step guide in app instead of external doc)
- [ ] Add tooltip/hint for Tasks tab on first open

## App Store & Release
- [ ] Monitor v2.0.0 review outcome and respond to any metadata issues
- [ ] Collect early user feedback (crashes, confusion points, missing features)
- [ ] Prepare v2.1.0 release notes (changelog)
- [ ] Add `RELEASE.md` checklist for repeatable future submissions

---

## Out of Scope for 2.1.0
- Social / sharing features → V3
- PDF / Notion export → V2.2.0+
- Lifetime purchase tier → revisit at $1k MRR
- Weekly summary notifications → V2.2.0+
