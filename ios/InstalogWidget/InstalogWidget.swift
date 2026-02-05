//
//  InstalogWidget.swift
//  InstalogWidget
//
//  iOS Widget for Instalog with dynamic preset buttons
//

import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), presets: [], todayCount: 0)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let presets = SharedStore.loadPresets()
        let todayCount = SharedStore.getTodayLogCount()
        let entry = SimpleEntry(date: Date(), presets: presets, todayCount: todayCount)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let presets = SharedStore.loadPresets()
        let todayCount = SharedStore.getTodayLogCount()
        let entry = SimpleEntry(date: Date(), presets: presets, todayCount: todayCount)
        
        // Refresh every hour
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Entry

struct SimpleEntry: TimelineEntry {
    let date: Date
    let presets: [WidgetPreset]
    let todayCount: Int
}

// MARK: - Widget View

struct InstalogWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family
    
    // Minimal dark theme - single background
    let backgroundColor = Color(red: 18/255, green: 18/255, blue: 20/255)
    let textColor = Color.white
    let secondaryTextColor = Color.white.opacity(0.5)
    let accentColor = Color(red: 130/255, green: 120/255, blue: 255/255)
    let accentGlow = Color(red: 130/255, green: 120/255, blue: 255/255).opacity(0.4)

    var body: some View {
        switch family {
        case .systemSmall:
            smallWidget
        case .systemMedium:
            mediumWidget
        case .accessoryCircular:
            lockScreenCircular
        case .accessoryRectangular:
            lockScreenRectangular
        case .accessoryInline:
            lockScreenInline
        default:
            mediumWidget
        }
    }
    
    // MARK: - Small Widget (Single Button)
    
    private var smallWidget: some View {
        VStack(spacing: 0) {
            // Minimal header
            HStack {
                Text("Instalog")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(secondaryTextColor)
                Spacer()
                HStack(spacing: 4) {
                    Circle()
                        .fill(accentColor)
                        .frame(width: 6, height: 6)
                    Text("\(entry.todayCount) today")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(secondaryTextColor)
                }
            }
            
            Spacer()
            
            // Show default Quick Log button if no presets configured
            if entry.presets.isEmpty {
                Link(destination: URL(string: "instalog://log")!) {
                    VStack(spacing: 10) {
                        // Glowing button
                        ZStack {
                            // Glow layer
                            Circle()
                                .fill(accentGlow)
                                .frame(width: 72, height: 72)
                                .blur(radius: 20)
                            
                            // Main button
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [accentColor, accentColor.opacity(0.8)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 56, height: 56)
                            
                            Image(systemName: "plus")
                                .font(.system(size: 26, weight: .semibold))
                                .foregroundColor(.white)
                        }
                        
                        Text("Quick Log")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(textColor)
                    }
                }
            }
            // First preset button
            else if let preset = entry.presets.first {
                if #available(iOS 17.0, *) {
                    Button(intent: createIntent(for: preset)) {
                        VStack(spacing: 10) {
                            // Glowing button
                            ZStack {
                                // Glow layer
                                Circle()
                                    .fill(accentGlow)
                                    .frame(width: 72, height: 72)
                                    .blur(radius: 20)
                                
                                // Main button
                                Circle()
                                    .fill(
                                        LinearGradient(
                                            colors: [accentColor, accentColor.opacity(0.8)],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .frame(width: 56, height: 56)
                                
                                Image(systemName: preset.icon)
                                    .font(.system(size: 26, weight: .medium))
                                    .foregroundColor(.white)
                            }
                            
                            Text(preset.label)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(textColor)
                                .lineLimit(1)
                        }
                    }
                    .buttonStyle(.plain)
                } else {
                    // Fallback for iOS < 17
                    Link(destination: URL(string: "instalog://log")!) {
                        VStack(spacing: 10) {
                            ZStack {
                                Circle()
                                    .fill(accentGlow)
                                    .frame(width: 72, height: 72)
                                    .blur(radius: 20)
                                
                                Circle()
                                    .fill(
                                        LinearGradient(
                                            colors: [accentColor, accentColor.opacity(0.8)],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .frame(width: 56, height: 56)
                                
                                Image(systemName: preset.icon)
                                    .font(.system(size: 26, weight: .medium))
                                    .foregroundColor(.white)
                            }
                            
                            Text(preset.label)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(textColor)
                                .lineLimit(1)
                        }
                    }
                }
            }
            
            Spacer()
        }
        .padding(16)
    }
    
    // MARK: - Medium Widget (Up to 3 Buttons)
    
    private var mediumWidget: some View {
        VStack(spacing: 0) {
            // Minimal header
            HStack {
                Text("Instalog")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(secondaryTextColor)
                Spacer()
                HStack(spacing: 4) {
                    Circle()
                        .fill(accentColor)
                        .frame(width: 6, height: 6)
                    Text("\(entry.todayCount) today")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(secondaryTextColor)
                }
            }
            
            Spacer()
            
            // Show default Quick Log button if no presets configured
            if entry.presets.isEmpty {
                Link(destination: URL(string: "instalog://log")!) {
                    VStack(spacing: 12) {
                        // Glowing button
                        ZStack {
                            Circle()
                                .fill(accentGlow)
                                .frame(width: 88, height: 88)
                                .blur(radius: 25)
                            
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [accentColor, accentColor.opacity(0.8)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 64, height: 64)
                            
                            Image(systemName: "plus")
                                .font(.system(size: 28, weight: .semibold))
                                .foregroundColor(.white)
                        }
                        
                        Text("Quick Log")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(textColor)
                    }
                }
            } else {
                // Preset buttons in a row
                HStack(spacing: 24) {
                    ForEach(entry.presets.prefix(3)) { preset in
                        presetButton(for: preset)
                    }
                }
            }
            
            Spacer()
        }
        .padding(16)
    }
    
    // MARK: - Preset Button
    
    @ViewBuilder
    private func presetButton(for preset: WidgetPreset) -> some View {
        if #available(iOS 17.0, *) {
            Button(intent: createIntent(for: preset)) {
                VStack(spacing: 8) {
                    // Glowing icon button
                    ZStack {
                        Circle()
                            .fill(accentGlow)
                            .frame(width: 64, height: 64)
                            .blur(radius: 16)
                        
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [accentColor, accentColor.opacity(0.8)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 48, height: 48)
                        
                        Image(systemName: preset.icon)
                            .font(.system(size: 22, weight: .medium))
                            .foregroundColor(.white)
                    }
                    
                    Text(preset.label)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(textColor)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
            }
            .buttonStyle(.plain)
        }
    }
    
    // MARK: - Intent Creation
    
    @available(iOS 17.0, *)
    private func createIntent(for preset: WidgetPreset) -> QuickLogIntent {
        let intent = QuickLogIntent()
        // Use label as text if log text is empty
        intent.text = preset.text.isEmpty ? preset.label : preset.text
        intent.presetId = preset.id
        intent.bucketId = preset.bucketId
        return intent
    }
    
    // MARK: - Lock Screen Widgets
    
    @available(iOS 16.0, *)
    private var lockScreenCircular: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 2) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 18, weight: .medium))
                Text("\(entry.todayCount)")
                    .font(.system(size: 16, weight: .bold))
            }
        }
    }
    
    @available(iOS 16.0, *)
    private var lockScreenRectangular: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 16, weight: .medium))
                Text("Instalog")
                    .font(.system(size: 14, weight: .semibold))
            }
            
            if entry.todayCount == 0 {
                Text("No logs yet today")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)
            } else if entry.todayCount == 1 {
                Text("1 log today")
                    .font(.system(size: 14, weight: .medium))
            } else {
                Text("\(entry.todayCount) logs today")
                    .font(.system(size: 14, weight: .medium))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    @available(iOS 16.0, *)
    private var lockScreenInline: some View {
        if entry.todayCount == 0 {
            Text("Instalog: No logs")
        } else if entry.todayCount == 1 {
            Text("Instalog: 1 log")
        } else {
            Text("Instalog: \(entry.todayCount) logs")
        }
    }
}

// MARK: - Widget Configuration

struct InstalogWidget: Widget {
    let kind: String = "InstalogWidget"
    
    // Minimal dark background
    static let backgroundColor = Color(red: 18/255, green: 18/255, blue: 20/255)

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                InstalogWidgetEntryView(entry: entry)
                    .containerBackground(for: .widget) {
                        Color(red: 18/255, green: 18/255, blue: 20/255)
                    }
            } else {
                InstalogWidgetEntryView(entry: entry)
                    .background(Color(red: 18/255, green: 18/255, blue: 20/255))
            }
        }
        .contentMarginsDisabled()
        .configurationDisplayName("Instalog")
        .description("Quick log buttons for instant logging")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

#Preview(as: .systemSmall) {
    InstalogWidget()
} timeline: {
    SimpleEntry(date: .now, presets: [], todayCount: 5)
}

#Preview(as: .systemMedium) {
    InstalogWidget()
} timeline: {
    SimpleEntry(date: .now, presets: [], todayCount: 5)
}
