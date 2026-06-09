/**
 * Catalog for the WC26 draft pool: the real 48-team World Cup 2026 field in
 * their drawn groups, with FIFA ranking facts and ranking-derived strength.
 */

export type SeedNation = {
  code: string;
  name: string;
  flag: string;
  group: string;
  W: number;
  D: number;
  L: number;
  GF: number;
  CS: number;
  KOW: number;
  round: string;
  alive: boolean;
  champion: boolean;
  strength: number;
  fifaRank: number | null;
  fifaPoints: number | null;
  confederation: string | null;
  titles: number;
};

// ── World Cup facts (FIFA Men's World Ranking, 1 Apr 2026 official; WC titles) ──
// [rank, points, confederation, titles]. strength is derived from points below.
type NationFacts = [rank: number, points: number, conf: string, titles: number];
const FACTS: Record<string, NationFacts> = {
  FRA: [1, 1877, "UEFA", 2], ESP: [2, 1876, "UEFA", 1], ARG: [3, 1875, "CONMEBOL", 3],
  ENG: [4, 1800, "UEFA", 1], POR: [5, 1772, "UEFA", 0], BRA: [6, 1760, "CONMEBOL", 5],
  NED: [7, 1757, "UEFA", 0], MAR: [8, 1755, "CAF", 0], BEL: [9, 1734, "UEFA", 0],
  GER: [10, 1730, "UEFA", 4], CRO: [11, 1717, "UEFA", 0], ITA: [12, 1700, "UEFA", 4],
  COL: [13, 1693, "CONMEBOL", 0], SEN: [14, 1688, "CAF", 0], MEX: [15, 1681, "CONCACAF", 0],
  USA: [16, 1673, "CONCACAF", 0], URU: [17, 1673, "CONMEBOL", 2], JPN: [18, 1660, "AFC", 0],
  SUI: [19, 1649, "UEFA", 0], DEN: [20, 1620, "UEFA", 0], IRN: [21, 1615, "AFC", 0],
  TUR: [22, 1599, "UEFA", 0], ECU: [23, 1594, "CONMEBOL", 0], AUT: [24, 1593, "UEFA", 0],
  KOR: [25, 1588, "AFC", 0], NGA: [26, 1585, "CAF", 0], AUS: [27, 1580, "AFC", 0],
  ALG: [28, 1564, "CAF", 0], EGY: [29, 1563, "CAF", 0], CAN: [30, 1556, "CONCACAF", 0],
  NOR: [31, 1550, "UEFA", 0], PAN: [33, 1540, "CONCACAF", 0], CIV: [34, 1532, "CAF", 0],
  POL: [35, 1528, "UEFA", 0], SRB: [39, 1508, "UEFA", 0], PAR: [40, 1503, "CONMEBOL", 0],
  SCO: [43, 1498, "UEFA", 0], TUN: [44, 1483, "CAF", 0], CMR: [45, 1481, "CAF", 0],
  UZB: [50, 1465, "AFC", 0], CRC: [51, 1459, "CONCACAF", 0], QAT: [55, 1454, "AFC", 0],
  KSA: [61, 1421, "AFC", 0], JOR: [63, 1391, "AFC", 0], CPV: [69, 1366, "CAF", 0],
  JAM: [71, 1357, "CONCACAF", 0], GHA: [74, 1346, "CAF", 0], NZL: [85, 1295, "OFC", 0],
  // Real WC26 qualifiers added to complete the field (ranks/points approximate).
  SWE: [40, 1505, "UEFA", 0], CZE: [42, 1495, "UEFA", 0], RSA: [57, 1432, "CAF", 0],
  IRQ: [58, 1430, "AFC", 0], COD: [60, 1418, "CAF", 0], BIH: [75, 1340, "UEFA", 0],
  HAI: [83, 1305, "CONCACAF", 0], CUW: [90, 1275, "CONCACAF", 0],
};

// FIFA points → 0–100 strength: France ~1877 ≈ 95, weak qualifier ~1300 ≈ 20.
export function strengthFromPoints(points: number): number {
  return Math.max(20, Math.min(99, Math.round(((points - 1300) / 580) * 75 + 20)));
}

function factsFor(code: string): Pick<SeedNation, "strength" | "fifaRank" | "fifaPoints" | "confederation" | "titles"> {
  const f = FACTS[code];
  if (!f) return { strength: 50, fifaRank: null, fifaPoints: null, confederation: null, titles: 0 };
  const [rank, points, conf, titles] = f;
  return { strength: strengthFromPoints(points), fifaRank: rank, fifaPoints: points, confederation: conf, titles };
}

export type SeedPlayer = {
  id: string; // membership handle used to wire picks
  name: string; // display name
  full: string;
  email: string;
  color: string;
  isYou?: boolean;
};

export const PLAYERS: SeedPlayer[] = [
  { id: "bard", name: "Bard", full: "Bard", email: "bard@wc26.app", color: "#C6FF3A" },
  { id: "goalie", name: "Goalie", full: "Goalie", email: "goalie@wc26.app", color: "#2E7CF6" },
  { id: "andy", name: "Andy", full: "Andy", email: "andy@wc26.app", color: "#FF8A3D" },
  { id: "brain", name: "Brain", full: "Brain", email: "brain@wc26.app", color: "#34E29B" },
  { id: "jarn", name: "Jarn", full: "Jarn", email: "jarn@wc26.app", color: "#E45CFF" },
  { id: "tom", name: "Tom", full: "Tom", email: "tom@wc26.app", color: "#FFC83D", isYou: true },
  { id: "zd", name: "ZD", full: "ZD", email: "zd@wc26.app", color: "#7C3AED" },
  { id: "stove", name: "Stove", full: "Stove", email: "stove@wc26.app", color: "#FF5C72" },
];

// The real 2026 World Cup field — all 48 qualified teams in their drawn groups
// (Final Draw, 5 Dec 2025). [code, name, flag, group A–L].
const REAL_TEAMS: [string, string, string, string][] = [
  // Group A
  ["MEX", "Mexico", "🇲🇽", "A"], ["RSA", "South Africa", "🇿🇦", "A"], ["KOR", "South Korea", "🇰🇷", "A"], ["CZE", "Czechia", "🇨🇿", "A"],
  // Group B
  ["CAN", "Canada", "🇨🇦", "B"], ["SUI", "Switzerland", "🇨🇭", "B"], ["QAT", "Qatar", "🇶🇦", "B"], ["BIH", "Bosnia & Herzegovina", "🇧🇦", "B"],
  // Group C
  ["BRA", "Brazil", "🇧🇷", "C"], ["MAR", "Morocco", "🇲🇦", "C"], ["HAI", "Haiti", "🇭🇹", "C"], ["SCO", "Scotland", "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "C"],
  // Group D
  ["USA", "USA", "🇺🇸", "D"], ["PAR", "Paraguay", "🇵🇾", "D"], ["AUS", "Australia", "🇦🇺", "D"], ["TUR", "Türkiye", "🇹🇷", "D"],
  // Group E
  ["GER", "Germany", "🇩🇪", "E"], ["CUW", "Curaçao", "🇨🇼", "E"], ["CIV", "Ivory Coast", "🇨🇮", "E"], ["ECU", "Ecuador", "🇪🇨", "E"],
  // Group F
  ["NED", "Netherlands", "🇳🇱", "F"], ["JPN", "Japan", "🇯🇵", "F"], ["TUN", "Tunisia", "🇹🇳", "F"], ["SWE", "Sweden", "🇸🇪", "F"],
  // Group G
  ["BEL", "Belgium", "🇧🇪", "G"], ["EGY", "Egypt", "🇪🇬", "G"], ["IRN", "Iran", "🇮🇷", "G"], ["NZL", "New Zealand", "🇳🇿", "G"],
  // Group H
  ["ESP", "Spain", "🇪🇸", "H"], ["CPV", "Cape Verde", "🇨🇻", "H"], ["KSA", "Saudi Arabia", "🇸🇦", "H"], ["URU", "Uruguay", "🇺🇾", "H"],
  // Group I
  ["FRA", "France", "🇫🇷", "I"], ["SEN", "Senegal", "🇸🇳", "I"], ["NOR", "Norway", "🇳🇴", "I"], ["IRQ", "Iraq", "🇮🇶", "I"],
  // Group J
  ["ARG", "Argentina", "🇦🇷", "J"], ["ALG", "Algeria", "🇩🇿", "J"], ["AUT", "Austria", "🇦🇹", "J"], ["JOR", "Jordan", "🇯🇴", "J"],
  // Group K
  ["POR", "Portugal", "🇵🇹", "K"], ["UZB", "Uzbekistan", "🇺🇿", "K"], ["COL", "Colombia", "🇨🇴", "K"], ["COD", "DR Congo", "🇨🇩", "K"],
  // Group L
  ["ENG", "England", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "L"], ["CRO", "Croatia", "🇭🇷", "L"], ["GHA", "Ghana", "🇬🇭", "L"], ["PAN", "Panama", "🇵🇦", "L"],
];

export const NATIONS: SeedNation[] = REAL_TEAMS.map(([code, name, flag, group]): SeedNation => ({
  code, name, flag, group,
  // No results yet — records start at zero until real matches are played.
  W: 0, D: 0, L: 0, GF: 0, CS: 0, KOW: 0,
  round: "Group", alive: false, champion: false,
  ...factsFor(code),
}));

// Custom Wilboi 26 draft order — each manager's overall pick numbers (1..48).
export const DRAFT_ORDER: Record<string, number[]> = {
  bard: [1, 15, 25, 35, 46, 48],
  goalie: [2, 14, 24, 34, 44, 47],
  andy: [3, 13, 23, 33, 43, 45],
  brain: [4, 12, 22, 31, 41, 42],
  jarn: [5, 11, 21, 29, 39, 40],
  tom: [6, 10, 20, 28, 37, 38],
  zd: [7, 9, 19, 27, 32, 36],
  stove: [8, 16, 17, 18, 26, 30],
};

export type SeedFixture = {
  id: string; stage: string; status: string;
  homeCode: string; awayCode: string;
  hs?: number; as?: number; minute?: string; whenLabel?: string; venue?: string;
  sort: number;
  events?: { t: string; code: string; text: string; kind: string }[];
};

// Real opening-round group fixtures (June 2026). The results sync replaces this
// with the full live schedule once RESULTS_API_TOKEN is configured.
export const FIXTURES: SeedFixture[] = [
  { id: "wc26-1", stage: "Group A", status: "upcoming", homeCode: "MEX", awayCode: "RSA", whenLabel: "Jun 11", venue: "Estadio Azteca", sort: 0 },
  { id: "wc26-2", stage: "Group D", status: "upcoming", homeCode: "USA", awayCode: "PAR", whenLabel: "Jun 12", venue: "SoFi Stadium", sort: 1 },
  { id: "wc26-3", stage: "Group B", status: "upcoming", homeCode: "QAT", awayCode: "SUI", whenLabel: "Jun 13", venue: "Levi's Stadium", sort: 2 },
  { id: "wc26-4", stage: "Group F", status: "upcoming", homeCode: "NED", awayCode: "JPN", whenLabel: "Jun 14", venue: "AT&T Stadium", sort: 3 },
  { id: "wc26-5", stage: "Group I", status: "upcoming", homeCode: "FRA", awayCode: "SEN", whenLabel: "Jun 16", sort: 4 },
  { id: "wc26-6", stage: "Group J", status: "upcoming", homeCode: "ARG", awayCode: "ALG", whenLabel: "Jun 16", sort: 5 },
  { id: "wc26-7", stage: "Group K", status: "upcoming", homeCode: "POR", awayCode: "COD", whenLabel: "Jun 17", sort: 6 },
  { id: "wc26-8", stage: "Group E", status: "upcoming", homeCode: "GER", awayCode: "CIV", whenLabel: "Jun 20", venue: "Toronto", sort: 7 },
];

// The live bracket the Monte Carlo predictor projects forward.
// Each entry: [matchId, homeCode, awayCode]; SF/Final reference prior winners.
export const BRACKET = {
  quarterfinals: [
    { id: "qf1", home: "ARG", away: "NED" },
    { id: "qf2", home: "ESP", away: "BRA" },
    { id: "qf3", home: "FRA", away: "ENG" },
    { id: "qf4", home: "POR", away: "MAR" },
  ],
  // semifinal pairings reference QF winners by index
  semifinals: [
    { id: "sf1", fromHome: 0, fromAway: 1 },
    { id: "sf2", fromHome: 2, fromAway: 3 },
  ],
  final: { id: "final", fromHome: 0, fromAway: 1 },
};

export const POOL = {
  name: "The Lads",
  season: "World Cup 26",
  stageLabel: "Quarter-finals",
};
