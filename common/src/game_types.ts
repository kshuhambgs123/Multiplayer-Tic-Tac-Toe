export type Mark = "X" | "O" | null;

export interface MatchState {
  board: Mark[];
  presences: { [userId: string]: any }; // In reality, Backend uses nkruntime.Presence, Frontend doesn't
  marks: { [userId: string]: string };
  turn: string | null;
  winner: string | null;
  draw: boolean;
  gameStarted: boolean;
  deadlineMs: number;
}

export interface MatchEndData {
    state: MatchState;
    winner: string | null;
    reason: string;
}
