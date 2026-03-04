export enum CombatantType {
  PLAYER = 'PLAYER',
  ALLY = 'ALLY',
  ENEMY = 'ENEMY'
}

export enum StyleRank {
  D = 0,
  C = 1,
  B = 2,
  A = 3,
  S = 4,
  SS = 5,
  SSS = 6
}

export interface Condition {
  id: string;
  name: string;
  description: string;
  summary?: string;
}

export interface ActiveCondition {
  conditionId: string;
  remainingTurns: number | null; // null means infinite/scene
}

export interface Combatant {
  id: string;
  name: string;
  type: CombatantType;
  initiative: number;
  styleRank: StyleRank;
  activeConditions: ActiveCondition[];
}

export interface StyleRankInfo {
  rank: StyleRank;
  label: string;
  name: string;
  bonus: string;
}
