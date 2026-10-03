"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import type { 
  ExcalidrawImperativeAPI, 
  Collaborator 
} from "@excalidraw/excalidraw/types";

import { BACKEND_URL, WS_URL } from "@/config";
import { getAuthToken } from "@/lib/auth";
import { 
  generateEncryptionKey, 
  getOrCreateRoomKey,
  encryptData, 
  decryptData 
} from "@/lib/encryption";
import { 
  WS_SUBTYPES, 
  parseRoomHash, 
  buildRoomHash, 
  getCollaboratorColor,
  type SocketUpdateData 
} from "@/lib/collab";

import { ExcalidrawWrapper } from "./ExcalidrawWrapper";
import { WhiteboardHeader, type ConnectionStatus } from "./WhiteboardHeader";
import { AIDiagramModal } from "./AIDiagramModal";

interface WhiteboardPageProps {
  slug: string;
}

export function WhiteboardPage({ slug }: WhiteboardPageProps) {
  const router = useRouter();

  // State
  const [boardData, setBoardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [collaborators, setCollaborators] = useState<Map<string, Collaborator>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // References
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const roomKeyRef = useRef<string | null>(null);
  const usernameRef = useRef<string>("Collaborator");
  const lastPointerBroadcastRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastedVersionsRef = useRef<Map<string, number>>(new Map());
  const isRemoteUpdateRef = useRef<boolean>(false);
  const lastSavedFingerprintRef = useRef<string>("");
  const lastSavedConfigRef = useRef<string>("");
  const pendingRemoteElementsRef = useRef<any[]>([]);

  // Fast element version/status fingerprint
  const getElementsFingerprint = (elements: readonly any[]) => {
    if (!elements || !elements.length) return "";
    let fp = "";
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      fp += `${el.id}:${el.version}:${el.versionNonce || 0}:${el.isDeleted ? 1 : 0};`;
    }
    return fp;
  };

  // ─── 1. Initialize Board & Auth ──────────────────────────────────────
  useEffect(() => {
    async function loadBoard() {
      const token = await getAuthToken();
      if (!token) {
        router.push("/sign-in");
        return;
      }
      try {
        // Fetch current user details
        try {
          const userRes = await axios.get(`${BACKEND_URL}/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (userRes.data?.name) {
            usernameRef.current = userRes.data.name;
          }
        } catch {
          // Ignore error, fallback to Collaborator
        }

        // Fetch board data
        const res = await axios.get(`${BACKEND_URL}/room/${slug}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = res.data;
        setBoardData(data);

        // Initialize saved state fingerprint
        if (data.elements) {
          lastSavedFingerprintRef.current = getElementsFingerprint(data.elements);
          for (const el of data.elements) {
            broadcastedVersionsRef.current.set(el.id, el.version);
          }
        }
        if (data.appState) {
          lastSavedConfigRef.current = `${data.appState.viewBackgroundColor || ""}_${data.appState.gridSize || ""}_${data.appState.theme || ""}`;
        }

        // Encryption key handling via URL hash (#room=slug,key) or deterministic room key
        let key: string | null = null;
        if (typeof window !== "undefined") {
          const hashData = parseRoomHash(window.location.hash);
          if (hashData && hashData.roomId === slug) {
            key = hashData.roomKey;
          } else {
            key = await getOrCreateRoomKey(slug);
            window.location.hash = buildRoomHash(slug, key);
          }
        }
        roomKeyRef.current = key;

        // Theme initialization
        if (data.appState?.theme) {
          setTheme(data.appState.theme);
        }

        setLoading(false);
      } catch (err: any) {
        console.error("Failed to load board:", err);
        setError(err.response?.data?.message || "Failed to load board data.");
        setLoading(false);
      }
    }

    loadBoard();
  }, [slug, router]);

  // ─── 2. Socket.IO Collaboration ─────────────────────────────────────
  useEffect(() => {
    if (!boardData || !roomKeyRef.current) return;

    const socketUrl = WS_URL || "http://localhost:3002";
    console.log(`[Collab] Connecting to Excalidraw Room at: ${socketUrl}`);

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(`[Collab] Socket connected: ${socket.id}`);
      setConnectionStatus("connected");
      // Join room
      socket.emit("join-room", slug);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Collab] Connection error:", err.message);
      setConnectionStatus("error");
    });

    socket.on("disconnect", () => {
      console.log("[Collab] Socket disconnected");
      setConnectionStatus("disconnected");
    });

    // Handshake events from excalidraw-room server
    socket.on("init-room", () => {
      socket.emit("join-room", slug);
    });

    socket.on("first-in-room", () => {
      console.log("[Collab] First user in room");
    });

    socket.on("new-user", async () => {
      console.log("[Collab] New peer joined! Broadcasting current scene...");
      if (excalidrawAPIRef.current) {
        const elements = excalidrawAPIRef.current.getSceneElementsIncludingDeleted();
        broadcastScene(WS_SUBTYPES.INIT, elements, true);
      }
    });

    socket.on("room-user-change", (clients: string[]) => {
      console.log("[Collab] Room users changed:", clients);
      setCollaborators((prev) => {
        const next = new Map(prev);
        // Remove left sockets
        for (const socketId of Array.from(next.keys())) {
          if (!clients.includes(socketId)) {
            next.delete(socketId);
          }
        }
        // Ensure present sockets exist
        for (const socketId of clients) {
          if (socketId !== socket.id && !next.has(socketId)) {
            next.set(socketId, {
              username: "Collaborator",
              color: getCollaboratorColor(socketId),
            } as any);
          }
        }
        return next;
      });
    });

    // Incoming remote updates from peers
    socket.on("client-broadcast", async (encryptedBuffer: ArrayBuffer, iv: Uint8Array) => {
      if (!roomKeyRef.current) return;

      try {
        const decrypted = await decryptData(
          iv,
          encryptedBuffer,
          roomKeyRef.current
        );

        const decoded = new TextDecoder().decode(decrypted);
        const data: SocketUpdateData = JSON.parse(decoded);

        if (data.type === WS_SUBTYPES.INIT || data.type === WS_SUBTYPES.UPDATE) {
          const remoteElements = data.payload.elements;
          if (remoteElements && remoteElements.length > 0) {
            if (!excalidrawAPIRef.current) {
              // Excalidraw component is still loading; buffer remote elements
              pendingRemoteElementsRef.current = [
                ...pendingRemoteElementsRef.current,
                ...remoteElements,
              ];
            } else {
              applyRemoteElements(remoteElements);
            }
          }
        } else if (data.type === WS_SUBTYPES.MOUSE_LOCATION) {
          const { socketId, pointer, button, selectedElementIds, username } = data.payload;
          setCollaborators((prev) => {
            const next = new Map(prev);
            next.set(socketId, {
              pointer,
              button: button || "up",
              selectedElementIds,
              username: username || "Collaborator",
              color: getCollaboratorColor(socketId),
            } as any);
            return next;
          });
        }
      } catch (e) {
        console.error("[Collab] Decryption/parsing error:", e);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardData, slug]);

  // ─── 3. Reconcile Remote Elements Helper ─────────────────────────────
  const applyRemoteElements = useCallback(
    async (remoteElements: readonly any[]) => {
      if (!excalidrawAPIRef.current || !remoteElements || !remoteElements.length) return;

      isRemoteUpdateRef.current = true;
      try {
        const { reconcileElements } = await import("@excalidraw/excalidraw");
        const localElements = excalidrawAPIRef.current.getSceneElementsIncludingDeleted();
        const appState = excalidrawAPIRef.current.getAppState();

        const reconciled = reconcileElements(localElements, remoteElements, appState);

        // Update local version cache so we don't treat peer changes as our own
        for (const el of remoteElements) {
          broadcastedVersionsRef.current.set(el.id, el.version);
        }

        // Keep local saved fingerprint synced with reconciled elements
        lastSavedFingerprintRef.current = getElementsFingerprint(reconciled);

        excalidrawAPIRef.current.updateScene({
          elements: reconciled,
        });
      } catch (err) {
        console.error("[Collab] Remote reconcile error:", err);
      } finally {
        setTimeout(() => {
          isRemoteUpdateRef.current = false;
        }, 120);
      }
    },
    []
  );

  const handleAPIReady = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      excalidrawAPIRef.current = api;
      // If remote elements arrived while Excalidraw was loading, apply them now!
      if (pendingRemoteElementsRef.current.length > 0) {
        const pending = [...pendingRemoteElementsRef.current];
        pendingRemoteElementsRef.current = [];
        applyRemoteElements(pending);
      }
    },
    [applyRemoteElements]
  );

  // ─── 4. Broadcast Helpers ───────────────────────────────────────────
  const broadcastSocketData = useCallback(
    async (data: SocketUpdateData, volatile = false) => {
      const socket = socketRef.current;
      const roomKey = roomKeyRef.current;
      if (!socket || !roomKey || !socket.connected) return;

      try {
        const json = JSON.stringify(data);
        const encoded = new TextEncoder().encode(json);
        const { encryptedBuffer, iv } = await encryptData(roomKey, encoded);

        socket.emit(
          volatile ? "server-volatile-broadcast" : "server-broadcast",
          slug,
          encryptedBuffer,
          iv
        );
      } catch (err) {
        console.error("[Collab] Broadcast failed:", err);
      }
    },
    [slug]
  );

  const broadcastScene = useCallback(
    async (
      updateType: WS_SUBTYPES.INIT | WS_SUBTYPES.UPDATE,
      elements: readonly any[],
      syncAll = false
    ) => {
      const changedElements = elements.filter((el) => {
        if (syncAll) return true;
        const lastVersion = broadcastedVersionsRef.current.get(el.id);
        return lastVersion === undefined || el.version > lastVersion;
      });

      if (!changedElements.length) return;

      for (const el of changedElements) {
        broadcastedVersionsRef.current.set(el.id, el.version);
      }

      await broadcastSocketData({
        type: updateType,
        payload: { elements: changedElements },
      });
    },
    [broadcastSocketData]
  );

  // ─── 5. Canvas Change Handlers & Autosave ───────────────────────────
  const handleSceneChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      // Don't re-broadcast or save incoming remote updates
      if (isRemoteUpdateRef.current) return;

      const currentFingerprint = getElementsFingerprint(elements);
      const currentConfig = `${appState?.viewBackgroundColor || ""}_${appState?.gridSize || ""}_${appState?.theme || ""}`;

      const hasElementChanges = currentFingerprint !== lastSavedFingerprintRef.current;
      const hasConfigChanges = currentConfig !== lastSavedConfigRef.current;

      // Ignore pure mouse moves, hover, zooming, selection changes with no element modifications
      if (!hasElementChanges && !hasConfigChanges) {
        return;
      }

      // Broadcast actual element mutations to active collaborators
      if (hasElementChanges) {
        broadcastScene(WS_SUBTYPES.UPDATE, elements);
      }

      // Debounce HTTP autosave to PostgreSQL
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setIsSaving(true);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const token = await getAuthToken();
          if (!token) return;

          await axios.put(
            `${BACKEND_URL}/room/${slug}/scene`,
            {
              elements: elements,
              appState: {
                viewBackgroundColor: appState.viewBackgroundColor,
                gridSize: appState.gridSize,
                theme: appState.theme,
              },
              files: files,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          // Update saved references
          lastSavedFingerprintRef.current = currentFingerprint;
          lastSavedConfigRef.current = currentConfig;
        } catch (e) {
          console.error("Autosave error:", e);
        } finally {
          setIsSaving(false);
        }
      }, 1500);
    },
    [broadcastScene, slug]
  );

  // ─── 5. Pointer / Cursor Movement ──────────────────────────────────
  const handlePointerUpdate = useCallback(
    (payload: {
      pointer: { x: number; y: number; tool: "pointer" | "laser" };
      button: "down" | "up";
    }) => {
      const now = Date.now();
      // Throttle pointer broadcasts to ~40ms (25fps)
      if (now - lastPointerBroadcastRef.current < 40) return;
      lastPointerBroadcastRef.current = now;

      const socket = socketRef.current;
      if (!socket?.id) return;

      const selectedElementIds = excalidrawAPIRef.current?.getAppState().selectedElementIds || {};

      broadcastSocketData(
        {
          type: WS_SUBTYPES.MOUSE_LOCATION,
          payload: {
            socketId: socket.id,
            pointer: payload.pointer,
            button: payload.button || "up",
            selectedElementIds,
            username: usernameRef.current,
          },
        },
        true // volatile
      );
    },
    [broadcastSocketData]
  );

  // ─── 6. Share Link ──────────────────────────────────────────────────
  const handleShare = useCallback(() => {
    if (typeof window !== "undefined" && roomKeyRef.current) {
      const fullUrl = `${window.location.origin}/whiteboard/${slug}${buildRoomHash(
        slug,
        roomKeyRef.current
      )}`;
      navigator.clipboard.writeText(fullUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
  }, [slug]);

  const handleToggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (excalidrawAPIRef.current) {
      excalidrawAPIRef.current.updateScene({
        appState: { theme: nextTheme },
      });
    }
  }, [theme]);

  // ─── 7. Sketio AI Diagram Synthesis ─────────────────────────────────
  const handleInsertAIElements = useCallback(
    async (newElements: any[], mode: "append" | "replace") => {
      if (!excalidrawAPIRef.current) return;

      let mergedElements: any[] = [];
      let focusElements: any[] = [];

      if (mode === "replace") {
        mergedElements = newElements;
        focusElements = newElements;
      } else {
        const currentElements = excalidrawAPIRef.current.getSceneElementsIncludingDeleted();
        // Offset new elements if canvas already has content
        let minX = 0;
        let maxY = 0;
        if (currentElements.length > 0) {
          const nonDeleted = currentElements.filter((el) => !el.isDeleted);
          if (nonDeleted.length > 0) {
            minX = Math.min(...nonDeleted.map((el) => el.x));
            maxY = Math.max(...nonDeleted.map((el) => el.y + el.height));
          }
        }
        const offsetY = maxY > 0 ? maxY + 150 : 0;
        const adjustedNewElements = newElements.map((el) => ({
          ...el,
          x: el.x + (minX > 100 ? minX - 100 : 0),
          y: el.y + offsetY,
        }));
        mergedElements = [...currentElements, ...adjustedNewElements];
        focusElements = adjustedNewElements;
      }

      // Restore elements using Excalidraw's built-in engine to ensure fractional indices invariants
      let finalElements = mergedElements;
      try {
        const exModule = await import("@excalidraw/excalidraw");
        if (typeof exModule.restoreElements === "function") {
          finalElements = exModule.restoreElements(mergedElements, null);
        }
      } catch (err) {
        console.warn("restoreElements warning:", err);
      }

      excalidrawAPIRef.current.updateScene({ elements: finalElements });

      try {
        excalidrawAPIRef.current.scrollToContent(focusElements, { fitToViewport: true });
      } catch {
        // Fallback
      }

      // Trigger scene save & WebSocket broadcast
      broadcastScene(WS_SUBTYPES.UPDATE, finalElements);
      handleSceneChange(finalElements, excalidrawAPIRef.current.getAppState(), boardData?.files || {});
    },
    [boardData, broadcastScene, handleSceneChange]
  );

  // ─── Render States ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-xl font-bold">Connecting to Whiteboard…</h2>
        <p className="text-neutral-400 text-sm font-mono">Room: {slug}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-black mb-2">Unable to open Whiteboard</h2>
        <p className="text-neutral-400 text-sm max-w-md mb-6">{error}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl font-bold text-sm transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Active collaborators array for header
  const collaboratorList = Array.from(collaborators.entries()).map(([id, c]) => ({
    socketId: id,
    username: c.username || "Collaborator",
    color: (c as any).color,
  }));

  const initialElements = boardData?.elements || [];
  const initialAppState = {
    theme: theme,
    ...(boardData?.appState || {}),
  };

  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden ${theme === "dark" ? "bg-[#121212]" : "bg-white"}`}>
      {/* Product Header */}
      <WhiteboardHeader
        roomSlug={slug}
        boardTitle={boardData?.title || slug}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        connectionStatus={connectionStatus}
        collaborators={collaboratorList}
        isSaving={isSaving}
        onShare={handleShare}
        shareCopied={shareCopied}
        onOpenAI={() => setAiModalOpen(true)}
      />

      {/* Main Canvas Container */}
      <main className="flex-1 w-full h-[calc(100vh-3.5rem)] relative overflow-hidden">
        <ExcalidrawWrapper
          initialData={{
            elements: initialElements,
            appState: initialAppState,
            files: boardData?.files || {},
          }}
          theme={theme}
          collaborators={collaborators}
          onAPIReady={handleAPIReady}
          onChange={handleSceneChange}
          onPointerUpdate={handlePointerUpdate}
        />
      </main>

      {/* Sketio AI Diagram Modal */}
      <AIDiagramModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onInsertElements={handleInsertAIElements}
        theme={theme}
      />
    </div>
  );
}

export default WhiteboardPage;
