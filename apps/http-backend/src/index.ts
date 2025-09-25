
import express from "express";
import {signupSchema , signinSchema , roomSchema} from "@repo/common/types";
import  jwt  from "jsonwebtoken";
import { JWT_SECRET } from "@repo/common-backend/config";
import { middleware } from "./middleware";
const app= express();



app.post("/signup", function(req, res){

    const data = signupSchema.safeParse(req.body)

    if(!data){
        res.status(403).json({
            messsage:"incorrect inputs"
        })
    }
    res.json({
        userId : 123
    })
    

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