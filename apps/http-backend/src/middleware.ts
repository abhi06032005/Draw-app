import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/common-backend/config";

interface AuthenticatedRequest extends Request{
    userId? : string
} 
export function middleware(req:AuthenticatedRequest , res:Response , next:NextFunction){
    const header=  req.headers["authorization"];

    if(!header){
        res.status(411).json({
            message: "not signed in"
        })
        return
    }

    const token = header.split(" ")[1]

    const decoded = jwt.verify(token as string , JWT_SECRET) as {userId : string}

    if(decoded){
        req.userId = decoded.userId
        next();
    }
    else{
        res.status(403).json({
           message: "unauthorized access" 
        })
    }


}