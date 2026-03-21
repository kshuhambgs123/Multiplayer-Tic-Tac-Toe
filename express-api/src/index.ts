import "reflect-metadata";
import express from "express";
import { DataSource } from "typeorm";
import cors from "cors";
import dotenv from "dotenv";
import { MatchHistory } from "./entities/MatchHistory";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// TypeORM DataSource to point to Nakama's PostgreSQL
const AppDataSource = new DataSource({
    type: "postgres",
    host: (process.env.DB_HOST as string) || "127.0.0.1",
    port: parseInt(process.env.DB_PORT || "5433"),
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASS || "localdb",
    database: process.env.DB_NAME || "nakama",
    synchronize: true, 
    logging: false,
    entities: [MatchHistory], 
});

const connectWithRetry = (retries = 5) => {
    AppDataSource.initialize()
        .then(() => {
            console.log("Connected to Arena Data Core (PostgreSQL)");
            
            app.get("/health", (req: express.Request, res: express.Response) => res.json({ status: "Neural Uplink Nominal" }));

            app.get("/analytics/summary", async (req: express.Request, res: express.Response) => {
                try {
                    const totalPlayers = await AppDataSource.query("SELECT COUNT(*) FROM users");
                    const matchesPlayed = await AppDataSource.query("SELECT COUNT(*) FROM leaderboard_record WHERE leaderboard_id = 'tictactoe_wins'");

                    res.json({
                        totalConnectedPlayers: parseInt(totalPlayers[0].count),
                        matchesPlayed: parseInt(matchesPlayed[0].count),
                        status: "Healthy",
                        timestamp: new Date()
                    });
                } catch (e) {
                    res.status(500).json({ error: (e as any).message });
                }
            });

            const PORT = process.env.PORT || 3001;
            app.listen(PORT, () => {
                console.log(`Arena Analytics Node active on port ${PORT}`);
            });
        })
        .catch((error: any) => {
            if (retries > 0) {
                console.log(`Arena Connectivity Delay (Retrying in 5s)... [${retries} attempts left]`);
                setTimeout(() => connectWithRetry(retries - 1), 5000);
            } else {
                console.log("Arena Connectivity Error:", error);
                process.exit(1);
            }
        });
};

connectWithRetry();
