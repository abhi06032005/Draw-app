import express from "express"; 
import cors from "cors"
import {CreateSignupSchema,SigninSchema, CreateRoomSchema} from "@repo/common/types";
import  jwt  from "jsonwebtoken";
import {prismaClient} from "@repo/db/client"
import { JWT_SECRET } from "@repo/common-backend/config";
import { middleware } from "./middleware";
const app= express();
app.use(express.json()) 
app.use(cors())
//  dont forget this solving took 2hr


app.post("/signup", async function(req, res){

    const parsedData = CreateSignupSchema.safeParse(req.body)

    if(!parsedData.success){
        res.status(403).json({
            messsage:"incorrect inputs"
        })
        return;
    }
    const userExists = await prismaClient.user.findFirst({
        where: {
            email: parsedData.data.username
        }
    })

    if(userExists){
        res.status(403).json({
            message:"email already exists"
        })
        return
    }
    
    try{
        await prismaClient.user.create({
        data:{
            email: parsedData.data.username,
            password : parsedData.data.password,
            name: parsedData.data.name
        }}
     )

     res.status(201).json({
        message: " user created successfully"
     })
    }
    catch(e){
        console.log(e)
    }
})


app.post("/signin", async function(req, res){
    
    const parsedData = SigninSchema.safeParse(req.body)
    
    
    
    if(!parsedData.success){
        res.status(403).json({
            messsage:"incorrect inputs"
        })
        return;
    }

    try{
        const user =await prismaClient.user.findFirst({
            where:{
                email : parsedData.data.username,
                password: parsedData.data.password
            }
        })

        if(!user){
            res.status(403).json({
                message : "wrong username or password"
            })
            return
        }

       
        const userId = user.id

        const token =jwt.sign({
            userId
        },JWT_SECRET)

        res.status(201).json({
            token:token
        })

    }catch(e){
        console.log(e)
    }

   
})


app.post("/room", middleware ,async function(req, res){
    const parsedData = CreateRoomSchema.safeParse(req.body)

    if(!parsedData.success){
        res.status(403).json({
            messsage:"incorrect inputs"
        })
        return
    }
    //@ts-ignore
    const userId = req.userId

    try{
        const room =await prismaClient.room.create({
            data:{
                adminId : userId,
                slug: parsedData.data.name
            }
        })
        res.json({
            roomId : room.slug,
            time: room.createAt,
            Admin : room.adminId
        })

    }
    catch(e){
        console.log(e)
    }
    
})

app.get("/chats/:roomId", async function (req, res){

    try {
          const roomId = Number(req.params.roomId)
    const messages = await prismaClient.chat.findMany({
        where:{
            roomId : roomId
        },
        orderBy:{
            id: "desc"
        },
        take: 50

    })

    res.json({
        messages
    })
    }
    catch(e)
    {
       console.error(e);
    res.status(500).json({ error: "Failed to fetch messages" });
    }
  
})

app.get("/room/:slug", async function (req, res){
    const slug  =req.params.slug

    try{
        const room = await prismaClient.room.findUnique({
        where:{
            slug :slug
        }

        })

        if(!room){
            res.json({
                message:" NO room exists!!"
            })
            return
        }

        res.json({
            roomId : room.id
        })
    }
    catch(e){
        res.json({
            e
        })
    }

    
})




app.listen(4000)