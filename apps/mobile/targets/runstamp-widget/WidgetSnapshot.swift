// Shape of the JSON the RN side writes into the App Group's UserDefaults
// under `WidgetSnapshot.userDefaultsKey`. Mirrors
// `src/lib/widgets/types.ts` exactly — if either side changes, change both.
//
// Day order in `weekDots` is Sun..Sat (matches Home `computeWeekStats`).

import Foundation

enum DayState: String, Codable {
    case pastRun = "past-run"
    case pastQuiet = "past-quiet"
    case today
    case future
}

struct DayDot: Codable, Hashable {
    let weekday: String
    let state: DayState
}

struct LatestRun: Codable, Hashable {
    let id: String
    let title: String
    let place: String
    let distanceLabel: String
    let units: String
    let paceLabel: String
    let dateLabel: String
}

struct WidgetSnapshot: Codable, Hashable {
    static let userDefaultsKey = "runstamp.snapshot.v1"
    static let appGroup = "group.fun.gilla.runstamp"

    // Keep as String — JS `Date.toISOString()` includes fractional seconds
    // (`.000Z`), and Foundation's `.iso8601` Date strategy rejects those, which
    // used to make every real snapshot fall through to `.placeholder`.
    let updatedAt: String
    let units: String
    let weekDistanceLabel: String
    let weekRuns: Int
    let weekSeconds: Int
    let vsLastDistanceLabel: String
    let weekDots: [DayDot]
    let latestRun: LatestRun?
    let stampCount: Int
    let lastStampName: String?

    static let placeholder = WidgetSnapshot(
        updatedAt: "2026-05-13T12:00:00.000Z",
        units: "km",
        weekDistanceLabel: "42.20",
        weekRuns: 4,
        weekSeconds: 14_400,
        vsLastDistanceLabel: "+6.40",
        weekDots: [
            DayDot(weekday: "S", state: .pastQuiet),
            DayDot(weekday: "M", state: .pastRun),
            DayDot(weekday: "T", state: .pastRun),
            DayDot(weekday: "W", state: .pastQuiet),
            DayDot(weekday: "T", state: .today),
            DayDot(weekday: "F", state: .future),
            DayDot(weekday: "S", state: .future),
        ],
        latestRun: LatestRun(
            id: "1",
            title: "Evening loop",
            place: "Austin",
            distanceLabel: "10.05",
            units: "km",
            paceLabel: "5:12",
            dateLabel: "Wed · May 13"
        ),
        stampCount: 12,
        lastStampName: "First 10K"
    )

    static func load() -> WidgetSnapshot {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let raw = defaults.string(forKey: userDefaultsKey),
            let data = raw.data(using: .utf8)
        else {
            return .placeholder
        }
        return (try? JSONDecoder().decode(WidgetSnapshot.self, from: data)) ?? .placeholder
    }
}
