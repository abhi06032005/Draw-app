"use client"
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { FaRegCircle } from "react-icons/fa6";
import { RiRectangleLine } from "react-icons/ri";
import { MdModeEditOutline } from "react-icons/md";
import { FaSlash } from "react-icons/fa";
import { FaEraser } from "react-icons/fa6";
import { RiDeleteBin5Line } from "react-icons/ri";

import { BACKEND_URL } from "@/config";
import ChatRoomClient from "./ChatRoomClient";

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
  | {
      type: "line";
      x: number;
      y: number;
      endX: number;
      endY: number;
    }
  | {
      type: "pencil";
      points: { x: number; y: number }[];
    };

interface CanvasProps {
  roomId: string;
  socket: WebSocket;
}

export function Canvas({ roomId, socket }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chats, setChats] = useState<{ message: string }[]>([]);
  const [shapeToDraw, setShape] = useState<
    "rect" | "circle" | "pencil" | "line" | "eraser" | "pointer" | "clear"
  >("pointer");
  const currentShapeRef = useRef(shapeToDraw);
  const [shapes, setShapes] = useState<Shapes[]>([]);

  useEffect(() => {
    currentShapeRef.current = shapeToDraw;
  }, [shapeToDraw]);

  // Fetch shapes initially and when roomId changes
  useEffect(() => {
    if (!roomId) return;

    async function fetchShapes() {
      const existingShapes = await getExistingShapes(roomId);
      setShapes(existingShapes);
    }

    fetchShapes();
  }, [roomId]);

  // Draw shapes on canvas whenever shapes state updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    clearCanvas(shapes, canvas, ctx);
  }, [shapes]);

  // Drawing logic and mouse event handlers
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d") || new CanvasRenderingContext2D();
    if (!ctx) return;

    let clicked = false;
    let drawing = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let pencilCoordinates: { x: number; y: number }[] = [];

    function handleMouseDown(e: MouseEvent) {
      clicked = true;
      const currentShape = currentShapeRef.current;

      if (currentShape === "pencil") {
        drawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        pencilCoordinates.push({ x: lastX, y: lastY });
      }
      if (
        currentShape === "rect" ||
        currentShape === "circle" ||
        currentShape === "line"
      ) {
        drawing = true;
        startX = e.offsetX;
        startY = e.offsetY;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        clearCanvas(shapes, canvas, ctx);
      }
    }

    function handleMouseMove(e: MouseEvent) {
      const currentShape = currentShapeRef.current;

      if (clicked && drawing && currentShape === "pencil") {
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
        [lastX, lastY] = [e.offsetX, e.offsetY];
        pencilCoordinates.push({ x: lastX, y: lastY });
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      clearCanvas(shapes, canvas, ctx);

      if (clicked && drawing && currentShape === "line") {
        const endX = e.offsetX;
        const endY = e.offsetY;
        ctx.beginPath();
        ctx.strokeStyle = "white";
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
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
      const currentShape = currentShapeRef.current;

      if (currentShape === "pencil") {
        const shape: Shapes = {
          type: "pencil",
          points: pencilCoordinates,
        };
        setShapes((prev) => [...prev, shape]);
        socket.send(
          JSON.stringify({
            type: "shape",
            message: JSON.stringify(shape),
            roomId: Number(roomId),
          })
        );
        pencilCoordinates = [];
      }

      if (currentShape === "line") {
        const endX = e.offsetX;
        const endY = e.offsetY;
        const shape: Shapes = {
          type: "line",
          x: startX,
          y: startY,
          endX,
          endY,
        };
        setShapes((prev) => [...prev, shape]);
        socket.send(
          JSON.stringify({
            type: "shape",
            message: JSON.stringify(shape),
            roomId: Number(roomId),
          })
        );
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
        setShapes((prev) => [...prev, shape]);
        socket.send(
          JSON.stringify({
            type: "shape",
            message: JSON.stringify(shape),
            roomId: Number(roomId),
          })
        );
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
        setShapes((prev) => [...prev, shape]);
        socket.send(
          JSON.stringify({
            type: "shape",
            roomId: Number(roomId),
            message: JSON.stringify(shape),
          })
        );
      }
      setShape("pointer");
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [roomId, socket, shapes]);

  // Listen to incoming shapes from socket and add to shapes state
  useEffect(() => {
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "shape") {
        const parsedShape = JSON.parse(message.message);
        setShapes((prev) => [...prev, parsedShape]);
      }
    };
  }, [socket]);

  // Fetch chat messages
  useEffect(() => {
    if (!roomId) return;

    async function fetchChats() {
      const existingChats = await getExistingChats(roomId);
      setChats(existingChats);
    }

    fetchChats();
  }, [roomId]);

  // Clear canvas & shapes on clear button
  function handleClear() {
    setShapes([]); // clears shapes state, triggers canvas redraw
    setShape("pointer");
  }

  return (
    <div className="h-screen bg-gray-900 w-screen overflow-hidden relative ">
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-5 text-white z-10 rounded-2xl bg-gray-800 p-3">
        <button
          onClick={() => setShape("circle")}
          className="bg-gray-600 items-center justify-center flex rounded-md text-2xl p-2 cursor-pointer hover:bg-gray-400"
        >
          <FaRegCircle />
        </button>
        <button
          onClick={() => setShape("rect")}
          className="bg-gray-600 items-center justify-center flex rounded-md text-2xl p-2 cursor-pointer hover:bg-gray-400"
        >
          <RiRectangleLine />
        </button>
        <button
          onClick={() => setShape("line")}
          className="bg-gray-600 items-center justify-center flex rounded-md text-2xl p-2 cursor-pointer hover:bg-gray-400"
        >
          <FaSlash />
        </button>
        <button
          onClick={() => setShape("pencil")}
          className="bg-gray-600 items-center justify-center flex rounded-md text-2xl p-2 cursor-pointer hover:bg-gray-400"
        >
          <MdModeEditOutline />
        </button>
        <button
          onClick={() => setShape("eraser")}
          className="bg-gray-600 items-center justify-center flex rounded-md text-2xl p-2 cursor-pointer hover:bg-gray-400"
        >
          <FaEraser />
        </button>
        <button
          onClick={handleClear}
          className="bg-gray-600 items-center justify-center flex rounded-md text-2xl p-2 cursor-pointer hover:bg-gray-400"
        >
          <RiDeleteBin5Line />
        </button>
      </div>

      <ChatRoomClient id={roomId} messages={chats} socket={socket} />
      <canvas
        width={window.innerWidth}
        height={window.innerHeight}
        ref={canvasRef}
        style={{ background: "#1A1A1A" }}
      />
    </div>
  );
}

// helper functions
function clearCanvas(
  existingShapes: Shapes[],
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  existingShapes.forEach((shape) => {
    if (shape.type === "pencil") {
      ctx.beginPath();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      shape.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }

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

    if (shape.type === "line") {
      ctx.beginPath();
      ctx.strokeStyle = "white";
      ctx.moveTo(shape.x, shape.y);
      ctx.lineTo(shape.endX, shape.endY);
      ctx.stroke();
      ctx.closePath();
    }
  });
}

async function getExistingShapes(roomId: string) {
  try {
    const res = await axios.get(`${BACKEND_URL}/shapes/${roomId}`);
    const messages = res.data?.messages || [];

    const shapes = messages
      .map((x: { message: string }) => {
        try {
          return JSON.parse(x.message);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return shapes;
  } catch (err) {
    console.error("Error fetching existing shapes:", err);
    return [];
  }
}

async function getExistingChats(roomId: string) {
  try {
    const res = await axios.get(`${BACKEND_URL}/chats/${roomId}`);
    const messages = res.data?.messages || [];

    const chats = messages
      .map((x: { message: string }) => {
        if (typeof x.message === "string") return { message: x.message };
        try {
          return JSON.parse(x.message);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return chats;
  } catch (err) {
    console.error("Error fetching existing chats:", err);
    return [];
  }
}
