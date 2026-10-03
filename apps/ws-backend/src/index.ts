import "dotenv/config";
import express from "express";
import http from "http";
import { Server as SocketIO } from "socket.io";
import cors from "cors";

type UserToFollow = {
  socketId: string;
  username: string;
};

type OnUserFollowedPayload = {
  userToFollow: UserToFollow;
  action: "FOLLOW" | "UNFOLLOW";
};

const app = express();
const port = Number(process.env.PORT || 3002);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Excalidraw collaboration server is up :)");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const server = http.createServer(app);

const io = new SocketIO(server, {
  transports: ["websocket", "polling"],
  cors: {
    allowedHeaders: ["Content-Type", "Authorization"],
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  },
  allowEIO3: true,
  maxHttpBufferSize: 1e7, // 10MB
});

io.on("connection", (socket) => {
  console.log(`[Socket.io] Connection established: ${socket.id}`);

  // Handshake: Notify client to initialize room
  io.to(socket.id).emit("init-room");

  // Join room
  socket.on("join-room", async (roomID: string) => {
    if (!roomID) return;
    if (socket.rooms.has(roomID)) return;
    console.log(`[Socket.io] Client ${socket.id} joined room: ${roomID}`);
    await socket.join(roomID);
    const sockets = await io.in(roomID).fetchSockets();

    if (sockets.length <= 1) {
      io.to(socket.id).emit("first-in-room");
    } else {
      socket.broadcast.to(roomID).emit("new-user", socket.id);
    }

    io.in(roomID).emit(
      "room-user-change",
      sockets.map((s) => s.id)
    );
  });

  // Server broadcast (reliable updates)
  socket.on(
    "server-broadcast",
    (roomID: string, encryptedData: ArrayBuffer, iv: Uint8Array) => {
      socket.broadcast.to(roomID).emit("client-broadcast", encryptedData, iv);
    }
  );

  // Server volatile broadcast (high-frequency pointer/cursor/idle updates)
  socket.on(
    "server-volatile-broadcast",
    (roomID: string, encryptedData: ArrayBuffer, iv: Uint8Array) => {
      socket.volatile.broadcast
        .to(roomID)
        .emit("client-broadcast", encryptedData, iv);
    }
  );

  // User follow behavior
  socket.on("user-follow", async (payload: OnUserFollowedPayload) => {
    if (!payload?.userToFollow?.socketId) return;
    const roomID = `follow@${payload.userToFollow.socketId}`;

    switch (payload.action) {
      case "FOLLOW": {
        await socket.join(roomID);
        const sockets = await io.in(roomID).fetchSockets();
        const followedBy = sockets.map((s) => s.id);
        io.to(payload.userToFollow.socketId).emit(
          "user-follow-room-change",
          followedBy
        );
        break;
      }
      case "UNFOLLOW": {
        await socket.leave(roomID);
        const sockets = await io.in(roomID).fetchSockets();
        const followedBy = sockets.map((s) => s.id);
        io.to(payload.userToFollow.socketId).emit(
          "user-follow-room-change",
          followedBy
        );
        break;
      }
    }
  });

  // Client disconnecting
  socket.on("disconnecting", async () => {
    console.log(`[Socket.io] Client ${socket.id} disconnecting`);
    for (const roomID of Array.from(socket.rooms)) {
      if (roomID === socket.id) continue;
      const otherClients = (await io.in(roomID).fetchSockets()).filter(
        (s) => s.id !== socket.id
      );

      const isFollowRoom = roomID.startsWith("follow@");

      if (!isFollowRoom && otherClients.length > 0) {
        socket.broadcast.to(roomID).emit(
          "room-user-change",
          otherClients.map((s) => s.id)
        );
      }

      if (isFollowRoom && otherClients.length === 0) {
        const socketId = roomID.replace("follow@", "");
        io.to(socketId).emit("broadcast-unfollow");
      }
    }
  });

  // Disconnect cleanup
  socket.on("disconnect", () => {
    socket.removeAllListeners();
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Excalidraw Room collaboration server running on port ${port}`);
});
