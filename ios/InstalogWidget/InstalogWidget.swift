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
        let now = Date()
        let entry = SimpleEntry(date: now, presets: presets, todayCount: todayCount)
        
        // Calculate next midnight to refresh the count
        let calendar = Calendar.current
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: now)!
        let midnight = calendar.startOfDay(for: tomorrow)
        
        // Also refresh every 15 minutes to keep count updated
        let fifteenMinutes = calendar.date(byAdding: .minute, value: 15, to: now)!
        
        // Use whichever comes first
        let nextUpdate = min(midnight, fifteenMinutes)
        
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
        VStack(spacing: 2) {
            Text("Instalog")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(secondaryTextColor)
            
            Text("\(entry.todayCount)")
                .font(.system(size: 44, weight: .bold, design: .rounded))
                .foregroundColor(textColor)
            
            Text("logs today")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(secondaryTextColor)
            
            Spacer().frame(height: 8)
            
            // Button
            if entry.presets.isEmpty {
                Link(destination: URL(string: "instalog://log")!) {
                    VStack(spacing: 4) {
                        Circle()
                            .fill(accentColor)
                            .shadow(color: accentGlow, radius: 8, x: 0, y: 2)
                            .frame(width: 44, height: 44)
                            .overlay(
                                Image(systemName: "plus")
                                    .font(.system(size: 20, weight: .semibold))
                                    .foregroundColor(.white)
                            )
                        Text("Quick Log")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(textColor)
                    }
                }
            } else if let preset = entry.presets.first {
                if #available(iOS 17.0, *) {
                    Button(intent: createIntent(for: preset)) {
                        VStack(spacing: 4) {
                            Circle()
                                .fill(accentColor)
                                .shadow(color: accentGlow, radius: 8, x: 0, y: 2)
                                .frame(width: 44, height: 44)
                                .overlay(
                                    Image(systemName: preset.icon)
                                        .font(.system(size: 18, weight: .medium))
                                        .foregroundColor(.white)
                                )
                            Text(preset.label)
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(textColor)
                                .lineLimit(1)
                        }
                    }
                    .buttonStyle(.plain)
                } else {
                    Link(destination: URL(string: "instalog://log")!) {
                        VStack(spacing: 4) {
                            Circle()
                                .fill(accentColor)
                                .shadow(color: accentGlow, radius: 8, x: 0, y: 2)
                                .frame(width: 44, height: 44)
                                .overlay(
                                    Image(systemName: preset.icon)
                                        .font(.system(size: 18, weight: .medium))
                                        .foregroundColor(.white)
                                )
                            Text(preset.label)
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(textColor)
                                .lineLimit(1)
                        }
                    }
                }
            }
        }
        .padding(12)
    }
    
    // MARK: - Medium Widget (Up to 3 Buttons)
    
    private var mediumWidget: some View {
        ZStack {
            // Main content
            VStack(spacing: 1) {
                Text("Instalog")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(secondaryTextColor)
                
                Text("\(entry.todayCount)")
                    .font(.system(size: 38, weight: .bold, design: .rounded))
                    .foregroundColor(textColor)
                
                Text("logs today")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(secondaryTextColor)
                
                Spacer().frame(height: 6)
                
                // Buttons
                if entry.presets.isEmpty {
                    Link(destination: URL(string: "instalog://log")!) {
                        VStack(spacing: 4) {
                            Circle()
                                .fill(accentColor)
                                .shadow(color: accentGlow, radius: 8, x: 0, y: 2)
                                .frame(width: 48, height: 48)
                                .overlay(
                                    Image(systemName: "plus")
                                        .font(.system(size: 20, weight: .semibold))
                                        .foregroundColor(.white)
                                )
                            Text("Quick Log")
                                .font(.system(size: 10, weight: .bold))
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
            }
            
            // Mascot in bottom-left corner
            VStack {
                Spacer()
                HStack {
                    Image("logonobg")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 175, height: 175)
                        .offset(x: -55, y: -50)
                    Spacer()
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 26)
        .padding(.bottom, 32)
    }
    
    // MARK: - Preset Button
    
    @ViewBuilder
    private func presetButton(for preset: WidgetPreset) -> some View {
        if #available(iOS 17.0, *) {
            Button(intent: createIntent(for: preset)) {
                VStack(spacing: 4) {
                    // Glowing icon button
                    ZStack {
                        Circle()
                            .fill(accentGlow)
                            .frame(width: 54, height: 54)
                            .blur(radius: 10)
                        
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [accentColor, accentColor.opacity(0.8)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 42, height: 42)
                        
                        Image(systemName: preset.icon)
                            .font(.system(size: 19, weight: .medium))
                            .foregroundColor(.white)
                    }
                    
                    Text(preset.label)
                        .font(.system(size: 8, weight: .semibold))
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
