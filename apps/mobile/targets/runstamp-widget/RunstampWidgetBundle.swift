// Widget bundle — entry point for the extension. WidgetKit picks this up
// via the `@main` annotation on the `WidgetBundle`.

import SwiftUI
import WidgetKit

@main
struct RunstampWidgetBundle: WidgetBundle {
    var body: some Widget {
        WeekWidget()
        LatestWidget()
        LockWidget()
    }
}
