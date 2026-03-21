export interface MatchState {
  board: (string | null)[];
  presences: { [userId: string]: any };
  marks: { [userId: string]: string };
  turn: string | null;
  winner: string | null;
  draw: boolean;
  gameStarted: boolean;
  deadlineMs: number;
}

export const OP_CODE_MOVE = 1;
export const OP_CODE_UPDATE = 2;
export const OP_CODE_END = 3;
