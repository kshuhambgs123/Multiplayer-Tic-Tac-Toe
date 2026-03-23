import { Client } from "@heroiclabs/nakama-js";
import type { Session, Socket } from "@heroiclabs/nakama-js";
import { v4 as uuidv4 } from "uuid";

const host = import.meta.env.VITE_NAKAMA_HOST || "lila-nakama.onrender.com";
const port = import.meta.env.VITE_NAKAMA_PORT || "443";
const useSslText = import.meta.env.VITE_NAKAMA_USE_SSL;
const useSsl = useSslText !== undefined ? useSslText !== "false" : true;
const serverKey = import.meta.env.VITE_NAKAMA_SERVER_KEY || "defaultkey";

const client = new Client(serverKey, host, port, useSsl);

export const getNakamaClient = () => client;

export const authenticate = async (username?: string): Promise<Session> => {
  let deviceId = localStorage.getItem("nakama_device_id");
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem("nakama_device_id", deviceId);
  }

  const session = await client.authenticateDevice(deviceId, true, username);
  localStorage.setItem("nakama_session", session.token || "");
  return session;
};

export const createSocket = async (session: Session): Promise<Socket> => {
  const socket = client.createSocket(useSsl, false);
  await socket.connect(session, true);
  return socket;
};
