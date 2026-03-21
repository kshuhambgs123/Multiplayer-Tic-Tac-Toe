export enum OpCode {
    MOVE = 1,
    UPDATE = 2,
    END = 3,
}

export const TURN_TIME_SECONDS = 30;
export const TICK_RATE = 1;
export const BOARD_SIZE = 9;

export const WINNING_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
];
