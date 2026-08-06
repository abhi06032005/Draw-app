"use client";
import { WS_URL } from "@/config";
import { Canvas } from "./Canvas";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function CanvasRoom({ roomId }: { roomId: string }) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("Authorization");
    if (!token) {
      router.push("/signin");
      return;
    }

    const ws = new WebSocket(`${WS_URL}?token=${token}`);

    ws.onopen = () => {
      setSocket(ws);
      setConnectionStatus("connected");
      ws.send(JSON.stringify({ type: "join_room", roomId }));
    };

    ws.onerror = () => {
      setConnectionStatus("error");
    };

    ws.onclose = () => {
      setConnectionStatus("error");
    };

    return () => {
      ws.close();
    };
  }, [roomId, router]);

  if (!socket) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6"
        style={{ background: "#0d1117" }}
      >
        {/* Background blobs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div
            className="mesh-blob"
            style={{
              width: 500,
              height: 500,
              background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)",
              top: "-150px",
              left: "-150px",
            }}
          />
        </div>

        <div className="relative z-10 text-center space-y-5">
          {connectionStatus === "error" ? (
            <>
              <div className="text-4xl">⚠️</div>
              <h2 className="text-2xl font-black text-white">Connection failed</h2>
              <p className="text-white/40 text-sm">Could not connect to the canvas server.</p>
              <button
                onClick={() => router.push("/create")}
                className="btn-primary px-6 py-3 rounded-xl font-bold text-white text-sm mt-4"
              >
                Go back
              </button>
            </>
          ) : (
            <>
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600/30 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center text-2xl">
                  🎨
                </div>
                <div className="absolute -inset-0.5 rounded-2xl border border-violet-500/40 animate-ping opacity-30" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white mb-1">Joining canvas…</h2>
                <p className="text-white/40 text-sm">Connecting to room <span className="font-mono text-violet-400">{roomId}</span></p>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Canvas roomId={roomId} socket={socket} />
    </div>
  );
}