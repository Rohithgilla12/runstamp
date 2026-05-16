// Paper grain overlay — single SVG noise filter applied to a transparent rect.
// Adds the Polaroid / Risograph imperfection the brand vocabulary depends on.

import { colors } from "../theme";

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", opacity }}
    >
      <filter id="grain-filter">
        <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="7" stitchTiles="stitch" />
        <feColorMatrix
          values="0 0 0 0 0
                  0 0 0 0 0
                  0 0 0 0 0
                  0 0 0 0.65 0"
        />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-filter)" fill={colors.ink} />
    </svg>
  );
};
