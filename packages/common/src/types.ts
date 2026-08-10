import { z } from "zod";

export const CreateSignupSchema = z.object({
  username: z.string().email("Invalid email format").max(100),
  name: z.string().min(1, "Name is required").max(50, "Name too long").trim(),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

export const SigninSchema = z.object({
  username: z.string().email("Invalid email format").max(100),
  password: z.string().min(1, "Password is required").max(128),
});

export const CreateRoomSchema = z.object({
  name: z
    .string()
    .min(3, "Room name must be at least 3 characters")
    .max(30, "Room name must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Room name can only contain letters, numbers, hyphens, and underscores"),
});

export const WsJoinRoomSchema = z.object({
  type: z.literal("join_room"),
  roomId: z.union([z.number(), z.string()]),
});

export const WsLeaveRoomSchema = z.object({
  type: z.literal("leave_room"),
  roomId: z.union([z.number(), z.string()]),
});

export const WsChatSchema = z.object({
  type: z.literal("chat"),
  roomId: z.union([z.number(), z.string()]),
  message: z.string().min(1).max(2000, "Chat message exceeds 2000 characters"),
});

export const WsShapeSchema = z.object({
  type: z.literal("shape"),
  roomId: z.union([z.number(), z.string()]),
  message: z.string().min(1).max(100000, "Shape payload size limit exceeded"),
});