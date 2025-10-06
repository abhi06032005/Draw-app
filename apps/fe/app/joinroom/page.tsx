"use client";

import { useEffect, useState } from "react";


import { useRouter } from "next/navigation";

import Particles from "@/components/Particles";

export default function joinroom() {
  const [roomId, setRoomId] = useState("");
  const [disabled  ,setDisabled] = useState(false)
  const router = useRouter();

  useEffect(()=>{
    const token = localStorage.getItem("Authorization")

    if(!token){
      alert("User Not Signed In")
      router.push("/signin")
      return;
    }
  },[])

  return (<>
  <div className="w-screen h-screen overflow-x-hidden overflow-y-hidden bg-gray-900 items-center justify-center flex ">
      <Particles />

    <div className="shadow-lg shadow-white/20 absolute flex items-center justify-center flex-col gap-10 backdrop-blur-2xl bg-white/5 rounded-4xl p-10">

        <h1 className=" text-white text-5xl items-center justify-center font-semibold">Enter Room <br />ID</h1>
        <input className="p-5 backdrop-blur-md bg-white/10 border border-green-400 rounded-2xl hover:shadow-green-400 focus:shadow-green-400 focus:shadow-md focus:outline-none text-white" value={roomId} onChange={(e) => {
          setRoomId(e.target.value);
        }} type="text" placeholder="Room id"></input>

        <button className={`${disabled ? "bg-amber-100 text-gray-800 py-3 px-5" :" py-3 px-5 font-bold  bg-amber-300 hover:bg-amber-700 "}
         hover:text-white border border-green-400 rounded-2xl hover:shadow-green-400 focus:shadow-green-400 focus:shadow-md focus:outline-none cursor-pointer
         text-black hover:scale-105 transition-all duration-500 hover:shadow-lg`}


        onClick={() => {
          if(disabled) return;
          setDisabled(true)
          router.push(`joinroom/room/${roomId}`);
        }}
        >{disabled? "JOINING....": "JOIN ROOM"}</button>
      
    </div>
  </div>
   
    
  </>
   
  );
}
