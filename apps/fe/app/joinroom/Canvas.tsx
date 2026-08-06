"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { BACKEND_URL } from "@/config";
import ChatRoomClient from "./ChatRoomClient";
import {
  MousePointer,
  Pencil,
  Square,
  Circle as CircleIcon,
  Minus,
  MoveRight,
  Type as TypeIcon,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Share2,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Palette,
  Sliders,
  X
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
export type Shapes =
  | { id: string; type: "rect"; x: number; y: number; width: number; height: number; color: string; lineWidth: number; fill?: string }
  | { id: string; type: "circle"; centerX: number; centerY: number; radius: number; color: string; lineWidth: number; fill?: string }
  | { id: string; type: "line"; x: number; y: number; endX: number; endY: number; color: string; lineWidth: number }
  | { id: string; type: "arrow"; x: number; y: number; endX: number; endY: number; color: string; lineWidth: number }
  | { id: string; type: "pencil"; points: { x: number; y: number }[]; color: string; lineWidth: number }
  | { id: string; type: "text"; x: number; y: number; text: string; color: string; fontSize: number; lineWidth?: number };

export type Tool = "pointer" | "pencil" | "rect" | "circle" | "line" | "arrow" | "text" | "eraser";

interface CanvasProps {
  roomId: string;
  socket: WebSocket;
}

// ─── Preset Color Palette ────────────────────────────────────────────
const COLORS = [
  { hex: "#ffffff", label: "Pure White" },
  { hex: "#a78bfa", label: "Vibrant Violet" },
  { hex: "#34d399", label: "Emerald Green" },
  { hex: "#f472b6", label: "Neon Pink" },
  { hex: "#fb923c", label: "Sunset Orange" },
  { hex: "#facc15", label: "Bright Yellow" },
  { hex: "#38bdf8", label: "Sky Blue" },
  { hex: "#f87171", label: "Coral Red" },
];

const STROKE_WIDTHS = [1, 2, 4, 6, 8];

// Unique ID generator
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ─── Helper: Shape Bounds ─────────────────────────────────────────────
function getShapeBounds(shape: Shapes) {
  if (shape.type === "rect") {
    const minX = Math.min(shape.x, shape.x + shape.width);
    const maxX = Math.max(shape.x, shape.x + shape.width);
    const minY = Math.min(shape.y, shape.y + shape.height);
    const maxY = Math.max(shape.y, shape.y + shape.height);
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  } else if (shape.type === "circle") {
    return {
      minX: shape.centerX - shape.radius,
      minY: shape.centerY - shape.radius,
      maxX: shape.centerX + shape.radius,
      maxY: shape.centerY + shape.radius,
      width: shape.radius * 2,
      height: shape.radius * 2,
    };
  } else if (shape.type === "line" || shape.type === "arrow") {
    const minX = Math.min(shape.x, shape.endX);
    const maxX = Math.max(shape.x, shape.endX);
    const minY = Math.min(shape.y, shape.endY);
    const maxY = Math.max(shape.y, shape.endY);
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  } else if (shape.type === "pencil") {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shape.points.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  } else if (shape.type === "text") {
    const fontSize = shape.fontSize || 18;
    const width = Math.max(20, (shape.text.length || 1) * (fontSize * 0.6));
    const height = fontSize * 1.2;
    return { minX: shape.x, minY: shape.y - fontSize, maxX: shape.x + width, maxY: shape.y + 4, width, height };
  }
  return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
}

// ─── Helper: Distance to Line Segment ────────────────────────────────
function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// ─── Helper: Hit Test Shape ──────────────────────────────────────────
function hitTestShape(shape: Shapes, px: number, py: number, threshold = 12): boolean {
  const bounds = getShapeBounds(shape);
  if (px < bounds.minX - threshold || px > bounds.maxX + threshold || py < bounds.minY - threshold || py > bounds.maxY + threshold) {
    return false;
  }

  if (shape.type === "rect" || shape.type === "text") {
    return true;
  } else if (shape.type === "circle") {
    const dist = Math.hypot(px - shape.centerX, py - shape.centerY);
    return dist <= shape.radius + threshold;
  } else if (shape.type === "line" || shape.type === "arrow") {
    return distToSegment(px, py, shape.x, shape.y, shape.endX, shape.endY) <= threshold;
  } else if (shape.type === "pencil") {
    for (let i = 0; i < shape.points.length - 1; i++) {
      if (distToSegment(px, py, shape.points[i].x, shape.points[i].y, shape.points[i + 1].x, shape.points[i + 1].y) <= threshold) {
        return true;
      }
    }
    return false;
  }
  return false;
}

// ─── Helper: Move/Translate Shape ────────────────────────────────────
function moveShape(shape: Shapes, dx: number, dy: number): Shapes {
  if (shape.type === "rect") {
    return { ...shape, x: shape.x + dx, y: shape.y + dy };
  } else if (shape.type === "circle") {
    return { ...shape, centerX: shape.centerX + dx, centerY: shape.centerY + dy };
  } else if (shape.type === "line" || shape.type === "arrow") {
    return { ...shape, x: shape.x + dx, y: shape.y + dy, endX: shape.endX + dx, endY: shape.endY + dy };
  } else if (shape.type === "pencil") {
    return { ...shape, points: shape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
  } else if (shape.type === "text") {
    return { ...shape, x: shape.x + dx, y: shape.y + dy };
  }
  return shape;
}

// ─── Helper: Draw Arrow ──────────────────────────────────────────────
function drawArrow(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, headLength = 15) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

// ─── Render Canvas Function ──────────────────────────────────────────
function renderCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shapes: Shapes[],
  selectedIdx: number | null,
  eraserPos: { x: number; y: number } | null,
  zoom = 1
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Excalidraw dot matrix grid
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  const gridSize = 24 * zoom;
  for (let x = gridSize; x < width; x += gridSize) {
    for (let y = gridSize; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Render Shapes
  shapes.forEach((shape, index) => {
    ctx.save();
    ctx.strokeStyle = shape.color || "#ffffff";
    ctx.lineWidth = ("lineWidth" in shape && shape.lineWidth) ? shape.lineWidth : 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (shape.type === "pencil") {
      if (shape.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.stroke();
      }
    } else if (shape.type === "rect") {
      if (shape.fill) {
        ctx.fillStyle = shape.fill;
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
      }
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    } else if (shape.type === "circle") {
      ctx.beginPath();
      ctx.arc(shape.centerX, shape.centerY, Math.max(0, shape.radius), 0, Math.PI * 2);
      if (shape.fill) {
        ctx.fillStyle = shape.fill;
        ctx.fill();
      }
      ctx.stroke();
    } else if (shape.type === "line") {
      ctx.beginPath();
      ctx.moveTo(shape.x, shape.y);
      ctx.lineTo(shape.endX, shape.endY);
      ctx.stroke();
    } else if (shape.type === "arrow") {
      drawArrow(ctx, shape.x, shape.y, shape.endX, shape.endY);
    } else if (shape.type === "text") {
      ctx.fillStyle = shape.color || "#ffffff";
      ctx.font = `${shape.fontSize || 18}px var(--font-inter), sans-serif`;
      ctx.fillText(shape.text, shape.x, shape.y);
    }
    ctx.restore();

    // Render Selection Outline & Corner Handles
    if (selectedIdx === index) {
      const bounds = getShapeBounds(shape);
      const pad = 8;
      const x = bounds.minX - pad;
      const y = bounds.minY - pad;
      const w = bounds.width + pad * 2;
      const h = bounds.height + pad * 2;

      ctx.save();
      ctx.strokeStyle = "#8b5cf6"; // Violet glow selection outline
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(x, y, w, h);

      // Corner handles
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#7c3aed";
      ctx.lineWidth = 2;
      const handles = [
        { hx: x, hy: y },
        { hx: x + w, hy: y },
        { hx: x, hy: y + h },
        { hx: x + w, hy: y + h },
      ];
      handles.forEach(({ hx, hy }) => {
        ctx.beginPath();
        ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();
    }
  });

  // Render Eraser Preview Ring
  if (eraserPos) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(eraserPos.x, eraserPos.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(248, 113, 113, 0.25)";
    ctx.strokeStyle = "#f87171";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// ─── Fetch Helpers ───────────────────────────────────────────────────
async function getExistingShapes(roomId: string): Promise<Shapes[]> {
  try {
    const res = await axios.get(`${BACKEND_URL}/shapes/${roomId}`);
    const messages = res.data?.messages || [];
    return messages
      .map((x: { message: string }) => {
        try {
          const p = JSON.parse(x.message);
          if (!p.id) p.id = generateId();
          return p;
        } catch { return null; }
      })
      .filter(Boolean);
  } catch { return []; }
}

async function getExistingChats(roomId: string): Promise<{ message: string }[]> {
  try {
    const res = await axios.get(`${BACKEND_URL}/chats/${roomId}`);
    const messages = res.data?.messages || [];
    return messages
      .map((x: { message: string }) => {
        if (typeof x.message === "string") return { message: x.message };
        try { return JSON.parse(x.message); } catch { return null; }
      })
      .filter(Boolean);
  } catch { return []; }
}

// ─── Main Component ───────────────────────────────────────────────────
export function Canvas({ roomId, socket }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chats, setChats] = useState<{ message: string }[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>("pointer");
  const [shapes, setShapes] = useState<Shapes[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [history, setHistory] = useState<Shapes[][]>([[]]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Floating text input modal state
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);

  // Refs for zero-flicker performance
  const toolRef = useRef(activeTool);
  const colorRef = useRef(selectedColor);
  const strokeRef = useRef(strokeWidth);
  const shapesRef = useRef(shapes);
  const selectedIdxRef = useRef(selectedIdx);
  const cursorPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { toolRef.current = activeTool; }, [activeTool]);
  useEffect(() => { colorRef.current = selectedColor; }, [selectedColor]);
  useEffect(() => { strokeRef.current = strokeWidth; }, [strokeWidth]);
  useEffect(() => { shapesRef.current = shapes; }, [shapes]);
  useEffect(() => { selectedIdxRef.current = selectedIdx; }, [selectedIdx]);

  // Window dimensions
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
  useEffect(() => {
    const updateSize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Show Toast Alert
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // ── Undo / Redo ────────────────────────────────────────
  const pushHistory = useCallback((newShapes: Shapes[]) => {
    setHistory((h) => {
      const sliced = h.slice(0, historyIdx + 1);
      return [...sliced, newShapes];
    });
    setHistoryIdx((i) => i + 1);
  }, [historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    setShapes(history[newIdx] || []);
    setSelectedIdx(null);
    showToast("Undo action");
  }, [historyIdx, history]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    setShapes(history[newIdx] || []);
    setSelectedIdx(null);
    showToast("Redo action");
  }, [historyIdx, history]);

  // Delete selected shape
  const deleteSelected = useCallback(() => {
    if (selectedIdxRef.current !== null && shapesRef.current[selectedIdxRef.current]) {
      const updated = shapesRef.current.filter((_, idx) => idx !== selectedIdxRef.current);
      setShapes(updated);
      pushHistory(updated);
      setSelectedIdx(null);
      showToast("Shape deleted");
    }
  }, [pushHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) redo(); else undo();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        redo();
        e.preventDefault();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
      } else if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "v": setActiveTool("pointer"); break;
          case "p": setActiveTool("pencil"); break;
          case "r": setActiveTool("rect"); break;
          case "c": setActiveTool("circle"); break;
          case "l": setActiveTool("line"); break;
          case "a": setActiveTool("arrow"); break;
          case "t": setActiveTool("text"); break;
          case "e": setActiveTool("eraser"); break;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, deleteSelected]);

  // Fetch initial shapes
  useEffect(() => {
    if (!roomId) return;
    getExistingShapes(roomId).then((s) => {
      setShapes(s);
      setHistory([s]);
      setHistoryIdx(0);
    });
  }, [roomId]);

  // Zero-flicker main render on state changes
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderCanvas(ctx, dimensions.width, dimensions.height, shapesRef.current, selectedIdxRef.current, cursorPosRef.current, zoomLevel);
  }, [dimensions, zoomLevel]);

  useEffect(() => {
    redrawCanvas();
  }, [shapes, selectedIdx, activeTool, dimensions, zoomLevel, redrawCanvas]);

  // Interactive Mouse Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isMouseDown = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let pencilCoords: { x: number; y: number }[] = [];
    let movingShapeIdx: number | null = null;

    function handleMouseDown(e: MouseEvent) {
      if (!ctx) return;
      isMouseDown = true;
      const x = e.offsetX;
      const y = e.offsetY;
      startX = x;
      startY = y;
      lastX = x;
      lastY = y;

      const currentTool = toolRef.current;
      const currentShapes = shapesRef.current;

      if (currentTool === "pointer") {
        let hitIdx: number | null = null;
        for (let i = currentShapes.length - 1; i >= 0; i--) {
          if (hitTestShape(currentShapes[i], x, y)) {
            hitIdx = i;
            break;
          }
        }
        setSelectedIdx(hitIdx);
        movingShapeIdx = hitIdx;
      } else if (currentTool === "eraser") {
        const remaining = currentShapes.filter((s) => !hitTestShape(s, x, y, 14));
        if (remaining.length !== currentShapes.length) {
          setShapes(remaining);
          pushHistory(remaining);
        }
      } else if (currentTool === "text") {
        setTextInput({ x, y, value: "" });
        isMouseDown = false;
      } else if (currentTool === "pencil") {
        pencilCoords = [{ x, y }];
      }
    }

    function handleMouseMove(e: MouseEvent) {
      if (!ctx) return;
      const x = e.offsetX;
      const y = e.offsetY;
      cursorPosRef.current = toolRef.current === "eraser" ? { x, y } : null;

      const currentTool = toolRef.current;
      const color = colorRef.current;
      const lw = strokeRef.current;
      const currentShapes = shapesRef.current;

      if (!isMouseDown) {
        if (currentTool === "pointer") {
          const isOverShape = currentShapes.some((s) => hitTestShape(s, x, y));
          if (canvas) canvas.style.cursor = isOverShape ? "move" : "default";
        }
        if (currentTool === "eraser") {
          redrawCanvas();
        }
        return;
      }

      const dx = x - lastX;
      const dy = y - lastY;
      lastX = x;
      lastY = y;

      if (currentTool === "pointer" && movingShapeIdx !== null) {
        const updatedShapes = currentShapes.map((s, idx) =>
          idx === movingShapeIdx ? moveShape(s, dx, dy) : s
        );
        setShapes(updatedShapes);
      } else if (currentTool === "eraser") {
        const remaining = currentShapes.filter((s) => !hitTestShape(s, x, y, 14));
        if (remaining.length !== currentShapes.length) {
          setShapes(remaining);
          pushHistory(remaining);
        }
        redrawCanvas();
      } else if (currentTool === "pencil") {
        pencilCoords.push({ x, y });
        renderCanvas(ctx, dimensions.width, dimensions.height, currentShapes, null, null, zoomLevel);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(pencilCoords[0].x, pencilCoords[0].y);
        for (let i = 1; i < pencilCoords.length; i++) {
          ctx.lineTo(pencilCoords[i].x, pencilCoords[i].y);
        }
        ctx.stroke();
        ctx.restore();
      } else if (["rect", "circle", "line", "arrow"].includes(currentTool)) {
        renderCanvas(ctx, dimensions.width, dimensions.height, currentShapes, null, null, zoomLevel);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (currentTool === "rect") {
          ctx.strokeRect(startX, startY, x - startX, y - startY);
        } else if (currentTool === "circle") {
          const r = Math.hypot(x - startX, y - startY);
          ctx.beginPath();
          ctx.arc(startX, startY, r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (currentTool === "line") {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else if (currentTool === "arrow") {
          drawArrow(ctx, startX, startY, x, y);
        }
        ctx.restore();
      }
    }

    function handleMouseUp(e: MouseEvent) {
      if (!isMouseDown) return;
      isMouseDown = false;

      const x = e.offsetX;
      const y = e.offsetY;
      const currentTool = toolRef.current;
      const color = colorRef.current;
      const lw = strokeRef.current;
      const currentShapes = shapesRef.current;

      if (currentTool === "pointer" && movingShapeIdx !== null) {
        pushHistory(currentShapes);
        movingShapeIdx = null;
        return;
      }

      let newShape: Shapes | null = null;
      const shapeId = generateId();

      if (currentTool === "pencil" && pencilCoords.length > 1) {
        newShape = { id: shapeId, type: "pencil", points: pencilCoords, color, lineWidth: lw };
      } else if (currentTool === "rect") {
        newShape = { id: shapeId, type: "rect", x: startX, y: startY, width: x - startX, height: y - startY, color, lineWidth: lw };
      } else if (currentTool === "circle") {
        const r = Math.hypot(x - startX, y - startY);
        if (r > 2) {
          newShape = { id: shapeId, type: "circle", centerX: startX, centerY: startY, radius: r, color, lineWidth: lw };
        }
      } else if (currentTool === "line") {
        newShape = { id: shapeId, type: "line", x: startX, y: startY, endX: x, endY: y, color, lineWidth: lw };
      } else if (currentTool === "arrow") {
        newShape = { id: shapeId, type: "arrow", x: startX, y: startY, endX: x, endY: y, color, lineWidth: lw };
      }

      pencilCoords = [];

      if (newShape) {
        const updated = [...currentShapes, newShape];
        setShapes(updated);
        pushHistory(updated);
        // Send via WebSocket with unique shape ID
        socket.send(JSON.stringify({ type: "shape", message: JSON.stringify(newShape), roomId: Number(roomId) }));
      }
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [roomId, socket, dimensions, pushHistory, zoomLevel, redrawCanvas]);

  // Listen for broadcasted shapes from socket & IGNORE DUPLICATES by ID
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "shape") {
          const parsedShape: Shapes = JSON.parse(message.message);
          setShapes((prev) => {
            // Check if shape already exists locally (by ID or exact match)
            if (parsedShape.id && prev.some((s) => s.id === parsedShape.id)) {
              return prev; // Ignore duplicate broadcast!
            }
            const next = [...prev, parsedShape];
            setHistory((h) => [...h.slice(0, historyIdx + 1), next]);
            setHistoryIdx((i) => i + 1);
            return next;
          });
        }
      } catch { /* ignore */ }
    };
    socket.addEventListener("message", handler);
    return () => socket.removeEventListener("message", handler);
  }, [socket, historyIdx]);

  // Fetch chats
  useEffect(() => {
    if (!roomId) return;
    getExistingChats(roomId).then(setChats);
  }, [roomId]);

  // Clear canvas
  const handleClear = async () => {
    setShapes([]);
    setSelectedIdx(null);
    pushHistory([]);
    showToast("Canvas cleared");
    try {
      await axios.delete(`${BACKEND_URL}/delete/${roomId}`, {
        headers: { Authorization: localStorage.getItem("Authorization") || "" },
      });
    } catch { /* ignore */ }
  };

  // Export Canvas image
  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `sketchflow-drawing-room-${roomId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("Drawing exported as PNG!");
  };

  // Copy Room Share Link
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    showToast("Room link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Submit Text Shape
  const handleTextSubmit = () => {
    if (!textInput || !textInput.value.trim()) {
      setTextInput(null);
      return;
    }
    const textShape: Shapes = {
      id: generateId(),
      type: "text",
      x: textInput.x,
      y: textInput.y,
      text: textInput.value.trim(),
      color: selectedColor,
      fontSize: Math.max(16, strokeWidth * 6),
    };
    const updated = [...shapes, textShape];
    setShapes(updated);
    pushHistory(updated);
    socket.send(JSON.stringify({ type: "shape", message: JSON.stringify(textShape), roomId: Number(roomId) }));
    setTextInput(null);
    showToast("Text added");
  };

  // Modify color/stroke of currently selected shape
  const updateSelectedShapeProperty = (color?: string, lw?: number) => {
    if (selectedIdx === null || !shapes[selectedIdx]) return;
    const updated = shapes.map((s, idx) => {
      if (idx === selectedIdx) {
        return {
          ...s,
          ...(color ? { color } : {}),
          ...(lw ? { lineWidth: lw } : {}),
        };
      }
      return s;
    });
    setShapes(updated as Shapes[]);
    pushHistory(updated as Shapes[]);
  };

  const canUndo = historyIdx > 0;
  const canRedo = historyIdx < history.length - 1;

  const TOOLS: { id: Tool; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { id: "pointer", icon: <MousePointer size={17} />, label: "Select & Move", shortcut: "V" },
    { id: "pencil", icon: <Pencil size={17} />, label: "Freehand Pencil", shortcut: "P" },
    { id: "rect", icon: <Square size={17} />, label: "Rectangle", shortcut: "R" },
    { id: "circle", icon: <CircleIcon size={17} />, label: "Circle", shortcut: "C" },
    { id: "line", icon: <Minus size={17} />, label: "Line", shortcut: "L" },
    { id: "arrow", icon: <MoveRight size={17} />, label: "Arrow", shortcut: "A" },
    { id: "text", icon: <TypeIcon size={17} />, label: "Text", shortcut: "T" },
    { id: "eraser", icon: <Eraser size={17} />, label: "Object Eraser", shortcut: "E" },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden relative select-none" style={{ background: "#0c0d14" }}>
      {/* ── Top Floating Navigation Header ────────────────── */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Left: Brand Logo & Room Badge */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="glass-strong rounded-2xl px-3.5 py-2 border border-white/10 flex items-center gap-2.5 shadow-2xl">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-violet-500/30">
              S
            </div>
            <span className="text-sm font-black text-white tracking-tight">Sketchflow</span>
          </div>

          <div className="glass rounded-2xl border border-white/10 px-3.5 py-2 flex items-center gap-2 shadow-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/70 font-mono font-medium">Room: {roomId}</span>
          </div>
        </div>

        {/* Right: Actions (Share, Export, Clear) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleShare}
            className="glass hover:bg-white/10 text-white/80 hover:text-white px-3 py-2 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-all shadow-lg"
          >
            {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            {copiedLink ? "Copied!" : "Share"}
          </button>
          <button
            onClick={handleExport}
            className="glass hover:bg-white/10 text-white/80 hover:text-white px-3 py-2 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-all shadow-lg"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={handleClear}
            className="glass hover:bg-red-500/20 text-red-400 hover:text-red-300 px-3 py-2 rounded-xl text-xs font-bold border border-red-500/30 flex items-center gap-1.5 transition-all shadow-lg"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      {/* ── Main Top Floating Toolbar ─────────────────────── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 glass-strong rounded-2xl px-3 py-2 border border-white/12 shadow-2xl shadow-black/90">
        {/* Tools */}
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              setActiveTool(tool.id);
              if (tool.id !== "pointer") setSelectedIdx(null);
            }}
            title={`${tool.label} (${tool.shortcut})`}
            className={`tool-btn flex items-center justify-center w-9 h-9 rounded-xl transition-all relative ${
              activeTool === tool.id
                ? "bg-violet-600/40 text-violet-300 border border-violet-500/50 shadow-lg shadow-violet-500/30"
                : "text-white/60 hover:text-white hover:bg-white/8 border border-transparent"
            }`}
          >
            {tool.icon}
          </button>
        ))}

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Color picker button */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker((p) => !p)}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-white/15 transition-all hover:bg-white/10"
            title="Stroke Color"
            style={{ background: `${selectedColor}22`, borderColor: `${selectedColor}60` }}
          >
            <div className="w-4 h-4 rounded-full border-2 border-white/70 shadow-sm" style={{ background: selectedColor }} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 glass-strong rounded-2xl border border-white/12 p-3.5 shadow-2xl shadow-black/90 z-40 w-48">
              <div className="text-xs text-white/40 font-semibold mb-2 text-center flex items-center justify-center gap-1.5">
                <Palette size={12} /> Color Palette
              </div>
              <div className="grid grid-cols-4 gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => {
                      setSelectedColor(c.hex);
                      setShowColorPicker(false);
                      if (selectedIdx !== null) updateSelectedShapeProperty(c.hex);
                    }}
                    title={c.label}
                    className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center"
                    style={{
                      background: c.hex,
                      borderColor: selectedColor === c.hex ? "white" : "transparent",
                      boxShadow: selectedColor === c.hex ? `0 0 10px ${c.hex}90` : "none",
                    }}
                  />
                ))}
              </div>
              <div className="mt-3 border-t border-white/10 pt-2.5">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => {
                    setSelectedColor(e.target.value);
                    if (selectedIdx !== null) updateSelectedShapeProperty(e.target.value);
                  }}
                  className="w-full h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Stroke widths */}
        <div className="flex items-center gap-1 ml-0.5">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => {
                setStrokeWidth(w);
                if (selectedIdx !== null) updateSelectedShapeProperty(undefined, w);
              }}
              title={`Stroke ${w}px`}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
              style={{
                background: strokeWidth === w ? "rgba(139, 92, 246, 0.35)" : "transparent",
                border: strokeWidth === w ? "1px solid rgba(139,92,246,0.6)" : "1px solid transparent",
              }}
            >
              <div className="rounded-full bg-white" style={{ width: Math.max(3, w * 1.6), height: Math.max(3, w * 1.6) }} />
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <Redo2 size={16} />
        </button>
      </div>

      {/* ── Contextual Property Bar for Selected Shape ────── */}
      {selectedIdx !== null && shapes[selectedIdx] && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 glass-strong rounded-xl px-4 py-2 border border-violet-500/40 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-1.5 text-xs text-violet-300 font-semibold">
            <Sliders size={13} /> Selected Shape
          </div>
          <div className="w-px h-4 bg-white/10" />
          {/* Quick Color Pickers for Selected Shape */}
          <div className="flex items-center gap-1.5">
            {COLORS.slice(0, 5).map((c) => (
              <button
                key={c.hex}
                onClick={() => updateSelectedShapeProperty(c.hex)}
                className="w-5 h-5 rounded-full border border-white/30 hover:scale-125 transition-transform"
                style={{ background: c.hex }}
              />
            ))}
          </div>
          <div className="w-px h-4 bg-white/10" />
          <button
            onClick={deleteSelected}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-semibold hover:bg-red-500/10 px-2 py-1 rounded-lg transition-all"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}

      {/* ── Floating Toast Alerts ────────────────────────── */}
      {toastMessage && (
        <div className="absolute top-20 right-6 z-50 glass-strong border border-violet-500/40 px-4 py-2.5 rounded-xl text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-right duration-200">
          <Sparkles size={14} className="text-violet-400" />
          {toastMessage}
        </div>
      )}

      {/* ── Chat Side Overlay ─────────────────────────────── */}
      <ChatRoomClient
        id={roomId}
        messages={chats}
        socket={socket}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen((o) => !o)}
      />

      {/* ── Floating Text Input Modal ────────────────────── */}
      {textInput && (
        <div
          className="absolute z-50 flex items-center gap-2 glass-strong p-2 rounded-2xl border border-violet-500/50 shadow-2xl"
          style={{ left: textInput.x, top: textInput.y }}
        >
          <input
            type="text"
            autoFocus
            value={textInput.value}
            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
            placeholder="Type text here…"
            className="bg-transparent text-white outline-none px-3 py-1.5 text-sm font-medium placeholder-white/30 min-w-[160px]"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTextSubmit();
              if (e.key === "Escape") setTextInput(null);
            }}
          />
          <button
            onClick={handleTextSubmit}
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
          >
            Add
          </button>
          <button
            onClick={() => setTextInput(null)}
            className="text-white/40 hover:text-white/80 p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Main Canvas Surface ───────────────────────────── */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block"
        style={{
          background: "#0c0d14",
          cursor: activeTool === "eraser" ? "crosshair" : activeTool === "pointer" ? "default" : "crosshair",
        }}
      />

      {/* ── Bottom Controls & Status Bar ───────────────────── */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Zoom Controls */}
        <div className="glass rounded-xl border border-white/10 px-2 py-1.5 flex items-center gap-1.5 pointer-events-auto shadow-lg">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-xs text-white/70 font-mono w-10 text-center font-medium">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(2, z + 0.1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title="Reset Zoom"
          >
            <Maximize2 size={13} />
          </button>
        </div>

        {/* Center: Tool Status & Keyboard Shortcuts Guide */}
        <div className="glass rounded-xl border border-white/10 px-4 py-2 flex items-center gap-3 text-xs text-white/50 shadow-xl">
          <span className="text-white/30">Tool:</span>
          <span className="text-violet-300 font-semibold capitalize">{activeTool}</span>
          <span className="text-white/15">·</span>
          <span className="text-white/30">Shortcuts:</span>
          <span className="text-white/60">V (Select/Move), P (Pencil), R (Rect), C (Circle), A (Arrow), E (Eraser), Del</span>
        </div>
      </div>
    </div>
  );
}
