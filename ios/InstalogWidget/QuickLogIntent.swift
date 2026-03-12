//
//  QuickLogIntent.swift
//  InstalogWidget
//
//  AppIntents for quick capture from widget buttons.
//  Capture types save a log entry; navigation types deep-link into the app.
//

import AppIntents
import WidgetKit

// MARK: - Quick Capture Intent

@available(iOS 17.0, *)
struct QuickLogIntent: AppIntent {

    static var title: LocalizedStringResource = "Quick Capture"
    static var description = IntentDescription("Capture a thought, task, or idea from your widget")

    @Parameter(title: "Log Text")
    var text: String?

    @Parameter(title: "Action Type")
    var actionType: String?

    @Parameter(title: "Bucket ID")
    var bucketId: String?

    func perform() async throws -> some IntentResult {
        guard SharedStore.canCreateLog() else { return .result() }

        let type = actionType ?? "thought"

        // brainDump and mood are navigation types — handled by Link() in the widget view
        guard type != "brainDump" && type != "mood" else { return .result() }

        SharedStore.saveLog(
            text: text ?? "",
            suggestedType: type,
            bucketId: bucketId
        )

        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// MARK: - Widget Action Entity (new)

@available(iOS 17.0, *)
struct WidgetActionEntity: AppEntity {

    let id: String
    let label: String
    let icon: String
    let actionType: String
    let bucketId: String?

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Widget Action"

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(label)")
    }

    static var defaultQuery = WidgetActionQuery()
}

@available(iOS 17.0, *)
struct WidgetActionQuery: EntityQuery {

    func entities(for identifiers: [String]) async throws -> [WidgetActionEntity] {
        guard let config = SharedStore.loadWidgetConfig() else { return [] }
        return config.actions
            .filter { identifiers.contains($0.id) }
            .map { WidgetActionEntity(id: $0.id, label: $0.label, icon: $0.icon, actionType: $0.type, bucketId: $0.defaultBucketId) }
    }

    func suggestedEntities() async throws -> [WidgetActionEntity] {
        guard let config = SharedStore.loadWidgetConfig() else { return [] }
        return config.actions.map {
            WidgetActionEntity(id: $0.id, label: $0.label, icon: $0.icon, actionType: $0.type, bucketId: $0.defaultBucketId)
        }
    }
}

// MARK: - Legacy Widget Preset Entity (kept for backward compat)

@available(iOS 17.0, *)
struct WidgetPresetEntity: AppEntity {

    let id: String
    let label: String
    let text: String
    let icon: String
    let bucketId: String?

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Widget Preset"

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(label)")
    }

    static var defaultQuery = WidgetPresetQuery()
}

@available(iOS 17.0, *)
struct WidgetPresetQuery: EntityQuery {

    func entities(for identifiers: [WidgetPresetEntity.ID]) async throws -> [WidgetPresetEntity] {
        let presets = SharedStore.loadPresets()
        return presets
            .filter { identifiers.contains($0.id) }
            .map { WidgetPresetEntity(id: $0.id, label: $0.label, text: $0.text, icon: $0.icon, bucketId: $0.bucketId) }
    }

    func suggestedEntities() async throws -> [WidgetPresetEntity] {
        return SharedStore.loadPresets().map {
            WidgetPresetEntity(id: $0.id, label: $0.label, text: $0.text, icon: $0.icon, bucketId: $0.bucketId)
        }
    }
}

// MARK: - Complete Task Intent

@available(iOS 17.0, *)
struct CompleteTaskIntent: AppIntent {

    static var title: LocalizedStringResource = "Complete Task"
    static var description = IntentDescription("Mark a task as complete from the widget")

    @Parameter(title: "Task ID")
    var taskId: String

    func perform() async throws -> some IntentResult {
        SharedStore.completeTask(id: taskId)
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}
