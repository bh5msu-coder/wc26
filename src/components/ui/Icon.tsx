import * as React from "react";

export type IconName =
  | "ball" | "shield" | "ko" | "trophy" | "bolt" | "flame" | "chevron"
  | "chevronDown" | "arrowUp" | "trend" | "plus" | "check" | "clock"
  | "users" | "grid" | "list" | "cards" | "calendar" | "info" | "close"
  | "whistle" | "swap" | "dice" | "logout" | "undo";

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
};

/** Clean line-icon set, ported 1:1 from the prototype's <Icon>. */
export function Icon({ name, size = 18, color = "currentColor", strokeWidth = 1.8, className }: Props) {
  const common = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    className,
  };
  switch (name) {
    case "ball":
      return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7.5l3.5 2.5-1.3 4.1H9.8L8.5 10z" fill={color} stroke="none" /><path d="M12 3v2.2M4.2 9.3l2 1.4M19.8 9.3l-2 1.4M7 20l1-2.4M17 20l-1-2.4" /></svg>);
    case "shield":
      return (<svg {...common}><path d="M12 3l7 2.5v5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5v-5L12 3z" /><path d="M9 12.2l2 2 4-4.2" /></svg>);
    case "ko":
      return (<svg {...common}><path d="M5 4l6 6M5 10l3-3M3 6l3-2M19 4l-6 6M19 10l-3-3M21 6l-3-2M9.5 12.5L4 18l2 2 5.5-5.5M14.5 12.5L20 18l-2 2-5.5-5.5" /></svg>);
    case "trophy":
      return (<svg {...common}><path d="M7 4h10v4a5 5 0 01-10 0V4z" /><path d="M7 6H4.5a2.5 2.5 0 002.5 2.5M17 6h2.5a2.5 2.5 0 01-2.5 2.5M12 13v3M9 20h6M10 20l.5-4h3l.5 4" /></svg>);
    case "bolt":
      return (<svg {...common}><path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" fill={color} stroke={color} /></svg>);
    case "flame":
      return (<svg {...common}><path d="M12 3s4 3.5 4 8a4 4 0 11-8 0c0-1.5.7-2.7 1.4-3.5C9.8 9 9 7.5 12 3z" /></svg>);
    case "chevron":
      return (<svg {...common}><path d="M9 5l7 7-7 7" /></svg>);
    case "chevronDown":
      return (<svg {...common}><path d="M5 9l7 7 7-7" /></svg>);
    case "arrowUp":
      return (<svg {...common}><path d="M12 19V5M6 11l6-6 6 6" /></svg>);
    case "trend":
      return (<svg {...common}><path d="M3 17l6-6 4 4 8-8M21 7v5M21 7h-5" /></svg>);
    case "plus":
      return (<svg {...common}><path d="M12 5v14M5 12h14" /></svg>);
    case "check":
      return (<svg {...common}><path d="M5 12l5 5L20 6" /></svg>);
    case "clock":
      return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
    case "users":
      return (<svg {...common}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0111 0M16 6.2a3 3 0 010 5.6M21 19a5.2 5.2 0 00-4-5" /></svg>);
    case "grid":
      return (<svg {...common}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>);
    case "list":
      return (<svg {...common}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>);
    case "cards":
      return (<svg {...common}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M7 7V4h13v13h-3" /></svg>);
    case "calendar":
      return (<svg {...common}><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></svg>);
    case "info":
      return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></svg>);
    case "close":
      return (<svg {...common}><path d="M6 6l12 12M18 6L6 18" /></svg>);
    case "whistle":
      return (<svg {...common}><path d="M3 11a4 4 0 014-4h11l-2.5 3H10M3 11a4 4 0 008 0M3 11h8" /></svg>);
    case "swap":
      return (<svg {...common}><path d="M7 4L3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8" /></svg>);
    case "dice":
      return (<svg {...common}><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><circle cx="8.5" cy="8.5" r="1.2" fill={color} stroke="none" /><circle cx="15.5" cy="8.5" r="1.2" fill={color} stroke="none" /><circle cx="12" cy="12" r="1.2" fill={color} stroke="none" /><circle cx="8.5" cy="15.5" r="1.2" fill={color} stroke="none" /><circle cx="15.5" cy="15.5" r="1.2" fill={color} stroke="none" /></svg>);
    case "logout":
      return (<svg {...common}><path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 12H21M18 9l3 3-3 3" /></svg>);
    case "undo":
      return (<svg {...common}><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 015.5 5.5 5.5 5.5 0 01-5.5 5.5H7" /></svg>);
    default:
      return null;
  }
}

const SCORE_MAP: Record<string, IconName> = { goal: "ball", cs: "shield", ko: "ko", champ: "trophy", win: "bolt" };
export function ScoreIcon({ kind, size = 16, color }: { kind: string; size?: number; color?: string }) {
  return <Icon name={SCORE_MAP[kind] ?? "ball"} size={size} color={color} />;
}
