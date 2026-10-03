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


export const UpdateSceneSchema = z.object({
  elements: z.array(z.any()).optional(),
  appState: z.record(z.string(), z.any()).optional(),
  files: z.record(z.string(), z.any()).optional(),
});

export const AddMemberSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]).default("EDITOR"),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});