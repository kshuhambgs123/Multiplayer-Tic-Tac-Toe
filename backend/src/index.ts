/// <reference path="../node_modules/nakama-runtime/index.d.ts" />

const TIC_TAC_TOE_MATCH_OPCODE_MOVE = 1;
const TIC_TAC_TOE_MATCH_OPCODE_UPDATE = 2;
const TIC_TAC_TOE_MATCH_OPCODE_END = 3;

function recordWin(nk: nkruntime.Nakama, logger: nkruntime.Logger, winnerId: string, username: string) {
    try {
        nk.leaderboardRecordWrite("tictactoe_wins", winnerId, username, 1);
        logger.info("Recorded win for %s", username);
    } catch (e: any) {
        logger.error("Failed to record win: %s", e.message);
    }
}

function recordLoss(nk: nkruntime.Nakama, logger: nkruntime.Logger, loserId: string, username: string) {
    try {
        nk.leaderboardRecordWrite("tictactoe_losses", loserId, username, 1);
    } catch (e: any) {
        logger.error("Failed to record loss: %s", e.message);
    }
}

function recordDraw(nk: nkruntime.Nakama, logger: nkruntime.Logger, userId: string, username: string) {
    try {
        nk.leaderboardRecordWrite("tictactoe_draws", userId, username, 1);
    } catch (e: any) {
        logger.error("Failed to record draw: %s", e.message);
    }
}

interface MatchState {
    board: (string | null)[];
    presences: { [userId: string]: nkruntime.Presence };
    marks: { [userId: string]: string };
    turn: string | null;
    winner: string | null;
    draw: boolean;
    gameStarted: boolean;
    deadlineMs: number;
}

function matchInit(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, params: {[key: string]: any}): { state: MatchState, tickRate: number, label: string } {
    return {
        state: {
            board: new Array(9).fill(null),
            presences: {},
            marks: {},
            turn: null,
            winner: null,
            draw: false,
            gameStarted: false,
            deadlineMs: 0
        },
        tickRate: 1,
        label: "Tic-Tac-Toe Match"
    };
}

function matchJoinAttempt(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, presence: nkruntime.Presence, metadata: {[key: string]: any}): { state: MatchState, accept: boolean } {
    const canJoin = Object.keys(state.presences).length < 2 && !state.gameStarted;
    return { state, accept: canJoin };
}

function matchJoin(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, presences: nkruntime.Presence[]): { state: MatchState } {
    presences.forEach(p => {
        state.presences[p.userId] = p;
    });

    if (Object.keys(state.presences).length === 2 && !state.gameStarted) {
        state.gameStarted = true;
        const userIds = Object.keys(state.presences);
        state.marks[userIds[0]] = "X";
        state.marks[userIds[1]] = "O";
        state.turn = userIds[0];
        state.deadlineMs = Date.now() + 30000;
        dispatcher.broadcastMessage(TIC_TAC_TOE_MATCH_OPCODE_UPDATE, JSON.stringify(state));
    }
    return { state };
}

function matchLeave(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, presences: nkruntime.Presence[]): { state: MatchState } {
    presences.forEach(p => {
        delete state.presences[p.userId];
    });

    if (state.gameStarted && !state.winner && !state.draw) {
        const remainingPlayers = Object.keys(state.presences);
        if (remainingPlayers.length === 1) {
            const winnerId = remainingPlayers[0];
            const loserId  = presences[0].userId;
            state.winner = winnerId;
            recordWin(nk, logger, winnerId, state.presences[winnerId].username);
            recordLoss(nk, logger, loserId, presences[0].username);
            dispatcher.broadcastMessage(TIC_TAC_TOE_MATCH_OPCODE_END, JSON.stringify({ state, winner: state.winner, reason: "Player Disconnected" }));
        }
    }
    return { state };
}

function matchLoop(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, messages: nkruntime.MatchMessage[]): { state: MatchState } | null {
    messages.forEach(msg => {
        if (msg.opCode === TIC_TAC_TOE_MATCH_OPCODE_MOVE) {
            handleMove(state, msg, dispatcher, logger, nk);
        }
    });

    if (state.gameStarted && !state.winner && !state.draw) {
        if (Date.now() > state.deadlineMs) {
            const loserId = state.turn!;
            const remainingPlayers = Object.keys(state.presences);
            const winnerId = remainingPlayers.find(id => id !== loserId) || null;
            state.winner = winnerId;
            if (state.winner && state.presences[state.winner]) {
                recordWin(nk, logger, state.winner, state.presences[state.winner].username);
            }
            if (loserId && state.presences[loserId]) {
                recordLoss(nk, logger, loserId, state.presences[loserId].username);
            }
            dispatcher.broadcastMessage(TIC_TAC_TOE_MATCH_OPCODE_END, JSON.stringify({ state, winner: state.winner, reason: "Turn Timeout" }));
        }
    }
    return state.winner || state.draw ? null : { state };
}

function handleMove(state: MatchState, msg: nkruntime.MatchMessage, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger, nk: nkruntime.Nakama) {
    if (state.winner || state.draw) return;
    if (msg.sender.userId !== state.turn) return;

    const data = JSON.parse(nk.binaryToString(msg.data));
    const index = data.index;

    if (index < 0 || index > 8 || state.board[index] !== null) return;

    state.board[index] = state.marks[msg.sender.userId];

    const winnerLines = [[0, 1, 2],[3, 4, 5],[6, 7, 8],[0, 3, 6],[1, 4, 7],[2, 5, 8],[0, 4, 8],[2, 4, 6]];
    const won = winnerLines.some(([a, b, c]) => state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]);

    if (won) {
        state.winner = msg.sender.userId;
        const loserId = Object.keys(state.presences).find(id => id !== state.winner);
        recordWin(nk, logger, state.winner, state.presences[state.winner].username);
        if (loserId && state.presences[loserId]) {
            recordLoss(nk, logger, loserId, state.presences[loserId].username);
        }
        dispatcher.broadcastMessage(TIC_TAC_TOE_MATCH_OPCODE_END, JSON.stringify({ state, winner: state.winner, reason: "Win" }));
    } else if (state.board.every(cell => cell !== null)) {
        state.draw = true;
        // Record draw for both players
        Object.entries(state.presences).forEach(([uid, p]) => {
            recordDraw(nk, logger, uid, (p as nkruntime.Presence).username);
        });
        dispatcher.broadcastMessage(TIC_TAC_TOE_MATCH_OPCODE_END, JSON.stringify({ state, winner: null, reason: "Draw" }));
    } else {
        const userIds = Object.keys(state.presences);
        state.turn = userIds.find(id => id !== state.turn) || state.turn;
        state.deadlineMs = Date.now() + 30000;
        dispatcher.broadcastMessage(TIC_TAC_TOE_MATCH_OPCODE_UPDATE, JSON.stringify(state));
    }
}

function matchTerminate(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, graceSeconds: number): { state: MatchState } {
    return { state };
}

function matchSignal(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: MatchState, data: string): { state: MatchState, data: string } {
    return { state, data };
}

function matchmakerMatched(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, matches: nkruntime.MatchmakerResult[]): string | void {
    logger.info("Matchmaker matched users, starting authoritative match");
    return nk.matchCreate("tictactoe", { label: "tictactoe-match" });
}

function InitModule(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
    initializer.registerMatch("tictactoe", {
        matchInit,
        matchJoinAttempt,
        matchJoin,
        matchLeave,
        matchLoop,
        matchTerminate,
        matchSignal
    });

    initializer.registerMatchmakerMatched(matchmakerMatched);

    try {
        nk.leaderboardCreate("tictactoe_wins",   true, nkruntime.SortOrder.DESCENDING, nkruntime.Operator.INCREMENTAL, "0 0 * * *", {});
        nk.leaderboardCreate("tictactoe_losses", true, nkruntime.SortOrder.DESCENDING, nkruntime.Operator.INCREMENTAL, "0 0 * * *", {});
        nk.leaderboardCreate("tictactoe_draws",  true, nkruntime.SortOrder.DESCENDING, nkruntime.Operator.INCREMENTAL, "0 0 * * *", {});
    } catch (e) {
        logger.error("Leaderboard error: %s", (e as any).message);
    }

    logger.info("Tic-Tac-Toe Backend Initialized");
}

// @ts-ignore
this.InitModule = InitModule;
