

import { BACKEND_URL } from "@/config";
import axios from "axios";
import { clear } from "console";

type Shapes ={
    type : "rect";
    x: number;
    y: number;
    width : number;
    height: number;
} |
{
    type : "circle";
    centerX: number;
    centerY: number;
    radius : number;

}

export async function initDraw(canvas: HTMLCanvasElement , roomId: string , socket : WebSocket) {
     

        if (!canvas) return;

        let existingShapes : Shapes[] = await getExistingShapes(roomId);

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        socket.onmessage =(event)=>{
            const message =JSON.parse(event.data)

            if(message.type ==="chat"){
                const parsedShape = JSON.parse(message.message)
                existingShapes.push(parsedShape)
                clearCanvas(existingShapes, canvas,ctx)
            }

        }


        clearCanvas(existingShapes, canvas,ctx)// get the present shapes and render it


        let clicked = false;
        let drawing = false
        let startX = 0;
        let startY = 0;

        
        canvas.addEventListener("mousedown", (e)=>{
            clicked = true;
            clearCanvas(existingShapes , canvas, ctx)
            const rect = canvas.getBoundingClientRect();
            drawing = true;
            startX = e.offsetX ;
            startY = e.offsetY ;
        });

        canvas.addEventListener("mouseup", (e)=>{
            // clicked = false;
            // const width = e.offsetX - startX;
            // const height = e.offsetY - startY;
            // const shape : Shapes = {
            //     type:"rect",
            //     x: startX,
            //     y: startY,
            //     width,
            //     height
            // }
            // existingShapes.push(shape )

            // socket.send(JSON.stringify({
            //     type : "chat",
            //     message :JSON.stringify(shape),
            //     roomId: Number(roomId)
                
        // }))
        clicked = false
        drawing = false

        const endX = e.offsetX ;
        const endY = e.offsetY ;
        const radius = Math.sqrt(Math.pow((endX - startX),2) +Math.pow((endY - startY),2) )

        const shape : Shapes={
            type : "circle",
            centerX: startX,
            centerY: startY,
            radius : radius
        }
        
        existingShapes.push(shape)

        socket.send(JSON.stringify({

            type: "chat",
            roomId: Number(roomId),
            message: JSON.stringify(shape)

        }))
        clearCanvas(existingShapes , canvas, ctx)
            
        });

        canvas.addEventListener("mousemove", (e)=>{
            // if (clicked) {
            //     const width = e.offsetX - startX;
            //     const height = e.offsetY - startY;
               
            //     clearCanvas(existingShapes , canvas, ctx)
            //     ctx.strokeStyle = "rgba(255, 255, 255)";
            //     ctx.strokeRect(startX, startY, width, height);
            // }

            clearCanvas(existingShapes , canvas, ctx)
            if(clicked && drawing){
               
                const endX = e.offsetX ;
                const endY= e.offsetY ;

                const radius= Math.sqrt(Math.pow((endX -startX),2) + Math.pow((endY -startY),2))

                ctx.beginPath();
                ctx.arc(startX, startY , radius ,0 , Math.PI *2 )
                ctx.strokeStyle ="white";
                ctx.stroke()
                ctx.closePath()

            }
        });
}

function clearCanvas(existingShapes : Shapes[] , canvas: HTMLCanvasElement ,ctx :CanvasRenderingContext2D){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    existingShapes.map((shape )=>{
        if (shape.type ==="rect"){
            ctx.strokeStyle = "rgba(255, 255, 255)";
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        }
        if(shape.type ==="circle"){
            ctx.beginPath();
                ctx.arc(shape.centerX, shape.centerY , shape.radius ,0 , Math.PI *2 )
                ctx.strokeStyle ="white";
                ctx.stroke()
                ctx.closePath()
        }
    })

}

async function getExistingShapes(roomId : string ){
    const res = await axios.get(`${BACKEND_URL}/chats/${roomId}`)
    const messages = res.data.messages;

    const shapes =messages.map((x:{message : string})=>{
        const messageData = JSON.parse(x.message)
        return messageData
    })

    return shapes
}