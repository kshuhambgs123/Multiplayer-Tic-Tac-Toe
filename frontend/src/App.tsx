import { useState, useEffect, useRef } from "react";
import TicTacToe from "./components/TicTacToe";
import { authenticate, createSocket } from "./lib/nakama";
import type { Session, Socket } from "@heroiclabs/nakama-js";

function App() {
  const [session, setSession]     = useState<Session | null>(null);
  const [socket, setSocket]       = useState<Socket | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [nickname, setNickname]   = useState("");
  const [error, setError]         = useState("");
  const [focused, setFocused]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = nickname.trim();
    if (!name) { setError("Please enter a nickname"); return; }
    if (name.length < 2) { setError("Must be at least 2 characters"); return; }
    setError("");
    setConnecting(true);
    try {
      const sess = await authenticate(name);
      const sock = await createSocket(sess);
      setSession(sess);
      setSocket(sock);
    } catch (err) {
      console.error("Connection failed:", err);
      setError("Connection failed. Is the server running?");
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("nakama_session");
    if (token) {
      authenticate().then(sess => {
        setSession(sess);
        createSocket(sess).then(setSocket);
      }).catch(() => {});
    }
  }, []);

  if (!session || !socket) {
    const canSubmit = !connecting && nickname.trim().length >= 2;

    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a0f18 0%, #0d1117 60%, #0a1420 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        fontFamily: "'Inter', system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Ambient teal glow top-center */}
        <div style={{
          position: "fixed", top: -60, left: "50%", transform: "translateX(-50%)",
          width: 480, height: 280,
          background: "radial-gradient(ellipse, rgba(30,188,163,0.18) 0%, transparent 70%)",
          filter: "blur(40px)", pointerEvents: "none",
        }} />

        {/* Subtle grid dots pattern */}
        <svg style={{ position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity:0.15 }}>
          <defs>
            <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.4)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        <div style={{ position:"relative",zIndex:1,width:"100%",maxWidth:340,animation:"slideUp 0.4s ease-out both" }}>

          {/* Logo mark */}
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",marginBottom:36 }}>
            <div style={{ position:"relative",marginBottom:14 }}>
              <div style={{
                position:"absolute",inset:-10,borderRadius:24,
                background:"#1ebca3",filter:"blur(20px)",opacity:0.3,
              }} />
              <div style={{
                position:"relative",width:68,height:68,borderRadius:22,
                background:"linear-gradient(135deg,#1ebca3 0%,#0d9488 100%)",
                display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:"0 8px 40px rgba(30,188,163,0.35)",
              }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <line x1="6" y1="6" x2="26" y2="26" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="26" y1="6" x2="6" y2="26" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                  <circle cx="16" cy="16" r="8" stroke="white" strokeWidth="3.5"/>
                </svg>
              </div>
            </div>
            <h1 style={{ margin:0,fontSize:24,fontWeight:900,color:"white",letterSpacing:"-0.03em" }}>
              Neural Strike
            </h1>
            <p style={{ margin:"6px 0 0",fontSize:12,color:"rgba(255,255,255,0.28)",
              letterSpacing:"0.22em",textTransform:"uppercase" }}>
              Realtime Multiplayer
            </p>
          </div>

          {/* Card */}
          <div style={{
            background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.09)",
            borderRadius:24,
            padding:"28px 24px 24px",
            backdropFilter:"blur(10px)",
            boxShadow:"0 24px 64px rgba(0,0,0,0.4)",
          }}>
            <p style={{ margin:"0 0 20px",fontSize:13,fontWeight:600,
              color:"rgba(255,255,255,0.45)",letterSpacing:"0.05em" }}>
              Who are you?
            </p>

            <form onSubmit={handleConnect} style={{ display:"flex",flexDirection:"column",gap:0 }}>

              {/* Input wrapper with glow border */}
              <div style={{
                position:"relative",
                borderRadius:14,
                background:"rgba(255,255,255,0.05)",
                border: focused
                  ? "1.5px solid rgba(30,188,163,0.75)"
                  : "1.5px solid rgba(255,255,255,0.1)",
                boxShadow: focused ? "0 0 0 4px rgba(30,188,163,0.12)" : "none",
                transition:"border-color 0.2s ease,box-shadow 0.2s ease",
                marginBottom: 8,
              }}>
                <input
                  ref={inputRef}
                  autoFocus
                  required
                  type="text"
                  value={nickname}
                  maxLength={20}
                  onChange={e => { setNickname(e.target.value); setError(""); }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Enter your nickname…"
                  style={{
                    width:"100%",background:"transparent",border:"none",outline:"none",
                    padding:"16px 18px",fontSize:16,fontWeight:600,
                    color:"white",letterSpacing:"0.01em",
                    fontFamily:"inherit",
                    caretColor:"#1ebca3",
                  }}
                />
                {nickname.length > 0 && (
                  <span style={{
                    position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",
                    fontSize:11,color:"rgba(255,255,255,0.25)",
                    fontVariantNumeric:"tabular-nums",
                  }}>{nickname.length}/20</span>
                )}
              </div>

              {/* Error message */}
              <div style={{ height:18,marginBottom:16 }}>
                {error && (
                  <p style={{ margin:0,fontSize:12,color:"#f87171",paddingLeft:4 }}>{error}</p>
                )}
              </div>

              {/* Continue button */}
              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  width:"100%",padding:"15px 0",borderRadius:14,border:"none",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  background: canSubmit
                    ? "linear-gradient(135deg,#1ebca3 0%,#0d9488 100%)"
                    : "rgba(255,255,255,0.06)",
                  color: canSubmit ? "white" : "rgba(255,255,255,0.25)",
                  fontSize:15,fontWeight:800,letterSpacing:"0.03em",
                  transition:"all 0.25s ease",
                  boxShadow: canSubmit ? "0 4px 20px rgba(30,188,163,0.4)" : "none",
                  fontFamily:"inherit",
                }}
                onMouseDown={e => { if (canSubmit) e.currentTarget.style.transform = "scale(0.97)"; }}
                onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
                onTouchStart={e => { if (canSubmit) e.currentTarget.style.transform = "scale(0.97)"; }}
                onTouchEnd={e => (e.currentTarget.style.transform = "scale(1)")}
              >
                {connecting ? (
                  <span style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation:"spin 1s linear infinite" }}>
                      <circle cx="8" cy="8" r="6" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                      <path d="M8 2 A6 6 0 0 1 14 8" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Connecting…
                  </span>
                ) : "Continue →"}
              </button>
            </form>
          </div>

          {/* Footer hint */}
          <p style={{ textAlign:"center",marginTop:18,fontSize:11,
            color:"rgba(255,255,255,0.18)",letterSpacing:"0.05em" }}>
            Real players · Real-time · Global leaderboard
          </p>
        </div>
      </div>
    );
  }

  return <TicTacToe socket={socket} session={session} />;
}

export default App;
