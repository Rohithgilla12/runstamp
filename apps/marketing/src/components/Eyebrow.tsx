import { colors, fonts } from "../theme";

interface Props {
  children: React.ReactNode;
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}

export const Eyebrow: React.FC<Props> = ({ children, color = colors.ink3, size = 18, style }) => {
  return (
    <span
      style={{
        fontFamily: fonts.mono,
        fontSize: size,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color,
        ...style,
      }}
    >
      {children}
    </span>
  );
};
