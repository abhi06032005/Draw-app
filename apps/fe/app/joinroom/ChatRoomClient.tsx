"use client";

import { useEffect, useState, useRef } from "react";
import { useSocket } from "../hooks/useSocket";
import { MessageCircle } from "lucide-react";

export default function  ChatRoomClient({
  messages,
  id,
  socket
}: {
  messages: { message: string }[];
  id: string;
  socket: WebSocket | null;
}) {
  const [chats, setChats] = useState(
    messages.map((m) => (m))
  );

  const [currentMessage, setCurrentMessage] = useState("");
  const { loading } = useSocket();
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Floating & toggle state
  const [isOpen, setIsOpen] = useState(true);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const dragRef = useRef<HTMLDivElement | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);


  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);


useEffect(() => {
   if (!socket || loading) return;
  const handleMessage = (event: MessageEvent) => {
    const parsedData = JSON.parse(event.data);
    if (parsedData.type === "chat") {
      setChats((c) => [...c, { message: parsedData.message }]);
    }
  };

  socket.addEventListener("message", handleMessage);
  return () => {
    socket.removeEventListener("message", handleMessage);
  };
}, [socket, loading, id]);


  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    isDragging.current = true;
    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    setPosition({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleSend = () => {
    if (!currentMessage.trim()) return;

    if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(
      JSON.stringify({
        type: "chat",
        roomId: id,
        message: currentMessage,
      })
    );
  }


    setCurrentMessage("");
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg shadow-lg transition"
      >
        <MessageCircle size={20} />
        <span>{isOpen ? "Close Chat" : "Chat"}</span>
      </button>

      {/* Floating window */}
      {isOpen && (
        <div
            id="chat-window"
          ref={dragRef}
          onMouseDown={handleMouseDown}
          style={{ top: position.y, left: position.x }}
          className="fixed w-80 h-[70vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-40 cursor-move flex flex-col scrollbar-none"
        >
          {/* Header */}
          <div className="bg-gray-800 px-4 py-2 text-white font-medium rounded-t-xl select-none">
            Chat Room
          </div>

          {/* Chat content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-2">
              { chats.length === 0 ? (
                <p>No messages yet</p>
              ):(chats.map((m ,idx) => (
                <div
                  key={idx}
                  className="bg-gray-800 text-gray-100 p-2 rounded-lg break-words shadow-sm"
                >
                  {m.message}
                </div>
              )))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex p-2 border-t border-gray-700 bg-gray-800">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-l-lg px-3 py-2 text-gray-100 bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <button
                onClick={handleSend}
                className="bg-emerald-500 hover:bg-emerald-400 px-4 py-2 rounded-r-lg text-black font-medium transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
