// Mirrors `src/design/theme.ts` light palette. Widgets cannot import the
// JS theme, so values are duplicated here — keep in lockstep.

import SwiftUI

enum WidgetTheme {
    static let ink = Color(red: 0x14 / 255, green: 0x11 / 255, blue: 0x0d / 255)
    static let ink2 = Color(red: 0x3a / 255, green: 0x34 / 255, blue: 0x2b / 255)
    static let ink3 = Color(red: 0x75 / 255, green: 0x69 / 255, blue: 0x5a / 255)

    static let paper = Color(red: 0xf3 / 255, green: 0xed / 255, blue: 0xe2 / 255)
    static let paper2 = Color(red: 0xeb / 255, green: 0xe3 / 255, blue: 0xd3 / 255)

    static let solar = Color(red: 0xe8 / 255, green: 0x5d / 255, blue: 0x2f / 255)
    static let moss = Color(red: 0x4a / 255, green: 0x6b / 255, blue: 0x3a / 255)
    static let mossLight = Color(red: 0x7a / 255, green: 0x8a / 255, blue: 0x6f / 255)

    static let hairline = Color.black.opacity(0.08)
    static let hairline2 = Color.black.opacity(0.16)

    // Instrument Serif isn't bundled into the extension; Iowan Old Style is
    // on-device and carries the same quiet display weight.
    static func serif(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        Font.custom("Iowan Old Style", size: size).weight(weight)
    }

    static func mono(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        Font.system(size: size, weight: weight, design: .monospaced)
    }
}
