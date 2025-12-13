import express from "express"; 
import bcrypt from "bcrypt";
import cors from "cors"
import {CreateSignupSchema,SigninSchema, CreateRoomSchema} from "@repo/common/types";
import  jwt  from "jsonwebtoken";
import {prismaClient} from "@repo/db/client"
import { JWT_SECRET } from "@repo/common-backend/config";
import { middleware } from "./middleware";
const app= express();
app.use(express.json()) 
app.use(cors({
    origin: "*"
}));



app.post("/signup", async function(req, res){

    const parsedData = CreateSignupSchema.safeParse(req.body)
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

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
            password : hashedPassword,
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
                email : parsedData.data.username
            }
        })

        if(!user){
            res.status(404).json({
                message : "User does not exist"
            })
            return
        }

        const matchPassword = await bcrypt.compare(
            parsedData.data.password,
            user.password
        )

       if(!matchPassword){
        res.status(403).json({
            message: "Incorrect password"
        })
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

app.get("/user" , middleware , async function (req , res) 
{
    //@ts-ignore
    const userId = req.userId
    try{
        const user = await prismaClient.user.findUnique({
            where:{id : userId},
            select:{
                id: true,
                email: true,
                name:true
            }

        })

        if(!user){
            return res.status(500).json({message: " internal server error"})
        }

        res.json(user)
    }
    catch(err){
        return res.status(404)
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
        res.status(201).json({
            roomId : room.slug,
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
        take:30

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
            res.status(403).json({
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


app.get("/shapes/:roomId", async function (req, res){

    try {
          const roomId = Number(req.params.roomId)
    const messages = await prismaClient.shapes.findMany({
        where:{
            roomId : roomId
        },
        orderBy:{
            id: "desc"
        },
        take:40

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

app.delete("/delete/:roomId", middleware , async function(req, res){
    const roomId = Number(req.params.roomId)

    try{
        await prismaClient.shapes.deleteMany({
        where:{
            roomId : roomId
        }
    })
    }
    catch(e){
       res.status(500)
    }
   
})
         



const port: number = Number(process.env.PORT || 4000)

app.listen(port ,"0.0.0.0",()=>{
    console.log(`server started on port ${port}`)
})