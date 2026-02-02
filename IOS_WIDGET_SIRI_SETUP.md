# iOS Widget & Siri Shortcuts Setup Guide

## What's Been Done (Automated)

✅ Deep link handling in App.tsx (`instalog://log`)
✅ URL scheme registered in Info.plist
✅ NSUserActivityTypes added for Siri
✅ Widget Swift file created (`ios/InstalogWidget/InstalogWidget.swift`)
✅ Intent definition file created (`ios/Instalog/Instalog.intentdefinition`)
✅ Accessibility labels added throughout app

## Manual Steps Required in Xcode

### 1. Add Widget Extension

1. Open `ios/Instalog.xcworkspace` in Xcode
2. File → New → Target
3. Choose "Widget Extension"
4. Product Name: `InstalogWidget`
5. Language: Swift
6. Uncheck "Include Configuration Intent"
7. Click Finish
8. Replace the generated `InstalogWidget.swift` with the one in `ios/InstalogWidget/`

### 2. Configure Widget Target

1. Select the InstalogWidget target
2. General tab:
   - Bundle Identifier: `com.instalog.InstalogWidget`
   - Deployment Target: iOS 14.0+
3. Signing & Capabilities tab:
   - Enable "App Groups"
   - Add group: `group.com.instalog.shared`

### 3. Configure Main App for Widget

1. Select the Instalog target
2. Signing & Capabilities tab:
   - Enable "App Groups"
   - Add group: `group.com.instalog.shared` (same as widget)

### 4. Add Intent Extension for Siri

1. File → New → Target
2. Choose "Intents Extension"
3. Product Name: `InstalogIntents`
4. Language: Swift
5. Click Finish
6. In the InstalogIntents target:
   - Add `Instalog.intentdefinition` file
   - Configure Bundle ID: `com.instalog.InstalogIntents`

### 5. Link Intent Definition

1. Select `Instalog.intentdefinition` in Project Navigator
2. In File Inspector (right panel):
   - Check targets: Instalog, InstalogWidget, InstalogIntents

### 6. Create Intent Handler (InstalogIntents/IntentHandler.swift)

```swift
import Intents

class IntentHandler: INExtension, CreateLogIntentHandling {
    
    func handle(intent: CreateLogIntent, completion: @escaping (CreateLogIntentResponse) -> Void) {
        let defaults = UserDefaults(suiteName: "group.com.instalog.shared")
        
        // Generate simple ID
        let timestamp = Date().timeIntervalSince1970
        let logId = "\\(Int(timestamp * 1000))"
        
        // Create log entry
        let logEntry: [String: Any] = [
            "id": logId,
            "timestamp": ISO8601DateFormatter().string(from: Date()),
            "text": intent.logText ?? "",
            "bucketId": NSNull(),
            "dateKey": getTodayDateKey()
        ]
        
        // Get existing logs
        var logs: [[String: Any]] = []
        if let existingData = defaults?.data(forKey: "@instalog/logs"),
           let existingLogs = try? JSONSerialization.jsonObject(with: existingData) as? [[String: Any]] {
            logs = existingLogs
        }
        
        // Append new log
        logs.append(logEntry)
        
        // Save back
        if let data = try? JSONSerialization.data(withJSONObject: logs) {
            defaults?.set(data, forKey: "@instalog/logs")
        }
        
        let response = CreateLogIntentResponse(code: .success, userActivity: nil)
        completion(response)
    }
    
    func getTodayDateKey() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        return formatter.string(from: Date())
    }
    
    override func handler(for intent: INIntent) -> Any {
        return self
    }
}
```

### 7. Update AsyncStorage to Use App Groups

In `src/storage/mmkv.ts`, modify to use shared storage:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// For widget/Siri access, we need UserDefaults with App Groups
// This is a bridge - React Native AsyncStorage + native UserDefaults

export const STORAGE_KEYS = {
  LOGS: '@instalog/logs',
  BUCKETS: '@instalog/buckets',
} as const;
```

### 8. Add Siri Capability

1. Select Instalog target
2. Signing & Capabilities
3. Click "+ Capability"
4. Add "Siri"

### 9. Test Widget

1. Build and run the app
2. Long press home screen
3. Tap "+" in top left
4. Search for "Instalog"
5. Add the small widget
6. Tap widget - should open app and create a log

### 10. Test Siri Shortcut

1. Open Shortcuts app
2. Create new shortcut
3. Add action "Log to Instalog"
4. Configure log text
5. Run shortcut
6. Check Instalog app - log should appear

## Notes

- Widget updates when app is opened (no background refresh for privacy)
- Siri shortcuts work offline
- All data stays local via App Groups
- No network requests or analytics

## Troubleshooting

**Widget not appearing:**
- Check Bundle IDs match
- Verify App Groups are identical in all targets
- Clean build folder (Cmd+Shift+K)
- Delete app and reinstall

**Siri not working:**
- Verify Siri capability is enabled
- Check Intent definition is linked to all targets
- Rebuild InstalogIntents target

**Deep links not working:**
- Verify CFBundleURLSchemes in Info.plist
- Check URL handling code in App.tsx
- Test with: `xcrun simctl openurl booted "instalog://log"`
