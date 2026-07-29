// Latest-run widget — quiet post-run surface for the Home Screen.

import SwiftUI
import WidgetKit

private struct LatestSmallView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("LATEST")
                .font(.system(size: 10, weight: .medium))
                .tracking(0.8)
                .foregroundStyle(WidgetTheme.ink3)

            if let run = snapshot.latestRun {
                Text(run.distanceLabel)
                    .font(WidgetTheme.mono(size: 28, weight: .medium))
                    .foregroundStyle(WidgetTheme.ink)
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)
                Text(run.units)
                    .font(.system(size: 12))
                    .foregroundStyle(WidgetTheme.ink3)
                Spacer(minLength: 0)
                Text(run.title)
                    .font(.system(size: 12))
                    .foregroundStyle(WidgetTheme.ink2)
                    .lineLimit(2)
            } else {
                Text("No runs yet")
                    .font(WidgetTheme.serif(size: 16).italic())
                    .foregroundStyle(WidgetTheme.ink2)
                Spacer(minLength: 0)
                Text("Open Runstamp after your next one.")
                    .font(.system(size: 11))
                    .foregroundStyle(WidgetTheme.ink3)
                    .lineLimit(3)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "runstamp://"))
    }
}

private struct LatestMediumView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("LATEST RUN")
                .font(.system(size: 10, weight: .medium))
                .tracking(0.8)
                .foregroundStyle(WidgetTheme.ink3)

            if let run = snapshot.latestRun {
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(run.distanceLabel)
                            .font(WidgetTheme.mono(size: 34, weight: .medium))
                            .foregroundStyle(WidgetTheme.ink)
                        Text(run.units)
                            .font(.system(size: 13))
                            .foregroundStyle(WidgetTheme.ink3)
                    }
                    Spacer(minLength: 8)
                    Text(run.paceLabel)
                        .font(WidgetTheme.mono(size: 18, weight: .medium))
                        .foregroundStyle(WidgetTheme.solar)
                    Text("/\(run.units)")
                        .font(.system(size: 11))
                        .foregroundStyle(WidgetTheme.ink3)
                }

                Text(run.title)
                    .font(WidgetTheme.serif(size: 16).italic())
                    .foregroundStyle(WidgetTheme.ink)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    if !run.place.isEmpty {
                        Text(run.place)
                            .font(.system(size: 12))
                            .foregroundStyle(WidgetTheme.ink2)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    Text(run.dateLabel)
                        .font(WidgetTheme.mono(size: 11))
                        .foregroundStyle(WidgetTheme.ink3)
                }
            } else {
                Text("No runs yet.")
                    .font(WidgetTheme.serif(size: 18).italic())
                    .foregroundStyle(WidgetTheme.ink2)
                Text("Connect Apple Health or Strava, then open the app once.")
                    .font(.system(size: 12))
                    .foregroundStyle(WidgetTheme.ink3)
                    .lineLimit(3)
                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "runstamp://"))
    }
}

struct LatestWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: SnapshotEntry

    var body: some View {
        let content = Group {
            switch family {
            case .systemSmall:
                LatestSmallView(snapshot: entry.snapshot)
            default:
                LatestMediumView(snapshot: entry.snapshot)
            }
        }

        if #available(iOS 17.0, *) {
            content
                .padding(14)
                .containerBackground(WidgetTheme.paper, for: .widget)
        } else {
            content
                .padding(14)
                .background(WidgetTheme.paper)
        }
    }
}

struct LatestWidget: Widget {
    let kind: String = "RunstampLatestWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RunstampTimelineProvider()) { entry in
            LatestWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Latest run")
        .description("Distance, pace, and place from your most recent run.")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}
