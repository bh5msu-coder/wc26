// Distinct color per World Cup group (A–L, 12 groups in WC26).
const GROUP_COLORS: Record<string, string> = {
  A: "#2E7CF6", B: "#34E29B", C: "#FF8A3D", D: "#E45CFF",
  E: "#FFC83D", F: "#FF5C72", G: "#7C3AED", H: "#22D3EE",
  I: "#C6FF3A", J: "#F472B6", K: "#38BDF8", L: "#FB923C",
};

export function groupColor(group?: string | null): string {
  return GROUP_COLORS[(group ?? "").toUpperCase().trim()] ?? "#8A93A6";
}
