// All simulation types. Game state is plain JSON (no classes, no functions) so it can be saved and snapshotted.
export type ResKey = 'o2' | 'water' | 'food' | 'power';
export type CrewId = 'reyes' | 'aiko' | 'david' | 'sofia';
export type CropId = 'potato' | 'lettuce' | 'tomato' | 'bean';
export type FarmLight = 'bright' | 'dim' | 'off';
export type LsMode = 'oxy' | 'bal' | 'wat';
export type FlagValue = boolean | number | string;

export interface Resources { o2: number; water: number; food: number; power: number }
export interface Plot { id: string; crop: CropId | null; growth: number; watered: boolean; health?: number } // health 0-100 (Episode 1)
// morale 0-100 (shown as a face over the crew member's head). hunger 0-100 (>= CREW_LIFE.HUNGRY_AT shows a food bubble).
export interface CrewState { friendship: number; met: boolean; morale: number; hunger: number }
export interface CaveProgress { explore: number; excavate: number; pressurize: number; shield: number }

export interface Decision { sol: number; sourceId: string; optionId: string; label: string }
export interface JournalEntry {
  id: string; sol: number; title: string;
  happened: string; decision: string; why: string; science: string;
  sourceId?: string; learnId?: string; realData: boolean; kind: 'event' | 'discovery' | 'mission' | 'lesson';
}
export interface LogEntry { sol: number; who: string; text: string }
export interface SolSummary { sol: number; res: Resources; decisions: string[]; note: string }
export interface DailyReport { sol: number; lines: string[]; mission: string }
export interface Pending { kind: 'beat' | 'event'; id: string }

export interface GameState {
  version: number; seed: number;
  sol: number; hour: number; energy: number;
  res: Resources; suit: number; rad: number; outside: boolean;
  farm: FarmLight; ls: LsMode;
  panelDust: number;
  plots: Plot[]; buildings: string[]; stage: number;
  crew: Record<CrewId, CrewState>;
  flags: Record<string, FlagValue>;            // flags starting with "tmp_" are cleared every Sol
  seenBeats: string[]; discovered: string[];
  pending: Pending | null;                      // one decision waiting for the player
  lastEventSol: number;
  cave: CaveProgress;
  solsSinceShipment: number; bestSelfSufficient: number; shipmentArrivesSol: number;
  campaignComplete: boolean;
  decisions: Decision[]; journal: JournalEntry[]; history: SolSummary[]; log: LogEntry[];
  lastReport: DailyReport | null;
  failed: ResKey | null;
  ep: EpisodeState | null;   // Episode 1 "The Storm"; null in the old open campaign
  suitOn: boolean;           // EVA suit worn (put on at the suit rack)
  health: number;            // player health 0-100 (radiation outside drains it)
}

// ---------- Episode 1: The Storm ----------
export type SystemId = 'air' | 'water' | 'plants' | 'comms' | 'solar';
export type EpPhase = 'call' | 'check' | 'prep' | 'storm' | 'after' | 'done';
export type Alert = 'low' | 'elevated' | 'high' | 'storm';
// One node of the decision -> consequence tree shown in the debrief.
export interface TreeNode { id: string; sol: number; kind: 'choice' | 'effect'; text: string; cause?: string; tone: 'good' | 'bad' | 'mixed'; tag?: 'panels' | 'shield' | 'check' }
export interface EpisodeResult { morale: number; power: number; plants: number; health: number; score: number; stars: number; best: string; tip: string }
export interface EpisodeState {
  id: 'storm'; phase: EpPhase; checked: SystemId[];
  call: 'ringing' | 'answered';
  stormCall: null | 'stow' | 'out' | 'ask' | 'wait';
  panelsStowed: boolean; panelDamage: number;   // damage 0-1 cuts solar output until repaired
  shield: null | 'water_wall' | 'corner' | 'nothing';
  wateringFixed: boolean; panelsCleaned: boolean;
  tree: TreeNode[]; result: EpisodeResult | null; passOuts: number;
  sun: { source: 'live' | 'archived'; flrID: string; classType: string; date: string };
  quick: boolean;
}

// Everything a choice can change. Keep effects declarative so beats/events stay data, not code.
export interface Effect {
  res?: Partial<Resources>; energy?: number; rad?: number;
  panelDust?: number; friend?: { crew: CrewId; n: number };
  flag?: Record<string, FlagValue>; addFlag?: Record<string, number>;
  setting?: { farm?: FarmLight; ls?: LsMode };
  log?: string;
}
export interface Choice {
  id: string; label: string; hint?: string;
  requires?: (s: GameState) => boolean; effects: Effect;
}

// Environment for a Sol. Derived ONLY from src/data (never from player state), so rewinding cannot rewrite it.
export interface Env {
  sol: number; dust: number; tempC: number; windMs: number;
  flare: null | { id: string; classType: string; mult: number; date: string };
  globalStorm: boolean;
}

export interface Beat {
  id: string; speaker: CrewId | 'system';
  when: (s: GameState) => boolean;
  lines: string[]; choices?: Choice[]; effects?: Effect;
}
export interface EventDef {
  id: string; title: string; speaker: CrewId | 'system';
  weight: (s: GameState, env: Env) => number;
  text: (s: GameState, env: Env) => string;
  choices: Choice[];
  journal: { why: string; science: string; sourceId?: string; learnId?: string; realData: boolean };
}
