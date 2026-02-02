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
    
    // Dark theme colors
    let backgroundColor = Color(red: 11/255, green: 13/255, blue: 16/255)
    let surfaceColor = Color(red: 20/255, green: 24/255, blue: 33/255)
    let textColor = Color(red: 237/255, green: 238/255, blue: 240/255)
    let secondaryTextColor = Color(red: 154/255, green: 160/255, blue: 166/255)
    let accentColor = Color(red: 110/255, green: 106/255, blue: 242/255)

    var body: some View {
        ZStack {
            backgroundColor.ignoresSafeArea()
            
            if family == .systemSmall {
                smallWidget
            } else {
                mediumWidget
            }
        }
    }
    
    // MARK: - Small Widget (Single Button)
    
    private var smallWidget: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Image("logonobg")
                    .resizable()
                    .frame(width: 18, height: 18)
                    .opacity(0.7)
                Text("Instalog")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(textColor.opacity(0.9))
                Spacer()
                HStack(spacing: 4) {
                    Circle()
                        .fill(accentColor.opacity(0.5))
                        .frame(width: 6, height: 6)
                    Text("\(entry.todayCount)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(secondaryTextColor)
                }
            }
            .padding(.bottom, 16)
            
            Spacer()
            
            // Show setup message if no presets configured
            if entry.presets.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 32, weight: .light))
                        .foregroundColor(secondaryTextColor.opacity(0.6))
                    
                    Text("Open app")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(textColor)
                    
                    Text("Configure in Settings")
                        .font(.system(size: 12))
                        .foregroundColor(secondaryTextColor)
                }
            }
            // First preset button
            else if let preset = entry.presets.first {
                if #available(iOS 17.0, *) {
                    Button(intent: createIntent(for: preset)) {
                        VStack(spacing: 12) {
                            ZStack {
                                Circle()
                                    .fill(accentColor.opacity(0.15))
                                    .frame(width: 56, height: 56)
                                
                                Image(systemName: preset.icon)
                                    .font(.system(size: 28, weight: .medium))
                                    .foregroundColor(accentColor)
                            }
                            
                            Text(preset.label)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(textColor)
                                .lineLimit(1)
                        }
                    }
                    .buttonStyle(.plain)
                } else {
                    // Fallback for iOS < 17: Open app
                    Link(destination: URL(string: "instalog://log")!) {
                        VStack(spacing: 12) {
                            ZStack {
                                Circle()
                                    .fill(accentColor.opacity(0.15))
                                    .frame(width: 56, height: 56)
                                
                                Image(systemName: preset.icon)
                                    .font(.system(size: 28, weight: .medium))
                                    .foregroundColor(accentColor)
                            }
                            
                            Text(preset.label)
                                .font(.system(size: 13, weight: .semibold))
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
            // Header
            HStack {
                Image("logonobg")
                    .resizable()
                    .frame(width: 20, height: 20)
                    .opacity(0.7)
                Text("Instalog")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(textColor.opacity(0.9))
                Spacer()
                HStack(spacing: 5) {
                    Circle()
                        .fill(accentColor.opacity(0.5))
                        .frame(width: 6, height: 6)
                    Text("\(entry.todayCount) today")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(secondaryTextColor)
                }
            }
            .padding(.bottom, 18)
            
            // Show setup message if no presets configured
            if entry.presets.isEmpty {
                Spacer()
                VStack(spacing: 14) {
                    ZStack {
                        Circle()
                            .fill(surfaceColor)
                            .frame(width: 56, height: 56)
                        
                        Image(systemName: "slider.horizontal.3")
                            .font(.system(size: 24, weight: .medium))
                            .foregroundColor(secondaryTextColor.opacity(0.7))
                    }
                    
                    VStack(spacing: 6) {
                        Text("Configure Quick-Log Buttons")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(textColor.opacity(0.95))
                        
                        Text("Open app → Settings → Widget")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(secondaryTextColor.opacity(0.7))
                    }
                }
                .frame(maxWidth: .infinity)
                Spacer()
            } else {
                // Preset buttons in a row
                HStack(spacing: 10) {
                    ForEach(entry.presets.prefix(3)) { preset in
                        presetButton(for: preset)
                    }
                }
            }
        }
        .padding(16)
    }
    
    // MARK: - Preset Button
    
    @ViewBuilder
    private func presetButton(for preset: WidgetPreset) -> some View {
        if #available(iOS 17.0, *) {
            Button(intent: createIntent(for: preset)) {
                VStack(spacing: 8) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(surfaceColor)
                            .frame(width: 44, height: 44)
                        
                        Image(systemName: preset.icon)
                            .font(.system(size: 22, weight: .medium))
                            .foregroundColor(accentColor)
                    }
                    
                    Text(preset.label)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(textColor.opacity(0.9))
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }
    
    // MARK: - Intent Creation
    
    @available(iOS 17.0, *)
    private func createIntent(for preset: WidgetPreset) -> QuickLogIntent {
        let intent = QuickLogIntent()
        intent.text = preset.text
        intent.presetId = preset.id
        intent.bucketId = preset.bucketId
        return intent
    }
}

// MARK: - Widget Configuration

struct InstalogWidget: Widget {
    let kind: String = "InstalogWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                InstalogWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                InstalogWidgetEntryView(entry: entry)
                    .padding()
                    .background(Color.black)
            }
        }
        .configurationDisplayName("Instalog")
        .description("Quick log buttons for instant logging")
        .supportedFamilies([.systemSmall, .systemMedium])
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
