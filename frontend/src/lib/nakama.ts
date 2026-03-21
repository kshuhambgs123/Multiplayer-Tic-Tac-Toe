import { Client } from "@heroiclabs/nakama-js";
import type { Session, Socket } from "@heroiclabs/nakama-js";
import { v4 as uuidv4 } from "uuid";

const client = new Client("defaultkey", "127.0.0.1", "7350", false);

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
  const socket = client.createSocket(false, false);
  await socket.connect(session, true);
  return socket;
};
