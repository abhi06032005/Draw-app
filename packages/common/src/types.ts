import {z} from "zod"

export const CreateSignupSchema = z.object({
    username : z.email(),
    name:z.string(),
    password: z.string()
})


export const SigninSchema = z.object({
    username : z.email(),
    password: z.string()
})

export const CreateRoomSchema =z.object({
    name: z.string().min(3).max(20)
})