"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

export default function joinroom() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter();

  return (
    <div className="flex gap-3 ">
      <div>
        <input className="p-10" value={roomId} onChange={(e) => {
          setRoomId(e.target.value);
        }} type="text" placeholder="Room id"></input>

        <button className="p-10" onClick={() => {
          router.push(`/room/${roomId}`);
        }}>Join room</button>
      </div>
    </div>
  );
}