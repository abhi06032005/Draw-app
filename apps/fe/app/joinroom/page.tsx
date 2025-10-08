"use client";

import { useEffect, useState } from "react";
import { ThreeDot } from "react-loading-indicators";


import { useRouter } from "next/navigation";

import Particles from "@/components/Particles";

export default function joinroom() {
  const [roomId, setRoomId] = useState("");
  const loader =<ThreeDot color="#ffffff" size="medium" text="" textColor="" />

  const [loading  ,setLoading] = useState(false)
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
  <div className="w-screen h-screen overflow-x-hidden overflow-y-hidden bg-black items-center justify-center flex ">
      <Particles />

    <div className="shadow-lg shadow-white/20 absolute flex items-center justify-center flex-col gap-10 backdrop-blur-2xl bg-white/5 rounded-4xl p-10">

          <div className="flex flex-col items-center justify-center  bg-black">
              <h1 className="text-white text-5xl font-semibold tracking-wider text-center">
                  Enter Room ID to Join
              </h1>
          </div>     

        <input className="p-5 backdrop-blur-md bg-white/10 border border-green-400 rounded-2xl hover:shadow-green-400 focus:shadow-green-400 focus:shadow-md focus:outline-none text-white" value={roomId} onChange={(e) => {
          setRoomId(e.target.value);
        }} type="text" placeholder="Room id"></input>

          <button className={`py-3 px-5 font-bold rounded-2xl 
              ${loading 
                ? "bg-transparent border-none shadow-none text-gray-400 cursor-not-allowed" 
                : "bg-amber-300 hover:bg-amber-200 border border-green-400 hover:shadow-green-400 focus:shadow-green-400 focus:shadow-md focus:outline-none cursor-pointer text-black hover:shadow-lg"
              }`}



        onClick={() => {
          if(loading) return;
          setLoading(c =>!c)

          router.push(`joinroom/room/${roomId}`);
        }}
        >{loading ? loader : "JOIN ROOM"}</button>

        
      
    </div>
  </div>
   
    
  </>
   
  );
}
