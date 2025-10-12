"use client";
import { WS_URL } from "@/config";
import { Canvas } from "./Canvas";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function CanvasRoom({roomId}: {roomId:string} ){

    const [socket , setSocket] = useState<WebSocket | null>(null)

    const router = useRouter();
    useEffect(()=>{
        const token = localStorage.getItem("Authorization");
        if(!token){
            router.push("/login")
            return;
        }
        const ws = new WebSocket(`${WS_URL}?token=${token}`)

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