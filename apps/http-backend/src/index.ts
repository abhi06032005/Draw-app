import "dotenv/config";
import express from "express"; 
import bcrypt from "bcrypt";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { CreateSignupSchema, SigninSchema, CreateRoomSchema } from "@repo/common/types";
import jwt from "jsonwebtoken";
import { prismaClient } from "@repo/db/client";
import { JWT_SECRET } from "@repo/common-backend/config";
import { middleware } from "./middleware";

const app = express();

// Security Headers
app.use(helmet());
app.disable("x-powered-by");

// JSON Body Parser with Size Limit
app.use(express.json({ limit: "1mb" }));

// Restrictive CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:3001"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error("CORS policy violation"));
      }
    },
    credentials: true,
  })
);

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per IP
  message: { message: "Too many auth attempts. Please try again later." },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  message: { message: "Too many requests. Please slow down." },
});

app.use("/signup", authLimiter);
app.use("/signin", authLimiter);
app.use(apiLimiter);

app.post("/signup", async function(req, res) {
    const parsedData = CreateSignupSchema.safeParse(req.body);

    if (!parsedData.success) {
        return res.status(400).json({
            message: "Incorrect inputs",
            errors: parsedData.error.flatten(),
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(parsedData.data.password, 10);

        const userExists = await prismaClient.user.findFirst({
            where: {
                email: parsedData.data.username,
            },
        });

        if (userExists) {
            return res.status(409).json({
                message: "Email already exists",
            });
        }

        await prismaClient.user.create({
            data: {
                email: parsedData.data.username,
                password: hashedPassword,
                name: parsedData.data.name,
            },
        });

        return res.status(201).json({
            message: "User created successfully",
        });
    } catch (e) {
        console.error("Signup error:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
});

app.post("/signin", async function(req, res) {
    const parsedData = SigninSchema.safeParse(req.body);

    if (!parsedData.success) {
        return res.status(400).json({
            message: "Incorrect inputs",
        });
    }

    try {
        const user = await prismaClient.user.findFirst({
            where: {
                email: parsedData.data.username,
            },
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials",
            });
        }

        const matchPassword = await bcrypt.compare(
            parsedData.data.password,
            user.password
        );

        if (!matchPassword) {
            return res.status(401).json({
                message: "Invalid credentials",
            });
        }

        const userId = user.id;

        const token = jwt.sign(
            { userId },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            token: token,
        });
    } catch (e) {
        console.error("Signin error:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/user", middleware, async function (req, res) {
    //@ts-ignore
    const userId = req.userId;
    try {
        const user = await prismaClient.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.json(user);
    } catch (err) {
        console.error("Get user error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/get-rooms", middleware, async function (req, res) {
    //@ts-ignore
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const rooms = await prismaClient.room.findMany({
            where: { adminId: userId },
            select: {
                id: true,
                slug: true,
                createAt: true,
            },
        });

        return res.json(rooms);
    } catch (err) {
        console.error("Get rooms error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

app.post("/room", middleware, async function(req, res) {
    const parsedData = CreateRoomSchema.safeParse(req.body);

    if (!parsedData.success) {
        return res.status(400).json({
            message: "Incorrect inputs",
            errors: parsedData.error.flatten(),
        });
    }

    //@ts-ignore
    const userId = req.userId;

    try {
        const room = await prismaClient.room.create({
            data: {
                adminId: userId,
                slug: parsedData.data.name,
            },
        });

        return res.status(201).json({
            roomId: room.slug,
        });
    } catch (e) {
        console.error("Create room error:", e);
        return res.status(409).json({ message: "Room with this slug already exists" });
    }
});

app.get("/chats/:roomId", async function (req, res) {
    try {
        const roomId = Number(req.params.roomId);
        if (isNaN(roomId)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }

        const messages = await prismaClient.chat.findMany({
            where: { roomId: roomId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { id: "asc" },
            take: 50,
        });

        return res.json({ messages });
    } catch (e) {
        console.error("Fetch chats error:", e);
        return res.status(500).json({ error: "Failed to fetch messages" });
    }
});

app.get("/room/:slug", async function (req, res) {
    const slug = String(req.params.slug).trim();

    try {
        const room = await prismaClient.room.findUnique({
            where: { slug: slug },
        });

        if (!room) {
            return res.status(404).json({ message: "No room exists!!" });
        }

        return res.json({ roomId: room.id });
    } catch (e) {
        console.error("Get room slug error:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/shapes/:roomId", async function (req, res) {
    try {
        const roomId = Number(req.params.roomId);
        if (isNaN(roomId)) {
            return res.status(400).json({ error: "Invalid room ID" });
        }

        const messages = await prismaClient.shapes.findMany({
            where: { roomId: roomId },
            orderBy: { id: "desc" },
            take: 100,
        });

        return res.json({ messages });
    } catch (e) {
        console.error("Fetch shapes error:", e);
        return res.status(500).json({ error: "Failed to fetch shapes" });
    }
});

app.delete("/delete/:roomId", middleware, async function(req, res) {
    const roomId = Number(req.params.roomId);
    if (isNaN(roomId)) {
        return res.status(400).json({ error: "Invalid room ID" });
    }

    //@ts-ignore
    const userId = req.userId;

    try {
        // Verify room exists and caller is admin
        const room = await prismaClient.room.findUnique({
            where: { id: roomId },
        });

        if (!room) {
            return res.status(404).json({ message: "Room not found" });
        }

        if (room.adminId !== userId) {
            return res.status(403).json({ message: "Only room admin can clear room shapes" });
        }

        await prismaClient.shapes.deleteMany({
            where: { roomId: roomId },
        });

        return res.json({ message: "Canvas cleared successfully" });
    } catch (e) {
        console.error("Delete shapes error:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
});

const port: number = Number(process.env.PORT || 4000);

app.listen(port, "0.0.0.0", () => {
    console.log(`Server started on port ${port}`);
});