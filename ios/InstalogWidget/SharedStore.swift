//
//  SharedStore.swift
//  InstalogWidget
//
//  Shared data access layer for App Group UserDefaults
//

import Foundation

struct WidgetPreset: Codable, Identifiable {
    let id: String
    let label: String
    let text: String
    let icon: String
    let bucketId: String?
}

struct LogEntry: Codable {
    let id: String
    let timestamp: String  // ISO 8601 string to match React Native
    let text: String?
    let bucketId: String?
    let dateKey: String
}

class SharedStore {
    
    // MARK: - Constants
    private static let appGroupIdentifier = "group.com.instalog.shared"
    private static let presetsKey = "@instalog/presets"
    private static let logsKey = "@instalog/logs"
    
    // MARK: - UserDefaults
    private static var userDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroupIdentifier)
    }
    
    // MARK: - Presets
    
    /// Load widget presets from App Group
    static func loadPresets() -> [WidgetPreset] {
        guard let defaults = userDefaults,
              let presetsJson = defaults.string(forKey: presetsKey),
              let data = presetsJson.data(using: .utf8) else {
            return [] // Return empty if not configured
        }
        
        do {
            let presets = try JSONDecoder().decode([WidgetPreset].self, from: data)
            return presets
        } catch {
            print("Failed to decode presets: \(error)")
            return []
        }
    }
    
    /// Default presets if none configured
    private static func defaultPresets() -> [WidgetPreset] {
        return [
            WidgetPreset(id: "default-1", label: "Quick Log", text: "Logged from widget", icon: "plus.circle", bucketId: nil),
            WidgetPreset(id: "default-2", label: "Note", text: "Quick note", icon: "note.text", bucketId: nil)
        ]
    }
    
    // MARK: - Logs
    
    /// Save a new log entry
    static func saveLog(text: String, bucketId: String? = nil) {
        guard let defaults = userDefaults else {
            print("Failed to access App Group UserDefaults")
            return
        }
        
        // Create log entry with ISO 8601 timestamp (matches React Native format)
        let now = Date()
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let timestamp = isoFormatter.string(from: now)
        let dateKey = Self.formatDateKey(now)
        let logId = "\(Int(now.timeIntervalSince1970 * 1000))-\(Int.random(in: 0...999))"
        
        let newLog = LogEntry(
            id: logId,
            timestamp: timestamp,
            text: text.isEmpty ? nil : text,
            bucketId: bucketId,
            dateKey: dateKey
        )
        
        // Load existing logs
        var logs = loadLogs()
        logs.append(newLog) // Add to end (React Native expects chronological order)
        
        // Keep only last 1000 logs
        if logs.count > 1000 {
            logs = Array(logs.suffix(1000))
        }
        
        // Save back to UserDefaults
        if let encoded = try? JSONEncoder().encode(logs),
           let jsonString = String(data: encoded, encoding: .utf8) {
            defaults.set(jsonString, forKey: logsKey)
            defaults.synchronize()
        }
    }
    
    /// Load all logs
    static func loadLogs() -> [LogEntry] {
        guard let defaults = userDefaults,
              let logsJson = defaults.string(forKey: logsKey),
              let data = logsJson.data(using: .utf8) else {
            return []
        }
        
        do {
            let logs = try JSONDecoder().decode([LogEntry].self, from: data)
            return logs
        } catch {
            print("Failed to decode logs: \(error)")
            return []
        }
    }
    
    /// Get count of logs for a specific date
    static func getLogCount(for dateKey: String) -> Int {
        return loadLogs().filter { $0.dateKey == dateKey }.count
    }
    
    /// Get today's log count
    static func getTodayLogCount() -> Int {
        let today = formatDateKey(Date())
        return getLogCount(for: today)
    }
    
    // MARK: - Helpers
    
    private static func formatDateKey(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}
