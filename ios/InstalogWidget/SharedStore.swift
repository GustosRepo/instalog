//
//  SharedStore.swift
//  InstalogWidget
//
//  Shared data access layer for App Group UserDefaults
//

import Foundation

// MARK: - Widget Config Types

struct WidgetActionConfig: Codable, Identifiable {
    let id: String
    let type: String          // "thought" | "task" | "idea" | "mood" | "brainDump"
    let label: String
    let icon: String          // SF Symbol name
    let defaultBucketId: String?
    let saveInstantly: Bool
    let openAppAfterTap: Bool
}

struct WidgetConfigState: Codable {
    let layout: String        // "single" | "multi"
    let actions: [WidgetActionConfig]
    let sendToInboxByDefault: Bool
    let showUnprocessedCount: Bool
    let showTodayMood: Bool
}

// MARK: - Task (for widget)

struct WidgetTask: Codable, Identifiable {
    let id: String
    let text: String
    let createdAt: String
    let dateKey: String
    let completedAt: String?
    let isRecurringTemplate: Bool?
}

// MARK: - Legacy Preset (kept for backward-compat decoding)

struct WidgetPreset: Codable, Identifiable {    let id: String
    let label: String
    let text: String
    let icon: String
    let bucketId: String?
}

// MARK: - Log Entry

struct LogEntry: Codable {
    let id: String
    let timestamp: String  // ISO 8601
    let text: String?
    let bucketId: String?
    let dateKey: String
    let status: String?        // "unprocessed" | "processed" | "archived"
    let suggestedType: String? // "thought" | "task" | "idea" | "mood" | "note"
    let source: String?        // "widget" | "manual"
}

// MARK: - SharedStore

class SharedStore {

    private static let appGroupIdentifier = "group.com.instalog.shared"
    private static let presetsKey        = "@instalog/presets"
    private static let logsKey           = "@instalog/logs"
    private static let tasksKey          = "@instalog/tasks"
    private static let widgetConfigKey   = "@instalog/widgetConfig"
    private static let isProKey          = "@instalog/isPro"
    private static let totalLogCountKey  = "@instalog/totalLogCount"
    private static let freeLogLimitKey   = "@instalog/freeLogLimit"
    private static let languageKey       = "@instalog/language"

    private static var userDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroupIdentifier)
    }

    // MARK: - Language

    static func loadLanguage() -> String {
        return userDefaults?.string(forKey: languageKey) ?? "en"
    }

    // MARK: - Paywall

    static func canCreateLog() -> Bool { return true }

    static func isPro() -> Bool {
        return userDefaults?.bool(forKey: isProKey) ?? false
    }

    // MARK: - Widget Config

    static func loadWidgetConfig() -> WidgetConfigState? {
        guard let defaults = userDefaults,
              let json = defaults.string(forKey: widgetConfigKey),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetConfigState.self, from: data)
    }

    // MARK: - Tasks

    static func loadTodayTasks() -> [WidgetTask] {
        guard let defaults = userDefaults,
              let json = defaults.string(forKey: tasksKey),
              let data = json.data(using: .utf8) else { return [] }
        let all = (try? JSONDecoder().decode([WidgetTask].self, from: data)) ?? []
        let todayKey = formatDateKey(Date())
        return all.filter { task in
            guard task.completedAt == nil && task.isRecurringTemplate != true else { return false }
            return task.dateKey == todayKey || task.dateKey < todayKey
        }
    }

    static func completeTask(id: String) {
        guard let defaults = userDefaults,
              let json = defaults.string(forKey: tasksKey),
              let data = json.data(using: .utf8),
              var tasks = try? JSONDecoder().decode([WidgetTask].self, from: data) else { return }
        let now = ISO8601DateFormatter().string(from: Date())
        tasks = tasks.map { t in
            t.id == id ? WidgetTask(id: t.id, text: t.text, createdAt: t.createdAt, dateKey: t.dateKey, completedAt: now, isRecurringTemplate: t.isRecurringTemplate) : t
        }
        if let encoded = try? JSONEncoder().encode(tasks),
           let updated = String(data: encoded, encoding: .utf8) {
            defaults.set(updated, forKey: tasksKey)
            defaults.synchronize()
        }
    }

    // MARK: - Legacy Presets (backward compat)
    static func loadPresets() -> [WidgetPreset] {
        guard let defaults = userDefaults,
              let json = defaults.string(forKey: presetsKey),
              let data = json.data(using: .utf8) else { return [] }
        return (try? JSONDecoder().decode([WidgetPreset].self, from: data)) ?? []
    }

    // MARK: - Logs

    static func saveLog(text: String, suggestedType: String? = nil, bucketId: String? = nil) {
        guard let defaults = userDefaults else { return }

        let now = Date()
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let timestamp = isoFormatter.string(from: now)
        let dateKey = formatDateKey(now)
        let logId = "\(Int(now.timeIntervalSince1970 * 1000))-\(Int.random(in: 0...999))"

        let newLog = LogEntry(
            id: logId,
            timestamp: timestamp,
            text: text.isEmpty ? nil : text,
            bucketId: bucketId,
            dateKey: dateKey,
            status: "unprocessed",
            suggestedType: suggestedType,
            source: "widget"
        )

        var logs = loadLogs()
        logs.append(newLog)
        if logs.count > 1000 { logs = Array(logs.suffix(1000)) }

        if let encoded = try? JSONEncoder().encode(logs),
           let jsonString = String(data: encoded, encoding: .utf8) {
            defaults.set(jsonString, forKey: logsKey)
            defaults.synchronize()
        }
    }

    static func loadLogs() -> [LogEntry] {
        guard let defaults = userDefaults,
              let json = defaults.string(forKey: logsKey),
              let data = json.data(using: .utf8) else { return [] }
        return (try? JSONDecoder().decode([LogEntry].self, from: data)) ?? []
    }

    static func getTodayLogCount() -> Int {
        let today = formatDateKey(Date())
        return loadLogs().filter { $0.dateKey == today }.count
    }

    static func getUnprocessedCount() -> Int {
        return loadLogs().filter { $0.status == "unprocessed" }.count
    }

    // MARK: - Helpers

    private static func formatDateKey(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}
