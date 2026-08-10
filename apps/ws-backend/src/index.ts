import "dotenv/config";
import { WebSocket, WebSocketServer } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/common-backend/config";
import { prismaClient } from "@repo/db/client";
import {
  WsJoinRoomSchema,
  WsLeaveRoomSchema,
  WsChatSchema,
  WsShapeSchema,
} from "@repo/common/types";

const port = process.env.PORT || 8080;

// Maximum allowed payload size (256 KB)
const MAX_PAYLOAD_BYTES = 256 * 1024;

const wss = new WebSocketServer({
  port: Number(port),
  maxPayload: MAX_PAYLOAD_BYTES,
});

console.log(`Secured WebSocket server started on port ${port}`);

interface User {
  ws: WebSocket;
  rooms: string[];
  userId: string;
  userName?: string;
  msgCount: number;
  lastMsgReset: number;
}

const users: User[] = [];

// Per-IP Connection Limit tracking
const ipConnections = new Map<string, number>();
const MAX_CONNS_PER_IP = 10;

function checkUser(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "object" && decoded !== null && "userId" in decoded) {
      return (decoded as JwtPayload).userId!;
    }
    return null;
  } catch (e) {
    return null;
  }
}

wss.on("connection", async function connection(ws, request) {
  const ip = request.socket.remoteAddress || "unknown";

  // Enforce Connection Limit per IP
  const currentConns = ipConnections.get(ip) || 0;
  if (currentConns >= MAX_CONNS_PER_IP) {
    console.warn(`[SECURITY] IP ${ip} exceeded maximum connection limit.`);
    ws.close(1008, "Connection limit exceeded");
    return;
  }
  ipConnections.set(ip, currentConns + 1);

  const url = request.url;
  if (!url) {
    ws.close(1008, "Missing request URL");
    return;
  }

  const queryParams = new URLSearchParams(url.split("?")[1]);
  const token = queryParams.get("token") || "";

  const userId = checkUser(token);
  if (!userId) {
    ws.close(1008, "Unauthorized: Invalid or expired token");
    return;
  }

  let userName = "Collaborator";
  try {
    const dbUser = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    if (dbUser?.name) {
      userName = dbUser.name;
    }
  } catch (e) {
    console.error("[WS] Failed to fetch user name:", e);
  }

  const currentUserObj: User = {
    userId,
    userName,
    rooms: [],
    ws: ws as unknown as WebSocket,
    msgCount: 0,
    lastMsgReset: Date.now(),
  };

  users.push(currentUserObj);

  // Handle Disconnect & Cleanup
  ws.on("close", () => {
    const index = users.findIndex((u) => u.ws === ws);
    if (index !== -1) {
      users.splice(index, 1);
    }
    const count = ipConnections.get(ip) || 1;
    if (count <= 1) {
      ipConnections.delete(ip);
    } else {
      ipConnections.set(ip, count - 1);
    }
  });

  ws.on("error", (err) => {
    console.error(`[WS ERROR] User ${userId}:`, err);
  });

  ws.on("message", async function message(data, isBinary) {
    // Reject binary messages
    if (isBinary) {
      ws.send(JSON.stringify({ error: "Binary messages not allowed" }));
      return;
    }

    // Rate Limiting per Socket Connection: Max 60 messages per 10 seconds
    const now = Date.now();
    if (now - currentUserObj.lastMsgReset > 10000) {
      currentUserObj.msgCount = 0;
      currentUserObj.lastMsgReset = now;
    }
    currentUserObj.msgCount += 1;

    if (currentUserObj.msgCount > 60) {
      console.warn(`[SECURITY] User ${userId} rate limited on WebSocket.`);
      ws.send(
        JSON.stringify({
          error: "Rate limit exceeded. Please slow down.",
        })
      );
      return;
    }

    let parsedRaw: any;
    try {
      parsedRaw = JSON.parse(data.toString());
    } catch (e) {
      ws.send(JSON.stringify({ error: "Invalid JSON format" }));
      return;
    }

    if (!parsedRaw || typeof parsedRaw !== "object" || !parsedRaw.type) {
      ws.send(JSON.stringify({ error: "Missing event type" }));
      return;
    }

    const roomIdStr = String(parsedRaw.roomId);
    const roomIdNum = Number(parsedRaw.roomId);

    if (isNaN(roomIdNum)) {
      ws.send(JSON.stringify({ error: "Invalid roomId" }));
      return;
    }

    // 1. Join Room
    if (parsedRaw.type === "join_room") {
      const validate = WsJoinRoomSchema.safeParse(parsedRaw);
      if (!validate.success) {
        ws.send(JSON.stringify({ error: "Invalid join_room schema" }));
        return;
      }
      if (!currentUserObj.rooms.includes(roomIdStr)) {
        // Enforce max 20 active rooms per connection
        if (currentUserObj.rooms.length >= 20) {
          ws.send(JSON.stringify({ error: "Maximum room subscriptions reached" }));
          return;
        }
        currentUserObj.rooms.push(roomIdStr);
      }
      return;
    }

    // 2. Leave Room
    if (parsedRaw.type === "leave_room") {
      const validate = WsLeaveRoomSchema.safeParse(parsedRaw);
      if (!validate.success) {
        ws.send(JSON.stringify({ error: "Invalid leave_room schema" }));
        return;
      }
      currentUserObj.rooms = currentUserObj.rooms.filter((r) => r !== roomIdStr);
      return;
    }

    // 3. Chat Message
    if (parsedRaw.type === "chat") {
      const validate = WsChatSchema.safeParse(parsedRaw);
      if (!validate.success) {
        ws.send(
          JSON.stringify({
            error: "Invalid chat payload",
            details: validate.error.flatten(),
          })
        );
        return;
      }

      // Verify User is subscribed to the target room
      if (!currentUserObj.rooms.includes(roomIdStr)) {
        ws.send(JSON.stringify({ error: "Unauthorized: You must join the room before chatting" }));
        return;
      }

      const messageText = validate.data.message;

      // Persist to DB securely
      try {
        await prismaClient.chat.create({
          data: {
            roomId: roomIdNum,
            type: "chat",
            message: messageText,
            userId: currentUserObj.userId,
          },
        });
      } catch (e) {
        console.error("[DB ERROR] Failed to store chat:", e);
      }

      // Broadcast to room subscribers
      users.forEach((u) => {
        if (u.rooms.includes(roomIdStr) && u.ws.readyState === WebSocket.OPEN) {
          u.ws.send(
            JSON.stringify({
              type: "chat",
              roomId: roomIdStr,
              message: messageText,
              userId: currentUserObj.userId,
              userName: currentUserObj.userName,
            })
          );
        }
      });
      return;
    }

    // 4. Shape / Canvas Event
    if (parsedRaw.type === "shape") {
      const validate = WsShapeSchema.safeParse(parsedRaw);
      if (!validate.success) {
        ws.send(
          JSON.stringify({
            error: "Invalid shape payload",
            details: validate.error.flatten(),
          })
        );
        return;
      }

      // Verify User is subscribed to the target room
      if (!currentUserObj.rooms.includes(roomIdStr)) {
        ws.send(JSON.stringify({ error: "Unauthorized: You must join the room before drawing" }));
        return;
      }

      const shapeMessage = validate.data.message;

      // Persist to DB securely
      try {
        await prismaClient.shapes.create({
          data: {
            roomId: roomIdNum,
            type: "shape",
            message: shapeMessage,
            userId: currentUserObj.userId,
          },
        });
      } catch (e) {
        console.error("[DB ERROR] Failed to store shape:", e);
      }

      // Broadcast to room subscribers
      users.forEach((u) => {
        if (u.rooms.includes(roomIdStr) && u.ws.readyState === WebSocket.OPEN) {
          u.ws.send(
            JSON.stringify({
              type: "shape",
              roomId: roomIdStr,
              message: shapeMessage,
            })
          );
        }
      });
      return;
    }

    ws.send(JSON.stringify({ error: "Unknown event type" }));
  });
});

