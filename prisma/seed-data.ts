/**
 * Canonical demo universe for the WC26 draft pool.
 * One consistent world: 8 managers drafted six nations each (48 picks) in a
 * custom draft order. Mirrors the live preview so the seeded app matches.
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
};

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

// owner, code, name, flag, group, W,D,L, GF, CS, KOW, round, alive, strength
type DraftedRow = [string, string, string, string, string, number, number, number, number, number, number, string, boolean, number];

const DRAFTED: DraftedRow[] = [
  ["you", "ARG", "Argentina", "🇦🇷", "C", 4, 1, 0, 12, 3, 2, "QF", true, 90],
  ["you", "MAR", "Morocco", "🇲🇦", "F", 3, 2, 0, 7, 3, 2, "QF", true, 78],
  ["you", "COL", "Colombia", "🇨🇴", "G", 3, 1, 1, 7, 2, 1, "R16", false, 72],
  ["you", "CAN", "Canada", "🇨🇦", "A", 1, 1, 1, 3, 1, 0, "Group", false, 58],

  ["tom", "POR", "Portugal", "🇵🇹", "H", 4, 1, 0, 12, 2, 2, "QF", true, 86],
  ["tom", "NED", "Netherlands", "🇳🇱", "E", 3, 2, 0, 9, 2, 2, "QF", true, 83],
  ["tom", "SUI", "Switzerland", "🇨🇭", "B", 1, 2, 1, 4, 1, 0, "R32", false, 64],
  ["tom", "DEN", "Denmark", "🇩🇰", "J", 1, 0, 2, 3, 1, 0, "Group", false, 62],

  ["marcus", "FRA", "France", "🇫🇷", "D", 4, 0, 1, 11, 2, 2, "QF", true, 89],
  ["marcus", "URU", "Uruguay", "🇺🇾", "K", 2, 2, 1, 6, 1, 1, "R16", false, 74],
  ["marcus", "JPN", "Japan", "🇯🇵", "I", 3, 0, 2, 8, 1, 1, "R16", false, 70],
  ["marcus", "SRB", "Serbia", "🇷🇸", "L", 1, 0, 2, 3, 0, 0, "Group", false, 60],

  ["diego", "BRA", "Brazil", "🇧🇷", "G", 3, 2, 0, 10, 2, 2, "QF", true, 91],
  ["diego", "BEL", "Belgium", "🇧🇪", "E", 3, 1, 1, 9, 1, 1, "R16", false, 75],
  ["diego", "MEX", "Mexico", "🇲🇽", "A", 2, 1, 1, 5, 2, 0, "R32", false, 66],
  ["diego", "ECU", "Ecuador", "🇪🇨", "A", 1, 1, 1, 2, 2, 0, "Group", false, 61],

  ["priya", "ESP", "Spain", "🇪🇸", "B", 4, 1, 0, 13, 2, 2, "QF", true, 92],
  ["priya", "CRO", "Croatia", "🇭🇷", "K", 2, 3, 0, 6, 2, 1, "R16", false, 73],
  ["priya", "USA", "USA", "🇺🇸", "D", 2, 1, 1, 6, 1, 0, "R32", false, 67],
  ["priya", "AUS", "Australia", "🇦🇺", "B", 0, 2, 1, 2, 1, 0, "Group", false, 57],

  ["jamie", "ENG", "England", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "F", 3, 1, 1, 8, 3, 2, "QF", true, 87],
  ["jamie", "GER", "Germany", "🇩🇪", "H", 3, 1, 1, 10, 2, 1, "R16", false, 80],
  ["jamie", "SEN", "Senegal", "🇸🇳", "I", 2, 0, 2, 5, 1, 0, "R32", false, 68],
  ["jamie", "KOR", "South Korea", "🇰🇷", "J", 0, 1, 2, 2, 0, 0, "Group", false, 59],
];

// code, name, flag, group, strength
const FREE_AGENTS: [string, string, string, string, number][] = [
  ["NOR", "Norway", "🇳🇴", "E", 54], ["ITA", "Italy", "🇮🇹", "L", 58], ["POL", "Poland", "🇵🇱", "H", 33],
  ["CRC", "Costa Rica", "🇨🇷", "C", 24], ["GHA", "Ghana", "🇬🇭", "D", 35], ["NGA", "Nigeria", "🇳🇬", "G", 44],
  ["EGY", "Egypt", "🇪🇬", "F", 42], ["CIV", "Ivory Coast", "🇨🇮", "K", 40], ["TUN", "Tunisia", "🇹🇳", "J", 31],
  ["ALG", "Algeria", "🇩🇿", "I", 30], ["CMR", "Cameroon", "🇨🇲", "B", 30], ["IRN", "Iran", "🇮🇷", "A", 28],
  ["KSA", "Saudi Arabia", "🇸🇦", "H", 22], ["QAT", "Qatar", "🇶🇦", "L", 20], ["AUT", "Austria", "🇦🇹", "C", 38],
  ["TUR", "Türkiye", "🇹🇷", "E", 37], ["SCO", "Scotland", "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "G", 33], ["PAR", "Paraguay", "🇵🇾", "D", 30],
  ["PAN", "Panama", "🇵🇦", "I", 18], ["NZL", "New Zealand", "🇳🇿", "K", 17], ["JAM", "Jamaica", "🇯🇲", "F", 23],
  ["CPV", "Cape Verde", "🇨🇻", "J", 16], ["UZB", "Uzbekistan", "🇺🇿", "B", 18], ["JOR", "Jordan", "🇯🇴", "L", 16],
];

export const NATIONS: SeedNation[] = [
  ...DRAFTED.map((d): SeedNation => ({
    code: d[1], name: d[2], flag: d[3], group: d[4],
    // No results yet — records start at zero until real matches are played.
    W: 0, D: 0, L: 0, GF: 0, CS: 0, KOW: 0,
    round: "Group", alive: false, champion: false, strength: d[13],
  })),
  ...FREE_AGENTS.map(([code, name, flag, group, strength]): SeedNation => ({
    code, name, flag, group, W: 0, D: 0, L: 0, GF: 0, CS: 0, KOW: 0,
    round: "Group", alive: false, champion: false, strength,
  })),
];

// ownerHandle, nationCode — in overall pick order (8 managers, 6 rounds, 48 picks).
// Custom draft order: Bard 1·15·25·35·46·48 / Goalie 2·14·24·34·44·47 /
// Andy 3·13·23·33·43·45 / Brain 4·12·22·31·41·42 / Jarn 5·11·21·29·39·40 /
// Tom 6·10·20·28·37·38 / ZD 7·9·19·27·32·36 / Stove 8·16·17·18·26·30.
// Best-available-by-strength is assigned to each successive pick.
export const DRAFT_PICKS: [string, string][] = [
  ["bard", "ESP"], ["goalie", "BRA"], ["andy", "ARG"], ["brain", "FRA"], ["jarn", "ENG"], ["tom", "POR"], ["zd", "NED"], ["stove", "GER"],
  ["zd", "MAR"], ["tom", "BEL"], ["jarn", "URU"], ["brain", "CRO"], ["andy", "COL"], ["goalie", "JPN"], ["bard", "SEN"], ["stove", "USA"],
  ["stove", "MEX"], ["stove", "SUI"], ["zd", "DEN"], ["tom", "ECU"], ["jarn", "SRB"], ["brain", "KOR"], ["andy", "CAN"], ["goalie", "ITA"],
  ["bard", "AUS"], ["stove", "NOR"], ["zd", "NGA"], ["tom", "EGY"], ["jarn", "CIV"], ["stove", "AUT"], ["brain", "TUR"], ["zd", "GHA"],
  ["andy", "POL"], ["goalie", "SCO"], ["bard", "TUN"], ["zd", "ALG"], ["tom", "CMR"], ["tom", "PAR"], ["jarn", "IRN"], ["jarn", "CRC"],
  ["brain", "JAM"], ["brain", "KSA"], ["andy", "QAT"], ["goalie", "PAN"], ["andy", "UZB"], ["bard", "NZL"], ["goalie", "CPV"], ["bard", "JOR"],
];

export const DRAFT_ORDER_R1 = ["bard", "goalie", "andy", "brain", "jarn", "tom", "zd", "stove"];

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

// Schedule only — no scores or results until real matches are played.
export const FIXTURES: SeedFixture[] = [
  { id: "qf1", stage: "Quarter-final", status: "upcoming", homeCode: "ARG", awayCode: "NED", whenLabel: "TBD", venue: "MetLife Stadium", sort: 0 },
  { id: "qf2", stage: "Quarter-final", status: "upcoming", homeCode: "ESP", awayCode: "BRA", whenLabel: "TBD", venue: "AT&T Stadium", sort: 1 },
  { id: "qf3", stage: "Quarter-final", status: "upcoming", homeCode: "FRA", awayCode: "ENG", whenLabel: "TBD", venue: "SoFi Stadium", sort: 2 },
  { id: "qf4", stage: "Quarter-final", status: "upcoming", homeCode: "POR", awayCode: "MAR", whenLabel: "TBD", venue: "Estadio Azteca", sort: 3 },
  { id: "r16a", stage: "Round of 16", status: "upcoming", homeCode: "ARG", awayCode: "GER", whenLabel: "TBD", sort: 4 },
  { id: "r16b", stage: "Round of 16", status: "upcoming", homeCode: "ESP", awayCode: "URU", whenLabel: "TBD", sort: 5 },
  { id: "r16c", stage: "Round of 16", status: "upcoming", homeCode: "MAR", awayCode: "BEL", whenLabel: "TBD", sort: 6 },
  { id: "r16d", stage: "Round of 16", status: "upcoming", homeCode: "POR", awayCode: "JPN", whenLabel: "TBD", sort: 7 },
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
