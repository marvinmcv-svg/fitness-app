/** SF Symbols–style line icons drawn on a 24px grid. */
const PATHS = {
  home: "M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6h-6v6H4.5a1 1 0 0 1-1-1z",
  calendar: "M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM4 10h16M8 3v4M16 3v4",
  chart: "M4 20h16M7 16v-5M12 16V6M17 16v-8",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1-3.8 4-5.5 7.5-5.5s6.5 1.7 7.5 5.5",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  check: "m5 12.5 4.5 4.5L19 7.5",
  chevron: "m9 6 6 6-6 6",
  chevronDown: "m6 9 6 6 6-6",
  close: "M6 6l12 12M18 6 6 18",
  play: "M8 5.5v13l10.5-6.5z",
  timer: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2M10 2.5h4",
  bolt: "M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z",
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  equal: "M6 9.5h12M6 14.5h12",
  warning: "M12 4 2.8 19.5h18.4zM12 10v4.5M12 17.2v.1",
  dumbbell: "M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11",
  flame: "M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.4-5.4 3.6-8.3.4 1.7 1.3 2.8 2.4 3.4.4-2.6 1.5-4.9 3.5-6.4-.2 2.6 3.5 5.6 3.5 10.6 0 4-2.7 6.9-6.5 6.9z",
  sparkle: "M12 3.5c.6 4 1.9 5.9 5.5 6.5-3.6.6-4.9 2.5-5.5 6.5-.6-4-1.9-5.9-5.5-6.5 3.6-.6 4.9-2.5 5.5-6.5z",
  layers: "m12 3.5 8.5 4.5-8.5 4.5L3.5 8zM3.5 12.5l8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5",
  trash: "M5 7h14M10 4h4M7 7l.8 12.2a1 1 0 0 0 1 .8h6.4a1 1 0 0 0 1-.8L17 7",
  reset: "M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4h4",
  camera: "M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  barcode: "M4 6v12M7 6v12M10.5 6v12M13 6v12M16.5 6v12M20 6v12",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.8-4.8",
  swap: "M7 4 3.5 7.5 7 11M3.5 7.5H17M17 13l3.5 3.5L17 20M20.5 16.5H7",
  pie: "M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12zM15 3.8A8.5 8.5 0 0 1 20.2 9H15z",
  logout: "M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4M10 16l-4-4 4-4M6 12h9",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, stroke = 2, className }: { name: IconName; size?: number; stroke?: number; className?: string }) {
  const filled = name === "play";
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
