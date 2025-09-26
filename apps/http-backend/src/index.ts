import express from "express";
import {signupSchema , signinSchema , roomSchema} from "@repo/common/types";
import  jwt  from "jsonwebtoken";
import {prismaClient} from "@repo/db/client"
import { JWT_SECRET } from "@repo/common-backend/config";
import { middleware } from "./middleware";
const app= express();
app.use(express.json()) 
//  dont forget this solving took 2hrs


app.post("/signup", async function(req, res){

    const parsedData = signupSchema.safeParse(req.body)

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

     res.json({
        message: " user created successfully"
     })
    }
    catch(e){
        console.log(e)
    }
})


app.post("/signin", function(req, res){
    const userId =1

    const data = signinSchema.safeParse(req.body)

    if(!data){
        res.status(403).json({
            messsage:"incorrect inputs"
        })
    }

    const token =jwt.sign({
        userId
    },JWT_SECRET)

    res.json({
        token:token
    })
})


app.post("/room", middleware ,function(req, res){
    const data = roomSchema.safeParse(req.body)

    if(!data){
        res.status(403).json({
            messsage:"incorrect inputs"
        })
    }

    res.json({
        roomId : 123
    })
    
})

app.listen(4000)