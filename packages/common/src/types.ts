import {z} from "zod"

export const signupSchema = z.object({
    username : z.email(),
    name:z.string(),
    password: z.string()
})


export const signinSchema = z.object({
    username : z.email(),
    password: z.string()
})

export const roomSchema =z.object({
    room: z.string()
})