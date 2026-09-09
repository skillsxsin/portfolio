export type Role = 'GODFATHER' | 'MAFIA' | 'DOCTOR' | 'POLICE' | 'VILLAGER' /* | 'WILDCARD' */;

export type Team = 'MAFIA' | 'VILLAGERS' /* | 'WILDCARD' */;

export type GamePhase =
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'DAY_DISCUSSION'
  | 'DAY_VOTING'
  | 'NIGHT'
  | 'GAME_OVER';

export type NightSubPhase = 'MAFIA' | 'DOCTOR' | 'POLICE' | null;

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isAlive: boolean;
  role?: Role;
  team?: Team;
  hasVoted?: boolean;
  votedForId?: string | null;
  pendingVoteTargetId?: string | null;
  nightActionCompleted?: boolean;
  nightTargetId?: string | null;
  protectionsUsed?: number;
  checksUsed?: number;
  doctorHealsUsed?: number;
  policeChecksUsed?: number;
  avatarSeed: string;
  avatarEmoji?: string;
  isOnline?: boolean;
  // Police results – only visible to that player + host
  policeResults?: Array<{ targetName: string; isMafia: boolean; round: number }>;
  investigatorResults?: Array<{ targetName: string; isShadow: boolean; round: number }>;
}

export interface RoleRecommendation {
  godfather: number;
  mafia: number;
  doctor: number;
  police: number;
  villager: number;
  doctorHeals: number;
  policeChecks: number;
  wildcard?: number;
  director?: number;
  shadow?: number;
  guardian?: number;
  investigator?: number;
  citizen?: number;
  guardianProtections?: number;
  investigatorChecks?: number;
}

export interface RoomSettings {
  maxPlayers: number;
  discussionTimerSec: number;
  votingTimerSec: number;
  nightTimerSec: number;
  doctorHeals: number;
  policeChecks: number;
  guardianProtections?: number;
  investigatorChecks?: number;
  manualRoles?: Record<string, Role>;
}

export interface GameLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'vote' | 'night' | 'elimination' | 'system' | 'chat';
  author?: string;
  message: string;
  // If set, only player with this id (and host) should see it
  privateToPlayerId?: string;
}

export interface RoomState {
  code: string;
  phase: GamePhase;
  nightSubPhase: NightSubPhase;
  phaseTimeRemaining: number;
  isTimerPaused?: boolean;
  dayNumber: number;
  players: Record<string, Player>;
  settings: RoomSettings;
  logs: GameLogEntry[];
  mafiaLogs: GameLogEntry[];
  shadowLogs?: GameLogEntry[];
  nightActions: {
    mafiaVotes: Record<string, number>;
    godfatherTarget: string | null;
    doctorTarget: string | null;
    policeTarget: string | null;
    // Legacy aliases
    shadowVotes?: Record<string, number>;
    directorTarget?: string | null;
    guardianTarget?: string | null;
    investigatorTarget?: string | null;
  };
  lastEliminatedPlayer?: {
    id: string;
    name: string;
    role: Role;
    team?: Team;
    reason: string;
    timestamp?: string;
  };
  lastVoteOutcome?: {
    type: 'ELIMINATED' | 'TIE' | 'ABSTAIN';
    message: string;
    timestamp?: string;
  };
  winner?: Team | 'DRAW';
}

export interface ClientPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isAlive: boolean;
  role?: Role;
  team?: Team;
  hasVoted?: boolean;
  votedForId?: string | null;
  pendingVoteTargetId?: string | null;
  nightActionCompleted?: boolean;
  nightTargetId?: string | null;
  avatarSeed: string;
  avatarEmoji?: string;
  isOnline?: boolean;
  protectionsUsed?: number;
  checksUsed?: number;
  doctorHealsUsed?: number;
  policeChecksUsed?: number;
  policeResults?: Array<{ targetName: string; isMafia: boolean; round: number }>;
  investigatorResults?: Array<{ targetName: string; isShadow: boolean; round: number }>;
}

export interface ClientRoomState {
  code: string;
  phase: GamePhase;
  nightSubPhase: NightSubPhase;
  phaseTimeRemaining: number;
  isTimerPaused?: boolean;
  dayNumber: number;
  players: Record<string, ClientPlayer>;
  settings: RoomSettings;
  myPlayerId: string;
  myPlayer?: ClientPlayer;
  logs: GameLogEntry[];
  mafiaLogs?: GameLogEntry[];
  shadowLogs?: GameLogEntry[];
  lastEliminatedPlayer?: {
    id: string;
    name: string;
    role: Role;
    team?: Team;
    reason: string;
    timestamp?: string;
  };
  lastVoteOutcome?: {
    type: 'ELIMINATED' | 'TIE' | 'ABSTAIN';
    message: string;
    timestamp?: string;
  };
  winner?: Team | 'DRAW';
  allRolesRevealed?: Record<string, { role: Role }>;
  // GM-only: per-player save/scan quota tracking
  quotaStats?: Array<{
    id: string;
    name: string;
    role: Role;
    protectionsUsed: number;
    checksUsed: number;
    doctorHealsUsed?: number;
    policeChecksUsed?: number;
  }>;
}
