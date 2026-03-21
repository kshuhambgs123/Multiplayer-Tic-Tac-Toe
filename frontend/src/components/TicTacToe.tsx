import { useState, useEffect, useRef, useCallback } from "react";
import type { Session, Socket } from "@heroiclabs/nakama-js";
import { type MatchState, OP_CODE_MOVE, OP_CODE_END } from "../types/game";
import { getNakamaClient } from "../lib/nakama";

interface TicTacToeProps { socket: Socket; session: Session; }

// ── Avatar color from username ────────────────────────────────────────────────
function avatarColor(name: string) {
  const colors = ["#1ebca3","#8b5cf6","#f59e0b","#ec4899","#3b82f6","#10b981","#f97316","#06b6d4"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return colors[h % colors.length];
}

const Avatar = ({ name, size = 40, active = false }: { name: string; size?: number; active?: boolean }) => {
  const bg = avatarColor(name);
  return (
    <div
      style={{
        width: size, height: size, background: bg, borderRadius: size * 0.28,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: size * 0.38, color: "white",
        boxShadow: active ? `0 0 0 2px white, 0 0 20px ${bg}99` : "none",
        transition: "box-shadow 0.3s ease",
        flexShrink: 0,
        textTransform: "uppercase",
      }}
    >
      {name[0]}
    </div>
  );
};

// ── SVG Marks ─────────────────────────────────────────────────────────────────
const XMark = ({ size = 48, color = "white" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <line x1="10" y1="10" x2="38" y2="38" stroke={color} strokeWidth="5.5" strokeLinecap="round"/>
    <line x1="38" y1="10" x2="10" y2="38" stroke={color} strokeWidth="5.5" strokeLinecap="round"/>
  </svg>
);
const OMark = ({ size = 48, color = "white" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="14" stroke={color} strokeWidth="5.5"/>
  </svg>
);
const Mark = ({ m, size = 48, color = "white" }: { m: string | null; size?: number; color?: string }) => {
  if (m === "X") return <XMark size={size} color={color} />;
  if (m === "O") return <OMark size={size} color={color} />;
  return null;
};

// ── Confetti burst ────────────────────────────────────────────────────────────
const Confetti = () => (
  <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
    {Array.from({ length: 22 }).map((_, i) => {
      const colors = ["#1ebca3","#a78bfa","#fbbf24","#f472b6","#60a5fa","#34d399"];
      return (
        <div key={i} style={{
          position: "absolute",
          width: 8 + (i % 5) * 4,
          height: 8 + (i % 5) * 4,
          borderRadius: i % 3 === 0 ? "50%" : "3px",
          left: `${4 + (i * 9) % 92}%`,
          bottom: `${10 + (i * 13) % 40}%`,
          background: colors[i % colors.length],
          animation: `confettiFly ${0.6 + (i % 4) * 0.2}s ease-out ${i * 0.045}s both`,
          opacity: 0,
        }} />
      );
    })}
  </div>
);

// ── Circular timer ring (SVG) ─────────────────────────────────────────────────
const TimerRing = ({ pct, danger }: { pct: number; danger: boolean }) => {
  const r = 18, circ = 2 * Math.PI * r;
  return (
    <svg width="48" height="48" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5"/>
      <circle
        cx="24" cy="24" r={r} fill="none"
        stroke={danger ? "#f87171" : "rgba(255,255,255,0.85)"}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
      />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
export default function TicTacToe({ socket, session }: TicTacToeProps) {
  const [matchId, setMatchId]           = useState<string | null>(null);
  const [matchState, setMatchState]     = useState<MatchState | null>(null);
  const [findingMatch, setFindingMatch] = useState(false);
  const [stats, setStats]               = useState<Record<string, { w: number; l: number; d: number; username: string }>>({});
  const [timeLeft, setTimeLeft]         = useState(30);
  const [tappedCell, setTappedCell]     = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const leaderboard = Object.values(stats).sort((a, b) => b.w - a.w || a.l - b.l);

  // ── Socket ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    socket.onmatchdata = (matchData) => {
      const parsed = JSON.parse(new TextDecoder().decode(matchData.data));
      setMatchState(matchData.op_code === OP_CODE_END ? (parsed.state ?? parsed) : parsed);
      setTimeLeft(30);
      // Nakama writes leaderboard records async after broadcasting END.
      // Fetch with 1.2s delay so the DB write completes, then again at 3s as safety net.
      if (matchData.op_code === OP_CODE_END) {
        setTimeout(() => fetchLeaderboard(), 1200);
        setTimeout(() => fetchLeaderboard(), 3000);
      }
    };
    socket.onmatchpresence = () => {};
    return () => { socket.onmatchdata = () => {}; socket.onmatchpresence = () => {}; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // ── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!matchId || matchState?.winner || matchState?.draw) return;
    timerRef.current = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [matchId, matchState?.winner, matchState?.draw, matchState?.turn]);

  // ── Leaderboard ─────────────────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async () => {
    try {
      const client = getNakamaClient();
      const safeFetch = async (id: string) => {
        try {
          // signature: session, leaderboardId, ownerIds?, limit?, cursor?, expiry?
          const res = await client.listLeaderboardRecords(session, id, undefined, 20);
          return res.records || [];
        } catch (e) {
          return [];
        }
      };

      const [winRecs, lossRecs, drawRecs] = await Promise.all([
        safeFetch("tictactoe_wins"),
        safeFetch("tictactoe_losses"),
        safeFetch("tictactoe_draws"),
      ]);

      const m: Record<string, { w: number; l: number; d: number; username: string }> = {};
      for (const r of winRecs)  m[r.owner_id!] = { ...(m[r.owner_id!] || {w:0,l:0,d:0}), username: r.username!, w: Number(r.score) };
      for (const r of lossRecs) { m[r.owner_id!] = m[r.owner_id!] || {w:0,l:0,d:0,username:r.username!}; m[r.owner_id!].l = Number(r.score); }
      for (const r of drawRecs) { m[r.owner_id!] = m[r.owner_id!] || {w:0,l:0,d:0,username:r.username!}; m[r.owner_id!].d = Number(r.score); }
      setStats(m);
    } catch (e) { console.error("LB failed", e); }
  }, [session]);
  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  // ── Matchmaking ─────────────────────────────────────────────────────────────
  const joinMatchmaker = async () => {
    setFindingMatch(true); setMatchState(null); setMatchId(null); setTimeLeft(30);
    try {
      await socket.addMatchmaker("*", 2, 2);
      socket.onmatchmakermatched = async (matched) => {
        const match = await socket.joinMatch(matched.match_id);
        setMatchId(match.match_id); setFindingMatch(false); fetchLeaderboard();
      };
    } catch (err) { console.error("Matchmaker error:", err); setFindingMatch(false); }
  };

  // ── Move ────────────────────────────────────────────────────────────────────
  const sendMove = (index: number) => {
    if (!matchId || !matchState || matchState.winner || matchState.draw) return;
    if (matchState.turn !== session.user_id) return;
    if (matchState.board[index] !== null) return;
    setTappedCell(index);
    setTimeout(() => setTappedCell(null), 400);
    socket.sendMatchState(matchId, OP_CODE_MOVE, JSON.stringify({ index }));
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isMyTurn    = matchState?.turn === session.user_id;
  const myMark      = matchState?.marks?.[session.user_id!] ?? "X";
  const myUsername  = session.username || "YOU";
  const timerPct    = (timeLeft / 30) * 100;
  const timerDanger = timeLeft <= 8;

  let oppUsername = "Opponent";
  if (matchState) {
    const oppId = Object.keys(matchState.presences).find(id => id !== session.user_id);
    if (oppId) oppUsername = matchState.presences[oppId]?.username || "Opponent";
  }

  const myStats  = leaderboard.find(r => r.username === session.username);
  const myScore  = myStats ? myStats.w * 100 - myStats.l * 30 + myStats.d * 10 : 0;

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN 1 — Lobby (pull users in with identity + social proof)
  // ════════════════════════════════════════════════════════════════════════════
  if (!matchId && !findingMatch && !matchState?.winner && !matchState?.draw) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-5 fade"
           style={{ background: "linear-gradient(160deg, #0a0f18 0%, #0d1117 60%, #0a1420 100%)" }}>

        {/* Ambient glow */}
        <div style={{ position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",
          width:500,height:220,background:"radial-gradient(ellipse,#1ebca330 0%,transparent 70%)",
          filter:"blur(50px)",pointerEvents:"none",zIndex:0 }} />

        <div className="relative z-10 w-full" style={{ maxWidth: 360 }}>

          {/* Brand */}
          <div className="s0 flex flex-col items-center mb-8">
            <div className="relative mb-3">
              <div style={{ position:"absolute",inset:-8,background:"#1ebca3",borderRadius:24,filter:"blur(16px)",opacity:0.3 }} />
              <div style={{ position:"relative",width:64,height:64,borderRadius:20,
                background:"linear-gradient(135deg,#1ebca3,#0d9488)",
                display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:"0 8px 32px #1ebca340" }}>
                <span style={{ fontSize:28,fontWeight:900,color:"white" }}>#</span>
              </div>
            </div>
            <h1 style={{ fontSize:26,fontWeight:900,color:"white",letterSpacing:"-0.03em",margin:0 }}>Neural Strike</h1>
            <p style={{ fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:"0.2em",margin:"4px 0 0",textTransform:"uppercase" }}>Realtime · Global · Competitive</p>
          </div>

          {/* Player identity card */}
          <div className="s1 card-lift" style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
            borderRadius:20,padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12 }}>
            <Avatar name={myUsername} size={44} />
            <div style={{ flex:1,minWidth:0 }}>
              <p style={{ fontSize:10,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"0.15em",margin:0 }}>Playing as</p>
              <p style={{ fontSize:15,fontWeight:700,color:"white",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{myUsername}</p>
            </div>
            {myStats && (
              <div style={{ textAlign:"right",flexShrink:0 }}>
                <p style={{ fontSize:10,color:"rgba(255,255,255,0.3)",margin:0 }}>Score</p>
                <p style={{ fontSize:16,fontWeight:900,color:"#1ebca3",margin:0 }}>{myScore}</p>
              </div>
            )}
          </div>

          {/* Find Match CTA */}
          <button className="s2" onClick={joinMatchmaker} style={{
            width:"100%",padding:"16px 0",borderRadius:16,border:"none",cursor:"pointer",
            background:"linear-gradient(135deg,#1ebca3 0%,#0d9488 100%)",
            color:"white",fontSize:16,fontWeight:800,letterSpacing:"0.02em",
            boxShadow:"0 4px 24px #1ebca344",marginBottom:24,
            transform:"translateZ(0)",transition:"transform 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
          onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
          onTouchStart={e => (e.currentTarget.style.transform = "scale(0.97)")}
          onTouchEnd={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            Find Match ↗
          </button>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="s3">
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                <p style={{ fontSize:11,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.18em",margin:0 }}>🏆 Global Rankings</p>
                <p style={{ fontSize:10,color:"rgba(255,255,255,0.2)",margin:0 }}>W / L / D</p>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                {leaderboard.slice(0, 5).map((r, i) => {
                  const isMe = r.username === session.username;
                  const sc = r.w * 100 - r.l * 30 + r.d * 10;
                  return (
                    <div key={i} style={{
                      display:"flex",alignItems:"center",gap:10,
                      background: isMe ? "rgba(30,188,163,0.08)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isMe ? "rgba(30,188,163,0.25)" : "rgba(255,255,255,0.05)"}`,
                      borderRadius:14,padding:"10px 14px",
                    }}>
                      <span style={{ fontSize:11,color:"rgba(255,255,255,0.3)",width:16,flexShrink:0 }}>{i+1}</span>
                      <Avatar name={r.username} size={30} />
                      <span style={{ flex:1,fontSize:13,fontWeight:600,color: isMe ? "#1ebca3" : "white",
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                        {r.username}{isMe ? " (you)" : ""}
                      </span>
                      <span style={{ fontSize:11,color:"rgba(255,255,255,0.45)",fontFamily:"monospace",flexShrink:0 }}>
                        {r.w}/{r.l}/{r.d}
                      </span>
                      <span style={{ fontSize:13,fontWeight:800,color:"white",flexShrink:0,minWidth:32,textAlign:"right" }}>{sc}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN 2 — Matchmaking
  // ════════════════════════════════════════════════════════════════════════════
  if (findingMatch) {
    return (
      <div className="fade" style={{ minHeight:"100vh",background:"#0d1117",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"Inter,sans-serif" }}>

        {/* Spinner */}
        <div className="s0" style={{ position:"relative",width:100,height:100,marginBottom:28,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div className="ring-cw"  style={{ position:"absolute",inset:0,borderRadius:"50%",border:"2.5px solid transparent",borderTopColor:"#1ebca3",borderRightColor:"rgba(30,188,163,0.2)" }} />
          <div className="ring-ccw" style={{ position:"absolute",inset:10,borderRadius:"50%",border:"2.5px solid transparent",borderBottomColor:"rgba(255,255,255,0.3)",borderLeftColor:"rgba(255,255,255,0.08)" }} />
          <Avatar name={myUsername} size={44} />
        </div>

        <p className="s1" style={{ fontSize:18,fontWeight:700,color:"rgba(255,255,255,0.8)",margin:0,textAlign:"center" }}>Finding a real opponent...</p>
        <p className="s2" style={{ fontSize:13,color:"rgba(255,255,255,0.3)",marginTop:8,marginBottom:32,textAlign:"center" }}>Usually takes 2–6 seconds</p>

        <button className="s3" onClick={() => setFindingMatch(false)} style={{
          background:"transparent",border:"1px solid rgba(255,255,255,0.12)",
          borderRadius:10,padding:"10px 24px",color:"rgba(255,255,255,0.35)",
          fontSize:12,cursor:"pointer",transition:"all 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.color = "white"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
        >Cancel</button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN 4 — Game Over
  // ════════════════════════════════════════════════════════════════════════════
  if (matchState?.winner || matchState?.draw) {
    const won = matchState.winner === session.user_id;
    const winnerMark = matchState.winner ? matchState.marks[matchState.winner] : null;
    const scoreDelta = won ? "+100" : matchState.draw ? "+10" : "-30";
    const deltaColor = won ? "#1ebca3" : matchState.draw ? "rgba(255,255,255,0.4)" : "#f87171";

    return (
      <div className="fade" style={{ minHeight:"100vh",background:"#0d1117",display:"flex",
        flexDirection:"column",alignItems:"center",padding:"56px 20px 32px",fontFamily:"Inter,sans-serif",
        position:"relative",overflow:"hidden" }}>

        {won && <Confetti />}

        {/* BG glow */}
        <div style={{ position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",
          width:400,height:200,borderRadius:"50%",
          background: won ? "radial-gradient(ellipse,#1ebca340,transparent 70%)" : "radial-gradient(ellipse,#ef444420,transparent 70%)",
          filter:"blur(40px)",pointerEvents:"none" }} />

        <div className="relative z-10 w-full" style={{ maxWidth:360,display:"flex",flexDirection:"column",alignItems:"center" }}>

          {/* Big mark */}
          <div className={`s0 ${won ? "hero-float" : ""}`} style={{ width:100,height:100,marginBottom:16,opacity: won ? 1 : 0.55 }}>
            <Mark m={winnerMark} size={100} color="white" />
            {!winnerMark && <span style={{ fontSize:60 }}>🤝</span>}
          </div>

          {/* Result */}
          <h2 className="s1" style={{ margin:0,fontSize:32,fontWeight:900,letterSpacing:"-0.03em",
            color: won ? "#1ebca3" : matchState.draw ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.45)" }}>
            {matchState.draw ? "DRAW" : won ? "VICTORY!" : "DEFEAT"}
          </h2>

          {/* Score Change chip */}
          <div className="s2" style={{ marginTop:8,marginBottom:20,background:"rgba(255,255,255,0.06)",
            border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"6px 14px",
            display:"flex",alignItems:"center",gap:8 }}>
            <span style={{ fontSize:12,color:"rgba(255,255,255,0.4)" }}>Score Record</span>
            <span style={{ fontSize:14,fontWeight:800,color: deltaColor, fontVariantNumeric:"tabular-nums" }}>{scoreDelta}</span>
          </div>

          {/* Leaderboard table */}
          <div className="s3 w-full">
            <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:10 }}>
              <span style={{ fontSize:14 }}>🏆</span>
              <span style={{ fontSize:13,fontWeight:700,color:"#1ebca3" }}>Leaderboard</span>
            </div>

            {/* Column headers */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 60px 36px 50px",
              padding:"0 4px 8px",borderBottom:"1px solid rgba(255,255,255,0.08)",
              fontSize:10,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:600 }}>
              <div>Player</div>
              <div style={{ textAlign:"right" }}>W/L/D</div>
              <div style={{ textAlign:"right" }}>Time</div>
              <div style={{ textAlign:"right" }}>Score</div>
            </div>

            {leaderboard.length === 0 && (
              <p style={{ color:"rgba(255,255,255,0.2)",fontSize:12,textAlign:"center",padding:"20px 0" }}>
                No records yet — be the first!
              </p>
            )}

            {leaderboard.slice(0, 6).map((r, i) => {
              const isMe  = r.username === session.username;
              const sc    = r.w * 100 - r.l * 30 + r.d * 10;
              const total = r.w + r.l + r.d;
              const mins  = total * 3;
              const timeStr = mins >= 60 ? `${Math.floor(mins/60)}h${mins%60>0?mins%60+'m':''}` : mins > 0 ? `${mins}m` : "—";
              return (
                <div key={i} style={{
                  display:"grid",gridTemplateColumns:"1fr 60px 36px 50px",
                  alignItems:"center",padding:"10px 4px",
                  borderBottom:"1px solid rgba(255,255,255,0.05)",
                  background: isMe ? "rgba(30,188,163,0.05)" : "transparent",
                }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,minWidth:0 }}>
                    <span style={{ fontSize:11,color:"rgba(255,255,255,0.25)",flexShrink:0,width:14,fontVariantNumeric:"tabular-nums" }}>{i+1}.</span>
                    <Avatar name={r.username} size={26} />
                    <span style={{ fontSize:13,fontWeight: isMe ? 700 : 500,
                      color: isMe ? "#1ebca3" : "white",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                      {r.username}{isMe ? " ★" : ""}
                    </span>
                  </div>
                  <div style={{ textAlign:"right",fontSize:11,color:"rgba(255,255,255,0.5)",fontFamily:"monospace" }}>{r.w}/{r.l}/{r.d}</div>
                  <div style={{ textAlign:"right",fontSize:11,color:"rgba(255,255,255,0.4)" }}>{timeStr}</div>
                  <div style={{ textAlign:"right",fontSize:14,fontWeight:800,color: isMe ? "#1ebca3" : "white" }}>{sc}</div>
                </div>
              );
            })}
          </div>

          {/* Play Again */}
          <button className="s4" onClick={joinMatchmaker} style={{
            marginTop:24,width:"100%",padding:"15px 0",borderRadius:14,
            border:"1px solid rgba(255,255,255,0.18)",background:"rgba(255,255,255,0.04)",
            color:"white",fontSize:15,fontWeight:700,cursor:"pointer",
            transition:"all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
          onMouseDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
          onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            Play Again →
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCREEN 3 — In-Game  (teal, 3×3 grid, premium player HUDs)
  // ════════════════════════════════════════════════════════════════════════════
  const board = matchState?.board || Array(9).fill(null);
  const currentTurnMark = matchState?.turn ? matchState.marks[matchState.turn] : null;

  return (
    <div className="fade" style={{
      minHeight:"100vh",display:"flex",flexDirection:"column",padding:"0 0 0",
      fontFamily:"Inter,sans-serif",
      background:"linear-gradient(170deg,#1ac9a8 0%,#1ebca3 45%,#17a892 100%)",
    }}>

      {/* ── Opponent HUD (top) ──────────────────────────────────────────── */}
      <div className="s0" style={{
        display:"flex",alignItems:"center",gap:12,padding:"36px 20px 12px",
        opacity: !isMyTurn ? 1 : 0.45, transition:"opacity 0.4s ease",
      }}>
        <Avatar name={oppUsername} size={42} active={!isMyTurn} />
        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ margin:0,fontSize:10,color:"rgba(255,255,255,0.65)",textTransform:"uppercase",letterSpacing:"0.15em" }}>Opponent</p>
          <p style={{ margin:0,fontSize:15,fontWeight:700,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{oppUsername}</p>
        </div>
        {!isMyTurn && (
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4 }}>
            <TimerRing pct={timerPct} danger={timerDanger} />
            <span style={{ fontSize:10,fontWeight:700,color: timerDanger ? "#fca5a5" : "rgba(255,255,255,0.8)" }}>{timeLeft}s</span>
          </div>
        )}
        {!isMyTurn && matchId && (
          <div className="active-dot" style={{ width:8,height:8,borderRadius:"50%",background:"white",flexShrink:0 }} />
        )}
      </div>

      {/* ── Turn label ──────────────────────────────────────────────────── */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,paddingBottom:4 }}>
        <div style={{ width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <Mark m={currentTurnMark} size={22} />
        </div>
        <p style={{ margin:0,fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.75)" }}>
          {isMyTurn ? "Your turn" : `${oppUsername}'s turn`}
        </p>
      </div>

      {/* ── Big centered countdown ─────────────────────────────────────── */}
      <div style={{ display:"flex",justifyContent:"center",paddingBottom:8 }}>
        <div style={{ position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:72,height:72 }}>
          {timerDanger && (
            <div style={{
              position:"absolute",inset:-8,borderRadius:"50%",
              background:"rgba(239,68,68,0.18)",
              animation:"activeDot 0.8s ease-in-out infinite",
            }} />
          )}
          <svg width="72" height="72" style={{ transform:"rotate(-90deg)",position:"absolute",inset:0 }}>
            <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4"/>
            <circle
              cx="36" cy="36" r="30" fill="none"
              stroke={timerDanger ? "#f87171" : "rgba(255,255,255,0.85)"}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 30}
              strokeDashoffset={2 * Math.PI * 30 * (1 - timerPct / 100)}
              style={{ transition:"stroke-dashoffset 1s linear,stroke 0.5s ease" }}
            />
          </svg>
          <span style={{
            position:"relative",zIndex:1,
            fontSize:22,fontWeight:900,
            fontVariantNumeric:"tabular-nums",
            color: timerDanger ? "#fca5a5" : "white",
            transition:"color 0.4s ease",
            lineHeight:1,
          }}>{timeLeft}</span>
        </div>
      </div>

      {/* ── 3×3 Grid ────────────────────────────────────────────────────── */}
      <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"8px 20px" }}>
        <div style={{ width:"min(86vw,76vh,310px)",aspectRatio:"1/1" }}>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",width:"100%",height:"100%" }}>
            {board.map((cell: string | null, idx: number) => {
              const hasR = (idx + 1) % 3 !== 0;
              const hasB = idx < 6;
              const canPlay = isMyTurn && cell === null;
              const wasTapped = tappedCell === idx;
              return (
                <button
                  key={idx}
                  onClick={() => sendMove(idx)}
                  disabled={!canPlay}
                  className={wasTapped ? "cell-tap" : ""}
                  style={{
                    display:"flex",alignItems:"center",justifyContent:"center",
                    background:"transparent",border:"none",outline:"none",cursor: canPlay ? "pointer" : "default",
                    borderRight:  hasR ? "2px solid rgba(0,0,0,0.14)" : "none",
                    borderBottom: hasB ? "2px solid rgba(0,0,0,0.14)" : "none",
                    WebkitTapHighlightColor:"transparent",
                    transition:"background 0.15s ease",
                  }}
                  onMouseEnter={e => { if (canPlay) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  {cell && (
                    <div className={`mark-pop`} style={{ width:"56%",height:"56%",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      <Mark m={cell} size={52} color="white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Your HUD (bottom) ────────────────────────────────────────────── */}
      <div className="s2" style={{
        display:"flex",alignItems:"center",gap:12,padding:"12px 20px 36px",
        opacity: isMyTurn ? 1 : 0.45, transition:"opacity 0.4s ease",
      }}>
        <Avatar name={myUsername} size={42} active={isMyTurn} />
        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ margin:0,fontSize:10,color:"rgba(255,255,255,0.65)",textTransform:"uppercase",letterSpacing:"0.15em" }}>You ({myMark})</p>
          <p style={{ margin:0,fontSize:15,fontWeight:700,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{myUsername}</p>
        </div>
        {isMyTurn && (
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4 }}>
            <TimerRing pct={timerPct} danger={timerDanger} />
            <span style={{ fontSize:10,fontWeight:700,color: timerDanger ? "#fca5a5" : "rgba(255,255,255,0.8)" }}>{timeLeft}s</span>
          </div>
        )}
        {isMyTurn && (
          <div className="active-dot" style={{ width:8,height:8,borderRadius:"50%",background:"white",flexShrink:0 }} />
        )}
      </div>
    </div>
  );
}
