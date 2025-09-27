import  { WebSocket,WebSocketServer } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken"
import { JWT_SECRET } from "@repo/common-backend/config"
const wss= new WebSocketServer({port:8080});
import { prismaClient } from "@repo/db/client";

interface User {
    ws:WebSocket,
    rooms: string[],
    userId : string
}

const  users : User[] =[]

function checkUser(token: string):string | null{
    const decoded = jwt.verify(token  , JWT_SECRET)
    try{
         if(typeof decoded ==="object" && decoded != null && "userId" in decoded){
        const userId = (decoded as JwtPayload).userId

        return userId
    }
    else{
        return null
    }
    }
    catch(e){
        return null
    }
    
   

    // if(decoded == "string"){
    //     return null
    // }

    // if(!decoded || !decoded.userId){
    //     return null;
    // }

    // return decoded.userId
}

wss.on('connection', function connection(ws, request){
    const url = request.url

    if(!url){
        return
    }
    const queryParams = new URLSearchParams(url.split('?')[1])
    const token = queryParams.get('token') || "";

    const userId= checkUser(token)

    if(!userId){
        ws.close()
        return null;
    }

    users.push({
        userId,
        rooms: [],
        ws: ws as unknown as WebSocket // Type assertion to satisfy the User interface
    })
   
    ws.on('message' , async function message(data){
        const parsedData =JSON.parse(data as unknown as string)// {type: "join_rooom", roomId:1}

        if(parsedData.type ==="join_room"){
            const user  = users.find(x =>x.ws === ws);
            user?.rooms.push(parsedData.roomId)

        }

        if(parsedData.type === "leave_room"){
            const user  = users.find(x =>x.ws === ws);
            if(!user){
                return;
            }
            user.rooms = user.rooms.filter(x=> x !== parsedData.roomId)
  
        }
        
        if(parsedData.type ==="chat"){
            const roomId =parsedData.roomId;
            const message = parsedData.message


            await prismaClient.chat.create(
                {
                    data:{
                        roomId,
                        message,
                        userId 
                    }
                }
            )
            users.forEach(user =>{
                if(user.rooms.includes(roomId)){
                    user.ws.send(JSON.stringify({
                        type:"chat",
                        roomId,
                        message :message
                    }))  
                }
            })
        }

    });
})