// Lock-screen / Apple Watch Smart Stack accessory widgets.
//
//   accessoryInline      — week distance on the always-on / standby line
//   accessoryCircular    — week runs in a solar ring (Watch-friendly)
//   accessoryRectangular — distance + latest run title for Lock / Watch

import SwiftUI
import WidgetKit

private struct CircularWeek: View {
    let snapshot: WidgetSnapshot

    // Soft weekly target of 5 runs — visual only, not a guilt streak.
    private var progress: Double {
        min(1.0, Double(snapshot.weekRuns) / 5.0)
    }

    var body: some View {
        ZStack {
            Circle().stroke(WidgetTheme.hairline2, lineWidth: 2)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                .foregroundColor(WidgetTheme.solar)
                .rotationEffect(.degrees(-90))
            VStack(spacing: 0) {
                Text("\(snapshot.weekRuns)")
                    .font(WidgetTheme.serif(size: 16))
                Text("runs")
                    .font(.system(size: 8))
                    .opacity(0.7)
            }
        }
    }
}

private struct RectangularAccessory: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("RUNSTAMP")
                .font(.system(size: 9, weight: .medium))
                .tracking(0.6)
            Text("\(snapshot.weekDistanceLabel) \(snapshot.units)")
                .font(.system(size: 14, weight: .medium))
                .lineLimit(1)
            if let run = snapshot.latestRun {
                Text(run.title)
                    .font(.system(size: 11))
                    .opacity(0.7)
                    .lineLimit(1)
            } else if snapshot.stampCount > 0 {
                Text("\(snapshot.stampCount) stamps")
                    .font(.system(size: 11))
                    .opacity(0.7)
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct LockWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: SnapshotEntry

    var body: some View {
        switch family {
        case .accessoryInline:
            Text("Runstamp — \(entry.snapshot.weekDistanceLabel) \(entry.snapshot.units)")
        case .accessoryCircular:
            CircularWeek(snapshot: entry.snapshot)
        case .accessoryRectangular:
            RectangularAccessory(snapshot: entry.snapshot)
        default:
            EmptyView()
        }
    }
}

struct LockWidget: Widget {
    let kind: String = "RunstampLockWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RunstampTimelineProvider()) { entry in
            LockWidgetEntryView(entry: entry).widgetURL(URL(string: "runstamp://"))
        }
        .configurationDisplayName("Runstamp")
        .description("Week distance on Lock Screen and Apple Watch.")
        .supportedFamilies([.accessoryCircular, .accessoryInline, .accessoryRectangular])
    }
}
