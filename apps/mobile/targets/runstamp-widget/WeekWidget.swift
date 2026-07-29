// "This week" widget — mirrors the Home WeekLedger: one quiet distance
// number, run count, vs-last delta, and a Sun–Sat strip.

import SwiftUI
import WidgetKit

private struct WeekDots: View {
    let dots: [DayDot]

    var body: some View {
        HStack(spacing: 6) {
            ForEach(Array(dots.enumerated()), id: \.offset) { _, dot in
                dotView(for: dot.state)
            }
        }
    }

    @ViewBuilder
    private func dotView(for state: DayState) -> some View {
        switch state {
        case .pastRun:
            Circle().fill(WidgetTheme.solar)
                .frame(width: 8, height: 8)
        case .pastQuiet:
            Circle().stroke(WidgetTheme.hairline2, lineWidth: 0.5)
                .frame(width: 8, height: 8)
        case .today:
            Circle().fill(WidgetTheme.ink)
                .frame(width: 8, height: 8)
        case .future:
            Circle().fill(WidgetTheme.paper2)
                .frame(width: 8, height: 8)
        }
    }
}

private struct WeekSmallView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("THIS WEEK")
                .font(.system(size: 10, weight: .medium))
                .tracking(0.8)
                .foregroundStyle(WidgetTheme.ink3)

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(snapshot.weekDistanceLabel)
                    .font(WidgetTheme.mono(size: 28, weight: .medium))
                    .foregroundStyle(WidgetTheme.ink)
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)
                Text(snapshot.units)
                    .font(.system(size: 12))
                    .foregroundStyle(WidgetTheme.ink3)
            }

            Text("\(snapshot.weekRuns) runs")
                .font(WidgetTheme.mono(size: 11))
                .foregroundStyle(WidgetTheme.ink2)

            Spacer(minLength: 0)

            WeekDots(dots: snapshot.weekDots)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "runstamp://"))
    }
}

private struct WeekMediumView: View {
    let snapshot: WidgetSnapshot

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("THIS WEEK")
                    .font(.system(size: 10, weight: .medium))
                    .tracking(0.8)
                    .foregroundStyle(WidgetTheme.ink3)

                HStack(alignment: .firstTextBaseline, spacing: 5) {
                    Text(snapshot.weekDistanceLabel)
                        .font(WidgetTheme.mono(size: 36, weight: .medium))
                        .foregroundStyle(WidgetTheme.ink)
                    Text(snapshot.units)
                        .font(.system(size: 13))
                        .foregroundStyle(WidgetTheme.ink3)
                }

                HStack(spacing: 10) {
                    Text("\(snapshot.weekRuns) runs")
                        .font(WidgetTheme.mono(size: 11))
                        .foregroundStyle(WidgetTheme.ink2)
                    Text(snapshot.vsLastDistanceLabel)
                        .font(WidgetTheme.mono(size: 11))
                        .foregroundStyle(
                            snapshot.vsLastDistanceLabel.hasPrefix("−")
                                ? WidgetTheme.ink3
                                : WidgetTheme.moss
                        )
                    Text("vs last")
                        .font(.system(size: 11))
                        .foregroundStyle(WidgetTheme.ink3)
                }

                Spacer(minLength: 0)

                WeekDots(dots: snapshot.weekDots)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .trailing, spacing: 4) {
                Text("STAMPS")
                    .font(.system(size: 9, weight: .medium))
                    .tracking(0.8)
                    .foregroundStyle(WidgetTheme.ink3)
                Text("\(snapshot.stampCount)")
                    .font(WidgetTheme.serif(size: 28))
                    .foregroundStyle(WidgetTheme.solar)
                if let name = snapshot.lastStampName {
                    Text(name)
                        .font(.system(size: 11))
                        .foregroundStyle(WidgetTheme.ink2)
                        .multilineTextAlignment(.trailing)
                        .lineLimit(2)
                }
                Spacer(minLength: 0)
            }
            .frame(width: 100, alignment: .trailing)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "runstamp://"))
    }
}

struct WeekWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: SnapshotEntry

    var body: some View {
        let content = Group {
            switch family {
            case .systemSmall:
                WeekSmallView(snapshot: entry.snapshot)
            default:
                WeekMediumView(snapshot: entry.snapshot)
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

struct WeekWidget: Widget {
    let kind: String = "RunstampWeekWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RunstampTimelineProvider()) { entry in
            WeekWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("This week")
        .description("Distance, runs, and stamps for the current week.")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}
