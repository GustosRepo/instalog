//
//  InstalogWidget.swift
//  InstalogWidget
//
//  iOS Widget for Instalog with dynamic preset buttons
//

import WidgetKit
import SwiftUI

// MARK: - Widget Localization

struct WidgetStrings {
    let lang: String

    init() {
        lang = SharedStore.loadLanguage()
    }

    var quickLog: String          { loc(en: "Quick Log",          es: "Registro Rápido",    th: "บันทึกด่วน") }
    var brainDump: String         { loc(en: "Brain Dump",         es: "Volcado Mental",     th: "ระบายความคิด") }
    var newBadge: String          { loc(en: "new",                es: "nuevo",              th: "ใหม่") }
    var todayBadge: String        { loc(en: "today",              es: "hoy",                th: "วันนี้") }
    var unprocessed: String       { loc(en: "unprocessed",        es: "sin procesar",       th: "ยังไม่จัดการ") }
    var nothingCapturedYet: String{ loc(en: "Nothing captured yet",es: "Nada capturado aún",th: "ยังไม่ได้บันทึก") }
    var capturedToday: String     { loc(en: "captured today",     es: "capturado hoy",      th: "บันทึกวันนี้") }
    var instalog: String          { "Instalog" }
    var tasksWidget: String       { loc(en: "Tasks Widget",       es: "Widget de Tareas",   th: "วิดเจ็ตงาน") }
    var upgradeToPro: String      { loc(en: "Upgrade to Pro",     es: "Mejora a Pro",       th: "อัปเกรดเป็น Pro") }
    var tasks: String             { loc(en: "Tasks",              es: "Tareas",             th: "งาน") }
    var left: String              { loc(en: "left",               es: "restantes",          th: "เหลือ") }
    var allClear: String          { loc(en: "All clear!",         es: "¡Todo listo!",       th: "เสร็จหมดแล้ว!") }
    var addTask: String           { loc(en: "Add task",           es: "Agregar tarea",      th: "เพิ่มงาน") }

    // Action type labels
    func labelForType(_ type: String, fallback: String) -> String {
        switch type {
        case "thought":   return loc(en: "Thought",   es: "Pensamiento", th: "ความคิด")
        case "task":      return loc(en: "Task",      es: "Tarea",       th: "งาน")
        case "idea":      return loc(en: "Idea",      es: "Idea",        th: "ไอเดีย")
        case "mood":      return loc(en: "Mood",      es: "Estado",      th: "อารมณ์")
        case "brainDump": return loc(en: "Brain Dump",es: "Volcado",     th: "ระบาย")
        default:          return fallback
        }
    }

    private func loc(en: String, es: String, th: String) -> String {
        switch lang {
        case "es": return es
        case "th": return th
        default:   return en
        }
    }
}

// MARK: - Timeline Provider

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), widgetConfig: nil, unprocessedCount: 0, todayCount: 0)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let config = SharedStore.loadWidgetConfig()
        let unprocessedCount = SharedStore.getUnprocessedCount()
        let todayCount = SharedStore.getTodayLogCount()
        let entry = SimpleEntry(date: Date(), widgetConfig: config, unprocessedCount: unprocessedCount, todayCount: todayCount)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let config = SharedStore.loadWidgetConfig()
        let unprocessedCount = SharedStore.getUnprocessedCount()
        let todayCount = SharedStore.getTodayLogCount()
        let now = Date()
        let entry = SimpleEntry(date: now, widgetConfig: config, unprocessedCount: unprocessedCount, todayCount: todayCount)
        
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
    let widgetConfig: WidgetConfigState?
    let unprocessedCount: Int
    let todayCount: Int
}

// MARK: - Widget View

struct InstalogWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family
    let s = WidgetStrings()
    
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
        case .systemLarge:
            largeWidget
        case .systemExtraLarge:
            extraLargeWidget
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
    
    // MARK: - Action Color & Deep Link Helpers

    private func actionColor(_ type: String) -> Color {
        switch type {
        case "task":      return Color(red: 110/255, green: 242/255, blue: 168/255)
        case "idea":      return Color(red: 242/255, green: 224/255, blue: 110/255)
        case "mood":      return Color(red: 242/255, green: 155/255, blue: 110/255)
        case "brainDump": return Color(red: 110/255, green: 224/255, blue: 242/255)
        default:          return accentColor
        }
    }

    private func deepLinkURL(for action: WidgetActionConfig) -> URL {
        switch action.type {
        case "brainDump": return URL(string: "instalog://braindump")!
        case "mood":      return URL(string: "instalog://mood")!
        case "task":      return URL(string: "instalog://tasks")!
        case "thought":   return URL(string: "instalog://thoughts")!
        case "idea":      return URL(string: "instalog://ideas")!
        case "note":      return URL(string: "instalog://notes")!
        default:          return URL(string: "instalog://capture?type=\(action.type)")!
        }
    }

    @ViewBuilder
    private func actionButtonContent(label: String, icon: String, color: Color) -> some View {
        let glow = color.opacity(0.35)
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(glow)
                    .frame(width: 54, height: 54)
                    .blur(radius: 10)
                Circle()
                    .fill(LinearGradient(
                        colors: [color, color.opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 42, height: 42)
                Image(systemName: icon)
                    .font(.system(size: 19, weight: .medium))
                    .foregroundColor(.white)
            }
            Text(label)
                .font(.system(size: 8, weight: .semibold))
                .foregroundColor(textColor)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
    }

    @ViewBuilder
    private func actionButton(for action: WidgetActionConfig) -> some View {
        let color = actionColor(action.type)
        Link(destination: deepLinkURL(for: action)) {
            actionButtonContent(label: s.labelForType(action.type, fallback: action.label), icon: action.icon, color: color)
        }
    }

    // MARK: - Small Widget (Single Button)

    private var smallWidget: some View {
        let config = entry.widgetConfig
        let firstAction = config?.actions.first
        let showCount = config?.showUnprocessedCount ?? true

        return VStack(spacing: 0) {
            // Count badge top-right, clear of system app icon top-left
            HStack {
                Spacer()
                if showCount && entry.unprocessedCount > 0 {
                    Text("\(entry.unprocessedCount) \(s.newBadge)")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(accentColor)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(accentColor.opacity(0.15))
                        .cornerRadius(5)
                } else if showCount {
                    Text("\(entry.todayCount) \(s.todayBadge)")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(secondaryTextColor)
                }
            }

            Spacer()

            if let action = firstAction {
                actionButton(for: action)
            } else {
                Link(destination: URL(string: "instalog://capture")!) {
                    actionButtonContent(label: s.quickLog, icon: "square.and.pencil", color: accentColor)
                }
            }

            Spacer()
        }
        .padding(12)
    }

    // MARK: - Medium Widget (Up to 4 Actions)

    private var mediumWidget: some View {
        let config = entry.widgetConfig
        let isPro = SharedStore.isPro()
        // Free users only get 1 action; pro users get up to 4
        let actions = isPro ? Array((config?.actions ?? []).prefix(4)) : Array((config?.actions ?? []).prefix(1))
        let showCount = config?.showUnprocessedCount ?? true
        let isFourAction = actions.count == 4

        return ZStack(alignment: .bottomLeading) {
            // Brain mascot — tuck it lower/left so it stops competing with the header
            Image("logonobg")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 78, height: 78)
                .opacity(0.18)
                .offset(x: -10, y: 12)

            VStack(alignment: .leading, spacing: 0) {
                // Header row
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(s.instalog)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(textColor)

                        Text(entry.todayCount == 1 ? "1 \(s.capturedToday)" : "\(entry.todayCount) \(s.capturedToday)")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(secondaryTextColor)
                    }

                    Spacer()

                    if showCount && entry.unprocessedCount > 0 {
                        Text("\(entry.unprocessedCount) \(s.unprocessed)")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundColor(accentColor)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(accentColor.opacity(0.15))
                            .cornerRadius(5)
                    }
                }

                Spacer(minLength: 18)

                // Action buttons
                if actions.isEmpty {
                    HStack {
                        Spacer()
                        Link(destination: URL(string: "instalog://log")!) {
                            actionButtonContent(label: s.brainDump, icon: "square.and.pencil", color: accentColor)
                        }
                        Spacer()
                    }
                } else if !isFourAction {
                    HStack(spacing: 24) {
                        Spacer()
                        ForEach(actions) { action in
                            actionButton(for: action)
                        }
                        Spacer()
                    }
                } else {
                    // 2×2 grid — slightly tighter and centered with more breathing room above
                    let row1 = Array(actions.prefix(2))
                    let row2 = Array(actions.suffix(2))
                    VStack(spacing: 10) {
                        HStack(spacing: 26) {
                            ForEach(row1) { action in compactActionButton(for: action) }
                        }
                        HStack(spacing: 26) {
                            ForEach(row2) { action in compactActionButton(for: action) }
                        }
                    }
                    .frame(maxWidth: .infinity)
                }

                Spacer(minLength: 8)
            }
            .padding(.horizontal, 14)
            .padding(.top, 14)
            .padding(.bottom, 12)
        }
    }

    @ViewBuilder
    private func compactActionButton(for action: WidgetActionConfig) -> some View {
        let color = actionColor(action.type)
        Link(destination: deepLinkURL(for: action)) {
            compactButtonContent(label: s.labelForType(action.type, fallback: action.label), icon: action.icon, color: color)
        }
    }

    @ViewBuilder
    private func compactButtonContent(label: String, icon: String, color: Color) -> some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.25))
                    .frame(width: 42, height: 42)
                    .blur(radius: 6)
                Circle()
                    .fill(LinearGradient(
                        colors: [color, color.opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 34, height: 34)
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)
            }
            Text(label)
                .font(.system(size: 8, weight: .semibold))
                .foregroundColor(textColor)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
        }
    }
    
    // MARK: - Large Widget (Summary + Actions)

    private var largeWidget: some View {
        let config = entry.widgetConfig
        let isPro = SharedStore.isPro()
        let actions = isPro ? Array((config?.actions ?? []).prefix(4)) : Array((config?.actions ?? []).prefix(1))
        let showCount = config?.showUnprocessedCount ?? true

        return ZStack(alignment: .bottomLeading) {
            // Brain mascot watermark — smaller and lower so it doesn't fight the action row
            Image("logonobg")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 86, height: 86)
                .opacity(0.14)
                .offset(x: -10, y: 12)

            VStack(alignment: .leading, spacing: 0) {
                // Header with counts
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(s.instalog)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(textColor)

                        Text(entry.todayCount == 1 ? "1 \(s.capturedToday)" : "\(entry.todayCount) \(s.capturedToday)")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(secondaryTextColor)
                    }

                    Spacer()

                    if showCount && entry.unprocessedCount > 0 {
                        Text("\(entry.unprocessedCount) \(s.unprocessed)")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundColor(accentColor)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(accentColor.opacity(0.15))
                            .cornerRadius(5)
                    }
                }

                Spacer(minLength: 18)

                // Action buttons — tighter spacing so 4 actions fit cleanly in the square large widget
                HStack(spacing: 18) {
                    Spacer(minLength: 0)
                    if actions.isEmpty {
                        Link(destination: URL(string: "instalog://capture")!) {
                            largeActionContent(label: s.quickLog, icon: "square.and.pencil", color: accentColor)
                        }
                    } else {
                        ForEach(actions) { action in
                            Link(destination: deepLinkURL(for: action)) {
                                largeActionContent(label: s.labelForType(action.type, fallback: action.label), icon: action.icon, color: actionColor(action.type))
                            }
                        }
                    }
                    Spacer(minLength: 0)
                }

                Spacer(minLength: 6)
            }
            .padding(.horizontal, 14)
            .padding(.top, 14)
            .padding(.bottom, 12)
        }
    }

    @ViewBuilder
    private func largeActionContent(label: String, icon: String, color: Color) -> some View {
        let glow = color.opacity(0.32)
        VStack(spacing: 5) {
            ZStack {
                Circle()
                    .fill(glow)
                    .frame(width: 56, height: 56)
                    .blur(radius: 10)
                Circle()
                    .fill(LinearGradient(
                        colors: [color, color.opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 42, height: 42)
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(.white)
            }
            Text(label)
                .font(.system(size: 8, weight: .semibold))
                .foregroundColor(textColor)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
    }

    private func extraLargeActionContent(label: String, icon: String, color: Color) -> some View {
        let glow = color.opacity(0.35)
        return VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(glow)
                    .frame(width: 82, height: 82)
                    .blur(radius: 14)
                Circle()
                    .fill(LinearGradient(
                        colors: [color, color.opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 66, height: 66)
                Image(systemName: icon)
                    .font(.system(size: 28, weight: .medium))
                    .foregroundColor(.white)
            }
            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(textColor)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
    }

    // MARK: - Extra Large Widget (iPad only — wide)

    private var extraLargeWidget: some View {
        let config = entry.widgetConfig
        let isPro = SharedStore.isPro()
        let actions = isPro ? Array((config?.actions ?? []).prefix(4)) : Array((config?.actions ?? []).prefix(1))
        let showCount = config?.showUnprocessedCount ?? true

        return HStack(spacing: 0) {
            // Left side — branding + stats
            ZStack(alignment: .bottomLeading) {
                // Brain mascot watermark
                Image("logonobg")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 120, height: 120)
                    .opacity(0.18)
                    .offset(x: -10, y: 10)

                VStack(alignment: .leading, spacing: 0) {
                    Text(s.instalog)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(textColor)

                    Spacer()

                    VStack(alignment: .leading, spacing: 6) {
                        if entry.todayCount > 0 {
                            HStack(alignment: .firstTextBaseline, spacing: 6) {
                                Text("\(entry.todayCount)")
                                    .font(.system(size: 44, weight: .bold))
                                    .foregroundColor(accentColor)
                                Text(s.capturedToday)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(secondaryTextColor)
                            }
                        }
                        if showCount && entry.unprocessedCount > 0 {
                            Text("\(entry.unprocessedCount) \(s.unprocessed)")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(accentColor.opacity(0.8))
                        }
                    }

                    Spacer()
                }
                .padding(8)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Divider
            Rectangle()
                .fill(Color.white.opacity(0.1))
                .frame(width: 1)
                .padding(.vertical, 8)

            // Right side — action buttons
            VStack {
                Spacer()
                if actions.isEmpty {
                    Link(destination: URL(string: "instalog://capture")!) {
                        extraLargeActionContent(label: s.quickLog, icon: "square.and.pencil", color: accentColor)
                    }
                } else {
                    HStack(spacing: 40) {
                        ForEach(actions) { action in
                            Link(destination: deepLinkURL(for: action)) {
                                extraLargeActionContent(label: s.labelForType(action.type, fallback: action.label), icon: action.icon, color: actionColor(action.type))
                            }
                        }
                    }
                }
                Spacer()
            }
            .padding(8)
            .frame(maxWidth: .infinity)
        }
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
                Text(s.nothingCapturedYet)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)
            } else if entry.todayCount == 1 {
                Text("1 \(s.capturedToday)")
                    .font(.system(size: 14, weight: .medium))
            } else {
                Text("\(entry.todayCount) \(s.capturedToday)")
                    .font(.system(size: 14, weight: .medium))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    @available(iOS 16.0, *)
    private var lockScreenInline: some View {
        if entry.todayCount == 0 {
            Text("\(s.instalog): \(s.nothingCapturedYet)")
        } else if entry.todayCount == 1 {
            Text("\(s.instalog): 1 \(s.capturedToday)")
        } else {
            Text("\(s.instalog): \(entry.todayCount) \(s.capturedToday)")
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
        .configurationDisplayName("Instalog")
        .description("Quick log buttons for instant logging")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .systemExtraLarge,
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

#Preview(as: .systemSmall) {
    InstalogWidget()
} timeline: {
    SimpleEntry(date: .now, widgetConfig: nil, unprocessedCount: 2, todayCount: 5)
}

#Preview(as: .systemMedium) {
    InstalogWidget()
} timeline: {
    SimpleEntry(date: .now, widgetConfig: nil, unprocessedCount: 2, todayCount: 5)
}

// MARK: - Task Widget

struct TaskEntry: TimelineEntry {
    let date: Date
    let tasks: [WidgetTask]
}

struct TaskProvider: TimelineProvider {
    func placeholder(in context: Context) -> TaskEntry {
        let sample = [
            WidgetTask(id: "1", text: "Morning standup", createdAt: "", dateKey: "", completedAt: nil, isRecurringTemplate: nil),
            WidgetTask(id: "2", text: "Review pull request", createdAt: "", dateKey: "", completedAt: nil, isRecurringTemplate: nil),
            WidgetTask(id: "3", text: "Send weekly update", createdAt: "", dateKey: "", completedAt: nil, isRecurringTemplate: nil),
        ]
        return TaskEntry(date: Date(), tasks: sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (TaskEntry) -> ()) {
        let tasks = SharedStore.loadTodayTasks()
        completion(TaskEntry(date: Date(), tasks: tasks))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TaskEntry>) -> ()) {
        let tasks = SharedStore.loadTodayTasks()
        let entry = TaskEntry(date: Date(), tasks: tasks)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

struct InstalogTaskWidgetView: View {
    var entry: TaskProvider.Entry
    let s = WidgetStrings()

    let textColor = Color.white
    let secondaryTextColor = Color.white.opacity(0.5)
    let accentColor = Color(red: 110/255, green: 242/255, blue: 168/255)

    var body: some View {
        if !SharedStore.isPro() {
            // Locked state for free users
            Link(destination: URL(string: "instalog://paywall")!) {
                VStack(spacing: 8) {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 22, weight: .medium))
                        .foregroundColor(Color(red: 130/255, green: 120/255, blue: 255/255))
                    Text(s.tasksWidget)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(textColor)
                    Text(s.upgradeToPro)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(Color(red: 130/255, green: 120/255, blue: 255/255))
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        } else {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(alignment: .center, spacing: 6) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(accentColor)
                Text(s.tasks)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(textColor)
                Spacer()
                if !entry.tasks.isEmpty {
                    Text("\(entry.tasks.count) \(s.left)")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(secondaryTextColor)
                }
            }
            .padding(.bottom, 8)

            if entry.tasks.isEmpty {
                Spacer()
                HStack {
                    Spacer()
                    VStack(spacing: 5) {
                        Image(systemName: "checkmark.circle")
                            .font(.system(size: 24, weight: .light))
                            .foregroundColor(secondaryTextColor)
                        Text(s.allClear)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(secondaryTextColor)
                    }
                    Spacer()
                }
                Spacer()
            } else {
                VStack(alignment: .leading, spacing: 7) {
                    ForEach(Array(entry.tasks.prefix(4))) { task in
                        taskRow(task: task)
                    }
                }
                Spacer(minLength: 0)
            }

            // Add task deep link at bottom
            HStack {
                Spacer()
                Link(destination: URL(string: "instalog://tasks")!) {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                            .font(.system(size: 9, weight: .semibold))
                        Text(s.addTask)
                            .font(.system(size: 9, weight: .semibold))
                    }
                    .foregroundColor(secondaryTextColor)
                }            }
        }
        .padding(14)
        } // end else (isPro)
    }

    @ViewBuilder
    private func taskRow(task: WidgetTask) -> some View {
        HStack(spacing: 8) {
            if #available(iOS 17.0, *) {
                let intent = makeCompleteIntent(for: task)
                Button(intent: intent) {
                    Image(systemName: "circle")
                        .font(.system(size: 17, weight: .light))
                        .foregroundColor(accentColor)
                }
                .buttonStyle(.plain)
            } else {
                Link(destination: URL(string: "instalog://tasks")!) {
                    Image(systemName: "circle")
                        .font(.system(size: 17, weight: .light))
                        .foregroundColor(accentColor)
                }
            }
            Text(task.text)
                .font(.system(size: 12, weight: .regular))
                .foregroundColor(textColor)
                .lineLimit(1)
            Spacer()
        }
    }

    @available(iOS 17.0, *)
    private func makeCompleteIntent(for task: WidgetTask) -> CompleteTaskIntent {
        var intent = CompleteTaskIntent()
        intent.taskId = task.id
        return intent
    }
}

struct InstalogTaskWidget: Widget {
    let kind: String = "InstalogTaskWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TaskProvider()) { entry in
            if #available(iOS 17.0, *) {
                InstalogTaskWidgetView(entry: entry)
                    .containerBackground(for: .widget) {
                        Color(red: 18/255, green: 18/255, blue: 20/255)
                    }
            } else {
                InstalogTaskWidgetView(entry: entry)
                    .background(Color(red: 18/255, green: 18/255, blue: 20/255))
            }
        }
        .configurationDisplayName("Instalog Tasks")
        .description("See and check off today's tasks from your home screen.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

#Preview(as: .systemMedium) {
    InstalogTaskWidget()
} timeline: {
    TaskEntry(date: .now, tasks: [
        WidgetTask(id: "1", text: "Morning standup", createdAt: "", dateKey: "", completedAt: nil, isRecurringTemplate: nil),
        WidgetTask(id: "2", text: "Review pull request", createdAt: "", dateKey: "", completedAt: nil, isRecurringTemplate: nil),
        WidgetTask(id: "3", text: "Send weekly update", createdAt: "", dateKey: "", completedAt: nil, isRecurringTemplate: nil),
    ])
}
