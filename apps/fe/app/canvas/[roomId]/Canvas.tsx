import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "@/config";

type Shapes =
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      type: "circle";
      centerX: number;
      centerY: number;
      radius: number;
    }
    |
    {
        type :"line";
        x : number;
        y: number;
        endX :number;
        endY: number
    };

interface CanvasProps {
  roomId: string;
  socket: WebSocket;
}

export function Canvas({ roomId, socket }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapeToDraw, setShape] = useState<"rect" | "circle" | "pencil" | "line" | "eraser">("pencil");
  const currentShapeRef = useRef("")
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let isMounted = true;

    async function Draw() {
        
        if (!canvasRef.current) return;
        // 1. fetch existing shapes
        const existingShapes: Shapes[] = await getExistingShapes(roomId);
        if (!isMounted) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d") || new CanvasRenderingContext2D();
      if (!ctx) return;

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "chat") {
          const parsedShape = JSON.parse(message.message);
          existingShapes.push(parsedShape);
          clearCanvas(existingShapes, canvas, ctx);
        }
      };

      clearCanvas(existingShapes, canvas, ctx);

      // states for drawing
     
      let clicked = false;
      let drawing = false;
      let startX = 0;
      let startY = 0;

      function handleMouseDown(e: MouseEvent) {
        clicked = true;
         const currentShape =  currentShapeRef.current
        if (currentShape === "rect" || currentShape=== "circle" || currentShape ==="line") {
          drawing = true;
          startX = e.offsetX;
          startY = e.offsetY;
          clearCanvas(existingShapes, canvas, ctx);
        }
      }

      function handleMouseMove(e: MouseEvent) {
        clearCanvas(existingShapes, canvas, ctx);
         const currentShape =  currentShapeRef.current

         if(clicked && drawing && currentShape === "line"){

            const endX = e.offsetX;
            const endY = e.offsetY;

            ctx.beginPath();
            ctx.strokeStyle = "white";
            ctx.moveTo(startX , startY)
            ctx.lineTo(endX , endY)
            ctx.stroke();
            ctx.closePath();
         }
        if (clicked && drawing && currentShape === "rect") {
          const width = e.offsetX - startX;
          const height = e.offsetY - startY;

          ctx.strokeStyle = "white";
          ctx.strokeRect(startX, startY, width, height);
        }

        if (clicked && drawing && currentShape === "circle") {
          const endX = e.offsetX;
          const endY = e.offsetY;
          const radius = Math.sqrt(
            Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
          );

          ctx.beginPath();
          ctx.arc(startX, startY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = "white";
          ctx.stroke();
          ctx.closePath();
        }
      }

      function handleMouseUp(e: MouseEvent) {
        clicked = false;
        drawing = false;
        const currentShape =  currentShapeRef.current

        if(currentShape ==="line"){
            const endX = e.offsetX;
            const endY = e.offsetY;

            const shape :Shapes={
                type :"line",
                x : startX,
                y: startY,
                endX : endX,
                endY: endY
            };
            existingShapes.push(shape)

            socket.send(JSON.stringify({
                type :"chat",
                message: JSON.stringify(shape),
                roomId: Number(roomId)
            }));    

            clearCanvas(existingShapes ,canvas , ctx )
        }

        if (currentShape === "rect") {
          const width = e.offsetX - startX;
          const height = e.offsetY - startY;
          const shape: Shapes = {
            type: "rect",
            x: startX,
            y: startY,
            width,
            height,
          };
          existingShapes.push(shape);

          socket.send(
            JSON.stringify({
              type: "chat",
              message: JSON.stringify(shape),
              roomId: Number(roomId),
            })
          );
          clearCanvas(existingShapes, canvas, ctx);
          
        }

        if (currentShape === "circle") {
          
          const endX = e.offsetX;
          const endY = e.offsetY;
          const radius = Math.sqrt(
            Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
          );

          const shape: Shapes = {
            type: "circle",
            centerX: startX,
            centerY: startY,
            radius,
          };
          existingShapes.push(shape);

          socket.send(
            JSON.stringify({
              type: "chat",
              roomId: Number(roomId),
              message: JSON.stringify(shape),
            })
          );
          
          clearCanvas(existingShapes, canvas, ctx);
        }
        setShape("pencil");
      }

      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseup", handleMouseUp);

      cleanup = () => {
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseup", handleMouseUp);
      };
    };

    Draw();

    return () => {
      isMounted = false;
      
      if (cleanup) cleanup();
    };
  }, [roomId, socket]);

  useEffect(()=>{
    currentShapeRef.current = shapeToDraw
  },[shapeToDraw])

  return (
    <div>
        <div className="top-10 left-10 flex gap-5">
        <button onClick={() => setShape("circle")}>Circle</button>
        <button onClick={() => setShape("rect")}>Rectangle</button>
        <button onClick={()=> setShape("line")}>Line</button>
        <button onClick={()=>setShape("eraser")}>Eraser</button>
      </div>
      <canvas
        width={window.innerWidth}
        height={window.innerHeight}
        ref={canvasRef}
        style={{ background: "black" }}
      />
      
    </div>
  );
}

// helper functions
function clearCanvas(existingShapes: Shapes[], canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  existingShapes.forEach((shape) => {
    if (shape.type === "rect") {
      ctx.strokeStyle = "white";
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    }
    if (shape.type === "circle") {
      ctx.beginPath();
      ctx.arc(shape.centerX, shape.centerY, shape.radius, 0, Math.PI * 2);
      ctx.strokeStyle = "white";
      ctx.stroke();
      ctx.closePath();
    }

    if(shape.type === "line"){
        ctx.beginPath();
        ctx.strokeStyle = "white";
        ctx.moveTo(shape.x , shape.y)
        ctx.lineTo(shape.endX , shape.endY)
        ctx.stroke();
        ctx.closePath();
    }
  });
}

async function getExistingShapes(roomId: string) {
  try {
    const res = await axios.get(`${BACKEND_URL}/chats/${roomId}`);
    const messages = res.data?.messages || [];

    const shapes = messages
      .map((x: { message: string }) => {
        try {
          return JSON.parse(x.message);
        } catch {
          return null; // ignore invalid JSON
        }
      })
      .filter(Boolean); // remove nulls

    return shapes;
  } catch (err) {
    console.error("Error fetching existing shapes:", err);
    return [];
  }
}
