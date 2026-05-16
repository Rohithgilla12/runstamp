// Stylised iPhone-ish frame — rounded rectangle with bezel + notch. Not a
// hardware-accurate phone (would feel mocky); just enough chrome to read
// as "we're inside the app" instead of a static design.

import { colors } from "../theme";

interface Props {
  width: number;
  height: number;
  children: React.ReactNode;
}

export const PhoneFrame: React.FC<Props> = ({ width, height, children }) => {
  const radius = Math.min(width, height) * 0.07;
  const bezel = Math.max(8, Math.min(width, height) * 0.018);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: radius,
        backgroundColor: colors.ink,
        padding: bezel,
        boxShadow:
          "0 30px 80px rgba(20,17,13,0.30), 0 6px 24px rgba(20,17,13,0.18)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: radius - bezel,
          overflow: "hidden",
          backgroundColor: colors.paper,
        }}
      >
        {/* Notch */}
        <div
          style={{
            position: "absolute",
            top: 6,
            left: "50%",
            transform: "translateX(-50%)",
            width: Math.min(width * 0.32, 220),
            height: bezel * 1.8,
            backgroundColor: colors.ink,
            borderRadius: bezel * 1.4,
            zIndex: 10,
          }}
        />
        {children}
      </div>
    </div>
  );
};
