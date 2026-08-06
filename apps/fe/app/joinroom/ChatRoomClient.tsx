"use client";

import { useEffect, useState, useRef } from "react";
import { useSocket } from "../hooks/useSocket";
import { MessageCircle, X, Send } from "lucide-react";

interface Message {
  message: string;
  timestamp?: number;
  isSelf?: boolean;
}

export default function ChatRoomClient({
  messages,
  id,
  socket,
  isOpen,
  onToggle,
}: {
  messages: { message: string }[];
  id: string | number;
  socket: WebSocket | null;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [chats, setChats] = useState<Message[]>(
    messages.map((m) => ({ message: m.message }))
  );
  const [currentMessage, setCurrentMessage] = useState("");
  const { loading } = useSocket();
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync props → state
  useEffect(() => {
    setChats(messages.map((m) => ({ message: m.message, timestamp: Date.now() })));
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Listen for incoming messages from socket
  useEffect(() => {
    if (!socket || loading) return;
    const handleMessage = (event: MessageEvent) => {
      const parsedData = JSON.parse(event.data);
      if (parsedData.type === "chat") {
        setChats((c) => [
          ...c,
          { message: parsedData.message, timestamp: Date.now(), isSelf: false },
        ]);
      }
    };
    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, loading, id]);

  const handleSend = () => {
    const trimmed = currentMessage.trim();
    if (!trimmed) return;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({ type: "chat", roomId: id, message: trimmed })
      );
      // Optimistically add own message
      setChats((c) => [
        ...c,
        { message: trimmed, timestamp: Date.now(), isSelf: true },
      ]);
    }
    setCurrentMessage("");
  };

  function formatTime(ts?: number) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function getInitial(msg: string) {
    return msg.charAt(0).toUpperCase() || "?";
  }

  return (
    <>
      {/* ── Toggle button ──────────────────────────── */}
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 font-semibold text-sm text-white px-4 py-3 rounded-2xl shadow-2xl transition-all"
        style={{
          background: isOpen
            ? "rgba(30, 30, 50, 0.9)"
            : "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
          border: "1px solid rgba(139, 92, 246, 0.4)",
          boxShadow: isOpen
            ? "0 4px 24px rgba(0,0,0,0.4)"
            : "0 4px 24px rgba(124, 58, 237, 0.5)",
          backdropFilter: "blur(12px)",
        }}
      >
        {isOpen ? <X size={18} /> : <MessageCircle size={18} />}
        {isOpen ? "Close Chat" : "Chat"}
        {!isOpen && chats.length > 0 && (
          <span className="ml-0.5 bg-white/20 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {chats.length > 99 ? "99+" : chats.length}
          </span>
        )}
      </button>

      {/* ── Chat panel ─────────────────────────────── */}
      {isOpen && (
        <div
          id="chat-window"
          className="fixed bottom-20 right-6 w-80 z-40 flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
          style={{
            height: "420px",
            background: "rgba(10, 12, 28, 0.92)",
            border: "1px solid rgba(139, 92, 246, 0.2)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "rgba(139, 92, 246, 0.15)" }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                <MessageCircle size={14} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">Chat</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-white/40">Room · {String(id || "").slice(0, 16)}{String(id || "").length > 16 ? "…" : ""}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {chats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <div className="text-3xl">💬</div>
                <div className="text-white/30 text-sm">No messages yet</div>
                <div className="text-white/20 text-xs">Say hello to your collaborators!</div>
              </div>
            ) : (
              chats.map((m, idx) => {
                const isSelf = m.isSelf === true;
                return (
                  <div key={idx} className={`chat-message flex items-end gap-2 ${isSelf ? "flex-row-reverse" : "flex-row"}`}>
                    {/* Avatar */}
                    {!isSelf && (
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: `hsl(${(idx * 67) % 360}, 60%, 45%)` }}
                      >
                        {getInitial(m.message)}
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`max-w-[75%] ${isSelf ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                      <div
                        className="px-3 py-2 rounded-2xl text-sm leading-relaxed break-words"
                        style={{
                          background: isSelf
                            ? "linear-gradient(135deg, rgba(124, 58, 237, 0.6), rgba(79, 70, 229, 0.6))"
                            : "rgba(255, 255, 255, 0.06)",
                          color: isSelf ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.8)",
                          border: isSelf
                            ? "1px solid rgba(139, 92, 246, 0.3)"
                            : "1px solid rgba(255, 255, 255, 0.06)",
                          borderRadius: isSelf ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        }}
                      >
                        {m.message}
                      </div>
                      <div className="text-xs text-white/20 px-1">{formatTime(m.timestamp)}</div>
                    </div>

                    {/* Self avatar */}
                    {isSelf && (
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        Y
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div
            className="flex items-center gap-2 p-3 border-t"
            style={{ borderColor: "rgba(139, 92, 246, 0.12)" }}
          >
            <input
              ref={inputRef}
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white/90 placeholder-white/25 outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(139,92,246,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.boxShadow = "none";
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={!currentMessage.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-40"
              style={{
                background: currentMessage.trim()
                  ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                  : "rgba(255,255,255,0.05)",
                boxShadow: currentMessage.trim() ? "0 4px 12px rgba(124,58,237,0.4)" : "none",
              }}
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
