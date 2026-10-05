import type { ReactNode } from "react";

/** Activity-style progress ring. `value` is 0..1; values above 1 draw a second lap. */
export function Ring({
  value,
  size = 88,
  width = 9,
  color = "var(--accent)",
  track = "var(--track)",
  children,
}: {
  value: number;
  size?: number;
  width?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - width) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, value);
  const lap1 = Math.min(1, v);
  const lap2 = Math.min(1, Math.max(0, v - 1));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={width} />
        <circle
          className="ring-arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray={`${c * lap1} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {lap2 > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeOpacity={0.55}
            strokeWidth={width}
            strokeLinecap="round"
            strokeDasharray={`${c * lap2} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      {children && <div className="ring-label">{children}</div>}
    </div>
  );
}
