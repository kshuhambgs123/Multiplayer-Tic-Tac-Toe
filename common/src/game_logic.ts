import { WINNING_LINES } from "./game_constants";
import { Mark } from "./game_types";

export const checkWin = (board: Mark[]): boolean => {
    return WINNING_LINES.some(([a, b, c]) => {
        return board[a] && board[a] === board[b] && board[a] === board[c];
    });
};

export const checkDraw = (board: Mark[]): boolean => {
    return board.every(cell => cell !== null);
};

export const getWinnerMark = (board: Mark[]): Mark | null => {
    const winningLine = WINNING_LINES.find(([a, b, c]) => {
        return board[a] && board[a] === board[b] && board[a] === board[c];
    });
    return winningLine ? board[winningLine[0]] : null;
};
