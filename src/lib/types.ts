// Shared domain types used across server + client components.

export type Weights = {
  win: number;
  draw: number;
  goal: number;
  cs: number;
  ko: number;
  champ: number;
};

export type NationRecord = {
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

export type Manager = {
  membershipId: string;
  handle: string; // stable id derived from displayName, used in UI keys
  name: string;
  fullName: string;
  color: string;
  isYou: boolean;
  role: "COMMISSIONER" | "MEMBER";
};

export type RosterNation = NationRecord & {
  ownerId: string | null; // membershipId
  pickNumber: number | null;
  round_drafted: number | null;
  points: number;
};

export type StandingRow = {
  manager: Manager;
  total: number;
  alive: number;
  today: number;
  rank: number;
};

export type PoolView = {
  id: string;
  name: string;
  season: string;
  stageLabel: string;
  inviteCode: string;
  weights: Weights;
  rounds: number;
  draftOrder: string[]; // membershipIds in overall pick order; [] = standard snake
  myQueue: string[]; // requesting member's draft queue (nation codes)
  myAutoDraft: boolean; // requesting member's auto-draft toggle
  managers: Manager[];
  nations: RosterNation[];
  standings: StandingRow[];
};
