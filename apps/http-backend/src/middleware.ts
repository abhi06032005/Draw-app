import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/common-backend/config";


export function middleware(req:Request , res:Response , next:NextFunction){
    const header=  req.headers["authorization"];

    if(!header){
        res.status(411).json({
            message: "not signed in"
        })
        return
    }

    const token = header.split(" ")[1]

    const decoded = jwt.verify(token as string , JWT_SECRET)

    if(decoded){
        //@ts-ignore
        req.userId = decoded.userId
        next();
    }
    else{
        res.status(403).json({
           message: "unauthorized access" 
        })
    }


}