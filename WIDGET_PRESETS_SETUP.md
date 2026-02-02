# Widget Dynamic Presets Setup Guide

This guide explains how to wire up the dynamic widget preset system in Xcode.

## Overview

The system allows users to configure up to 3 quick-log buttons in the React Native app that appear as interactive buttons in the iOS widget (iOS 17+).

**Architecture:**
- React Native UI → Native Module → App Group UserDefaults → Widget reads presets → Interactive buttons

## Prerequisites

- iOS 17+ for interactive widgets (falls back to deep links on iOS < 17)
- App Group: `group.com.instalog.shared` already configured
- InstalogWidget target already exists

---

## Step 1: Add Native Module Files to Xcode

### Add to Main App Target

1. **Open** `ios/Instalog.xcworkspace` in Xcode
2. **Right-click** the `Instalog` folder in Project Navigator
3. **Add Files to "Instalog"...**
4. **Select:**
   - `WidgetPresetsModule.swift`
   - `WidgetPresetsModule.m`
5. **Target Membership:** Check ✅ **Instalog** (main app)
6. **Create Bridging Header** if prompted (or use existing)

### Add to Widget Target

1. **Right-click** the `InstalogWidget` folder
2. **Add Files to "Instalog"...**
3. **Select:**
   - `SharedStore.swift`
   - `QuickLogIntent.swift`
4. **Target Membership:** Check ✅ **InstalogWidget** only

---

## Step 2: Configure App Groups (if not already done)

### Main App Target

1. **Select** Instalog project → **Instalog** target
2. **Signing & Capabilities** tab
3. **+ Capability** → **App Groups**
4. **Check:** `group.com.instalog.shared`

### Widget Target

1. **Select** Instalog project → **InstalogWidget** target
2. **Signing & Capabilities** tab
3. **+ Capability** → **App Groups**
4. **Check:** `group.com.instalog.shared`

---

## Step 3: Update Widget Target Settings

### Enable Intents

1. **Select** InstalogWidget target
2. **Build Settings** tab
3. **Search:** "Supports App Intents"
4. **Set:** `YES`

### Link WidgetKit

1. **General** tab
2. **Frameworks and Libraries**
3. **Verify** `WidgetKit.framework` is added
4. **Add if missing:** + → Search "WidgetKit" → Add

---

## Step 4: Update Widget Bundle

Open `InstalogWidgetBundle.swift` and ensure it's configured:

```swift
import WidgetKit
import SwiftUI

@main
struct InstalogWidgetBundle: WidgetBundle {
    var body: some Widget {
        InstalogWidget()
    }
}
```

---

## Step 5: Build & Test

### Build Steps

1. **Clean Build Folder:** Product → Clean Build Folder (Shift+Cmd+K)
2. **Build Main App:** Cmd+B
3. **Build Widget:** Select InstalogWidget scheme → Cmd+B

### Test React Native UI

1. **Run app:** `npm run ios` or build from Xcode
2. **Navigate to:** Widget tab (📲)
3. **Add presets:**
   - Tap "Add Button"
   - Enter label: "Workout"
   - Enter log text: "Completed workout"
   - Select icon
4. **Tap:** "Save & Update Widget"
5. **Verify:** Alert shows "Widget presets saved!"

### Test Widget

1. **Add Widget:**
   - Long-press home screen
   - Tap + (top left)
   - Search "Instalog"
   - Drag medium widget to home screen
2. **Verify:**
   - Your configured buttons appear
   - Button labels match your config
   - Icons display correctly
3. **Test Interaction (iOS 17+):**
   - Tap a button directly in the widget
   - Log should save instantly (no app opening)
   - Widget count should update
4. **Test Fallback (iOS < 17):**
   - Button opens app via deep link

---

## Step 6: Debugging

### Widget Not Updating

If presets don't appear:

1. **Check App Group:**
   ```bash
   # Terminal command to verify UserDefaults
   xcrun simctl spawn booted defaults read group.com.instalog.shared
   ```

2. **Check Console:**
   - Xcode → Window → Devices and Simulators
   - Select device → Open Console
   - Filter: "Instalog"

3. **Force Reload:**
   - Add this to Widget Config screen (temporary):
   ```typescript
   import {NativeModules} from 'react-native';
   
   // After save:
   NativeModules.WidgetPresetsModule.setWidgetPresets('[]')
     .then(() => NativeModules.WidgetPresetsModule.setWidgetPresets(presetsJson));
   ```

### Build Errors

**"Cannot find 'SharedStore' in scope":**
- Verify `SharedStore.swift` is added to InstalogWidget target
- Check Target Membership in File Inspector

**"Cannot find 'QuickLogIntent' in scope":**
- Verify `QuickLogIntent.swift` is added to InstalogWidget target
- Ensure it's compiled (Build Phases → Compile Sources)

**"No such module 'WidgetKit'":**
- Add WidgetKit framework to InstalogWidget target
- General → Frameworks and Libraries → + WidgetKit

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│ React Native (WidgetConfigScreen.tsx)              │
│ - User configures preset buttons                   │
│ - Calls: WidgetPresetsModule.setWidgetPresets()    │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ Native Module (WidgetPresetsModule.swift)          │
│ - Validates JSON                                    │
│ - Saves to App Group UserDefaults                  │
│ - Calls: WidgetCenter.shared.reloadAllTimelines() │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ App Group UserDefaults                              │
│ Key: "@instalog/presets"                           │
│ Value: JSON array of preset configs                │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ Widget (InstalogWidget.swift)                      │
│ - Provider reads presets via SharedStore           │
│ - Renders Button(intent:) for each preset          │
│ - Shows today's log count                          │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼ (user taps button)
┌─────────────────────────────────────────────────────┐
│ AppIntent (QuickLogIntent.swift)                   │
│ - Runs instantly (no app opening)                  │
│ - Saves log to "@instalog/logs" in App Group       │
│ - Reloads widget timelines (updates count)         │
└─────────────────────────────────────────────────────┘
```

---

## Storage Schema

### Presets Key: `@instalog/presets`

```json
[
  {
    "id": "preset-1706652000123",
    "label": "Workout",
    "text": "Completed workout session",
    "icon": "dumbbell"
  },
  {
    "id": "preset-1706652000456",
    "label": "Note",
    "text": "Quick note",
    "icon": "note.text"
  }
]
```

### Logs Key: `@instalog/logs`

```json
[
  {
    "id": "1706652123456-123",
    "timestamp": "2026-01-30T14:30:00Z",
    "text": "Completed workout session",
    "bucketId": null,
    "dateKey": "2026-01-30"
  }
]
```

---

## Testing Checklist

- [ ] Native module compiles without errors
- [ ] Widget Config screen appears in app
- [ ] Can add/remove/reorder preset buttons
- [ ] Save button triggers native module
- [ ] Widget shows configured buttons on home screen
- [ ] Button labels and icons match configuration
- [ ] Today's log count displays correctly
- [ ] Tapping button logs instantly (iOS 17+)
- [ ] Widget count updates after logging
- [ ] Logs appear in main app's Inbox
- [ ] Deep link fallback works (iOS < 17)

---

## Production Considerations

### Performance

- Widget timeline refreshes every hour
- App Group UserDefaults is fast (< 1ms reads)
- Limit to 3 buttons to keep widget UI clean

### Data Sync

- Widget reads from App Group (one-way)
- Main app is source of truth
- No real-time sync (updates on next timeline refresh)

### Error Handling

- Widget shows default buttons if no presets configured
- Graceful JSON parsing with fallbacks
- Native module rejects invalid JSON with error messages

### Icon Options

Default SF Symbols provided:
- `plus.circle`
- `note.text`
- `dumbbell`
- `sparkles`
- `star.fill`

You can expand this list in `WidgetConfigScreen.tsx`:
```typescript
const DEFAULT_ICONS = [
  'plus.circle',
  'note.text',
  'dumbbell',
  'sparkles',
  'star.fill',
  'bolt.fill',
  'heart.fill',
  'checkmark.circle.fill'
];
```

---

## Troubleshooting Commands

### View App Group Data

```bash
# Simulator
xcrun simctl spawn booted defaults read group.com.instalog.shared

# Reset App Group (for testing)
xcrun simctl spawn booted defaults delete group.com.instalog.shared
```

### Widget Console Logs

```bash
# Stream widget logs
log stream --predicate 'processImagePath contains "InstalogWidget"' --level debug
```

### Force Widget Reload

```bash
# Kill widget process (forces reload)
xcrun simctl spawn booted killall -9 "InstalogWidget"
```

---

## Next Steps

After completing this setup:

1. **Test thoroughly** on simulator and real device
2. **Consider adding** more icon options based on user feedback
3. **Monitor** App Group storage usage (< 1MB recommended)
4. **Document** for end users how to configure widgets

The system is production-ready and follows iOS best practices for widget extensions and App Intents.
