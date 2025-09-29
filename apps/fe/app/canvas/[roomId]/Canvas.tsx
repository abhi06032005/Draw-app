import { initDraw } from "@/draw/initDraw";
import { Socket } from "dgram";
import { useEffect, useRef } from "react"

interface CanvasProps{
    roomId : string ;   
    socket: WebSocket;
}

export function Canvas({roomId , socket}:CanvasProps){
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current) {
            initDraw(canvasRef.current, roomId, socket);
        }
    }, [canvasRef]);

    return (
        <>
            <canvas width={2000} height={1000} ref={canvasRef} style={{ background: "black" }} />
        </>
    );
}