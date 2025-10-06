
import { WebSocket, WebSocketServer } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/common-backend/config";
import { prismaClient } from "@repo/db/client";

const wss = new WebSocketServer({ port: 8080 });

interface User {
    ws: WebSocket;
    rooms: string[];
    userId: string;
}

const users: User[] = [];

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

wss.on("connection", function connection(ws, request) {
    const url = request.url;
    if (!url) return;

    const queryParams = new URLSearchParams(url.split("?")[1]);
    const token = queryParams.get("token") || "";

    const userId = checkUser(token);
    if (!userId) {
        ws.close();
        return;
    }

    users.push({
        userId,
        rooms: [],
        ws: ws as unknown as WebSocket,
    });

    ws.on("message", async function message(data) {
        const parsedData = JSON.parse(data.toString()); // {type: "join_room" | "chat" | "leave_room", roomId, message}
        const roomId = String(parsedData.roomId); // normalize roomId to string

        // Join room
        if (parsedData.type === "join_room") {
            const user = users.find((x) => x.ws === ws);
            if (user && !user.rooms.includes(roomId)) {
                user.rooms.push(roomId);
            }
        }

        // Leave room
        if (parsedData.type === "leave_room") {
            const user = users.find((x) => x.ws === ws);
            if (user) {
                user.rooms = user.rooms.filter((r) => r !== roomId);
            }
        }

        // Chat 
        if (parsedData.type === "chat" ) {
            const message = parsedData.message;

            // Save to DB
            await prismaClient.chat.create({
                data: {
                    roomId: Number(roomId),
                    type: "chat",
                    message
                    
                },
            });

            
            users.forEach((user) => {
                if (user.rooms.includes(roomId)) {
                    user.ws.send(
                        JSON.stringify({
                            type: "chat",
                            roomId,
                            message,
                        })
                    );
                }
            });
        }

        if(parsedData.type ==="shape"){
            const shape= parsedData.message

            await prismaClient.shapes.create({
                data:{
                    roomId :Number(roomId),
                    type: "shape",
                    message :shape,
                    userId
                }
            })

             users.forEach((user) => {
                if (user.rooms.includes(roomId)) {
                    user.ws.send(
                        JSON.stringify({
                            type:"shape",
                            roomId,
                            message:shape,
                        })
                    );
                }
            });
        }
    });
});
