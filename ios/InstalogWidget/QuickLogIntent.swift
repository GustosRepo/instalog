//
//  QuickLogIntent.swift
//  InstalogWidget
//
//  iOS 17+ AppIntent for instant logging from widget buttons
//

import AppIntents
import WidgetKit

@available(iOS 17.0, *)
struct QuickLogIntent: AppIntent {
    
    static var title: LocalizedStringResource = "Quick Log"
    static var description = IntentDescription("Log an entry instantly from your widget")
    
    // MARK: - Parameters
    
    @Parameter(title: "Log Text")
    var text: String
    
    @Parameter(title: "Preset ID")
    var presetId: String?
    
    @Parameter(title: "Bucket ID")
    var bucketId: String?
    
    // MARK: - Perform
    
    func perform() async throws -> some IntentResult {
        
        // 1. Save log entry to App Group
        SharedStore.saveLog(text: text, bucketId: bucketId)
        
        // 2. Reload all widget timelines to show updated count
        WidgetCenter.shared.reloadAllTimelines()
        
        // 3. Provide haptic feedback (if possible from widget context)
        // Note: Haptics from widgets are limited, but the action will feel instant
        
        // 4. Return success
        return .result()
    }
}

// MARK: - Widget Configuration

@available(iOS 17.0, *)
struct QuickLogButton: AppIntent {
    
    static var title: LocalizedStringResource = "Quick Log Button"
    
    @Parameter(title: "Preset")
    var preset: WidgetPresetEntity
    
    func perform() async throws -> some IntentResult {
        // Delegate to QuickLogIntent
        let intent = QuickLogIntent()
        intent.text = preset.text
        intent.presetId = preset.id
        return try await intent.perform()
    }
}

// MARK: - App Entity for Presets

@available(iOS 17.0, *)
struct WidgetPresetEntity: AppEntity {
    
    let id: String
    let label: String
    let text: String
    let icon: String
    
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
            .map { WidgetPresetEntity(id: $0.id, label: $0.label, text: $0.text, icon: $0.icon) }
    }
    
    func suggestedEntities() async throws -> [WidgetPresetEntity] {
        let presets = SharedStore.loadPresets()
        return presets.map { WidgetPresetEntity(id: $0.id, label: $0.label, text: $0.text, icon: $0.icon) }
    }
}
