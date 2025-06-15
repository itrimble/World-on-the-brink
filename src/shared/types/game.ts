// src/shared/types/game.ts
export interface SaveGameState {
  currentTurn: number;
  startYear: number;
  currentYear: number;
  endYear: number;
  gameDifficulty: string;
  gameMode: string;
  world: {
    countries: any;
    tensionLevel: number;
    climateStabilityIndex: number;
    currentCrises: any[];
    historicalEvents: any[];
  };
  player: {
    faction: string;
    politicalCapital: number;
    prestige: number;
    militaryReserves: number;
    economicReserves: number;
    defcon: number;
    activePolicies: any[];
    diplomaticInfluence: any;
  };
  metadata: {
    version: string;
    timestamp: number;
    saveName: string;
    createdAt: string;
  };
}

export interface SavedGameMetadata {
  fileName: string;
  saveName: string;
  timestamp: number;
  version: string;
  lastModified: number;
}

export interface ExistingSaveInfoDisplay extends SavedGameMetadata {
  formattedTimestamp: string;
}