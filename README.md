# LILA Assignment - Multiplayer Tic-Tac-Toe

This repository contains a full-stack multiplayer Tic-Tac-Toe application. It uses a React frontend and a Nakama server authoritative backend for gameplay logic, matchmaking, and leaderboards.

## Setup Instructions

### Prerequisites
- Docker & Docker Compose
- Node.js (v18+)

### Development Environment

1. Boot up the infrastructure (Nakama server and PostgreSQL):
   ```bash
   docker compose up -d
   ```
   Wait a few seconds for Nakama to initialize on port `7350`.

2. Build and bundle the backend TypeScript module:
   ```bash
   cd backend
   npm install
   npm run build
   ```
   *Note: Because Docker maps the `./backend/build/` directory directly into Nakama's `/nakama/data/modules/` path, the backend logic will load automatically on start. If changing the backend logic while running, restart the nakama container `docker compose restart nakama`.*

3. Start the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173/`.

### One-Command Runner
Alternatively, you can start the entire stack locally by executing:
```bash
./run_game.sh
```

## Architecture and Design Decisions

**Server-Authoritative Gameplay**
All moves and game loop computations reside inside Nakama's JavaScript runtime (`backend/src/index.ts`). The React frontend only handles inputs and UI rendering. This guarantees no client can manipulate the board state or force wins.

**Turn Validation and Timeouts**
The server validates turns sequentially. Players have a hard 30-second time limit per move. If `.deadlineMs` is exceeded, the Match loop naturally resolves the game, recording a timeout-based forfeit loss for the slow player. 

**Matchmaking**
The default Nakama matchmaker allows any two players looking for a match to instantly form a pairing. Upon connection, users join a session room that immediately spawns the authoritative server loop.

**Leaderboard Tracking**
Nakama's internal Leaderboard API is used instead of writing raw PostgreSQL rows. Individual leaderboards track Wins, Losses, and Draws (`tictactoe_wins`, `tictactoe_losses`, `tictactoe_draws`). The frontend fetches records from all three to calculate composite scores (`Wins*100 - Losses*30 + Draws*10`).

**Device vs. Account Auth**
The system currently uses Nakama's headless device authentication combined with a nickname mechanism. This reduces friction for testing/demoing while satisfying persistence requirements using local storage buffers.

## Deployment Process

### 1. Nakama Infrastructure
For a production deployment, the Nakama environment can run via ECS (Fargate), Kubernetes, or a standard VPS.
- **Database:** Replace the Dockerized PostgreSQL instance in `docker-compose.yml` with a managed database service (e.g. AWS RDS). Set `DATABASE_ADDRESS` in Nakama's configuration.
- **TLS/SSL:** The Nakama API relies on WebSockets (`ws://`) locally but must use Secure WebSockets (`wss://`) in production. Terminate SSL at the load balancer or inject a certificate via Nakama config options.

### 2. Frontend
The frontend is a static Vite build.
1. Define the necessary environment variables prior to the build (point Vite to the public Nakama domain):
   - `VITE_NAKAMA_HOST=api.yourdomain.com`
   - `VITE_NAKAMA_PORT=443`
   - `VITE_NAKAMA_USE_SSL=true`
2. Run standard deployment: `cd frontend && npm run build`
3. Serve `frontend/dist` using CDN providers (Vercel, AWS S3+CloudFront, Netlify).

## API & Configuration Details

### Nakama Overrides (`infrastructure/nakama-config.yml`)
- Provides environment parameters to adjust the server to load our custom TypeScript modules.
- Hardcoded test constants (`DEFAULT_SERVER_KEY="defaultkey"`) must be rotated in production.

### Nakama Admin Console
- **Port:** `7351` (`http://localhost:7351` locally)
- **Credentials:** `admin` / `password`
Allows managing runtime errors, leaderboard scores, and connected sockets for maintenance.

## Testing Multiplayer Locally

1. Open `http://localhost:5173` in a standard browser window (Player A).
2. Open `http://localhost:5173` in an Incognito window (Player B).
3. Connect both clients to the matchmaker simultaneously.
4. The server assigns Player A as 'X' and Player B as 'O'.
5. To test edge conditions:
   - Try dropping connection on one tab (server will mark a forfeit).
   - Let the 30-second timer expire without making a move.
   - Force a Draw to monitor if leaderboard records update.
