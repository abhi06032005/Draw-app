"use client"
import { WS_URL } from "@/config";
import { Canvas } from "./Canvas";
import { useEffect, useRef, useState } from "react";

export function CanvasRoom({roomId}: {roomId:string} ){

    const [socket , setSocket] = useState<WebSocket | null>(null)

    useEffect(()=>{
        const ws = new WebSocket(`${WS_URL}?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5ZTNhNTVlZC02NDA4LTQ1OWMtOTUyNC1hMTZiYmQ4YzA0YzciLCJpYXQiOjE3NTkwNTE2MzJ9.39igDwxbyB3tM8gRdvYoU_GacwWW9i3_gTA6uOYVDpw`)

        ws.onopen = ()=>{
            setSocket(ws)
            ws.send(JSON.stringify({
                type : "join_room",
                roomId
            }))
        }
    },[])

    if(!socket){
        return(
            <div>
                connecting to server .....
            </div>
        )
    }

    return <div>
        <Canvas roomId ={roomId} socket={socket}/>
    </div>
}