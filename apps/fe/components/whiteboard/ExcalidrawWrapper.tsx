"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import type { 
  ExcalidrawImperativeAPI, 
  Collaborator, 
  Gesture 
} from "@excalidraw/excalidraw/types";

// Excalidraw CSS is required for proper toolbars, fonts, and dialog styling
import "@excalidraw/excalidraw/index.css";

// Dynamic import with ssr: false ensures browser-only execution
const Excalidraw = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#121212] text-white">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-neutral-400">Loading Sketio Canvas…</p>
      </div>
    ),
  }
);

interface ExcalidrawWrapperProps {
  initialData?: any;
  theme?: "light" | "dark";
  collaborators?: Map<string, Collaborator>;
  onAPIReady?: (api: ExcalidrawImperativeAPI) => void;
  onChange?: (elements: readonly any[], appState: any, files: any) => void;
  onPointerUpdate?: (payload: {
    pointer: { x: number; y: number; tool: "pointer" | "laser" };
    button: "down" | "up";
    pointersMap: Gesture["pointers"];
  }) => void;
}

export function ExcalidrawWrapper({
  initialData,
  theme = "dark",
  collaborators,
  onAPIReady,
  onChange,
  onPointerUpdate,
}: ExcalidrawWrapperProps) {
  const [mounted, setMounted] = useState(false);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAPIReady = (excalidrawAPI: ExcalidrawImperativeAPI) => {
    setApi(excalidrawAPI);
    if (onAPIReady) {
      onAPIReady(excalidrawAPI);
    }
  };

  // Sync collaborators into Excalidraw scene whenever collaborators change
  useEffect(() => {
    if (api && collaborators) {
      api.updateScene({ 
        collaborators: collaborators as unknown as Map<any, Collaborator> 
      });
    }
  }, [api, collaborators]);

  if (!mounted) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#121212] text-white">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-neutral-400">Initializing Canvas…</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative excalidraw-container">
      <Excalidraw
        excalidrawAPI={handleAPIReady}
        initialData={initialData}
        theme={theme}
        onChange={onChange}
        onPointerUpdate={onPointerUpdate}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: true,
            clearCanvas: true,
            loadScene: true,
            saveToActiveFile: false,
            toggleTheme: true,
            saveAsImage: true,
            export: {
              saveFileToDisk: true,
            },
          },
        }}
      />
    </div>
  );
}

export default ExcalidrawWrapper;
