"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Particles from "@/components/Particles";
import axios from "axios";
import { BACKEND_URL } from "@/config";
import { ThreeDot } from "react-loading-indicators";



export default function CreateRoom(){

    const [loading , setLoading] = useState(false);
    const [roomId  , setRoomId] = useState(" ")
    const router = useRouter();
    const token = localStorage.getItem("Authorization")
    const loader =<ThreeDot color="#ffffff" size="medium" text="" textColor="" />


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
                Create New Room ID 
            </h1>
            </div>

            <input className="p-5 backdrop-blur-md bg-white/10 border border-green-400 rounded-2xl hover:shadow-green-400 focus:shadow-green-400 focus:shadow-md focus:outline-none text-white" value={roomId} onChange={(e) => {
            setRoomId(e.target.value);
            }} type="text" placeholder="ROOM NAME"></input>

           <button className={`py-3 px-5 font-bold rounded-2xl 
              ${loading
                ? "bg-transparent border-none shadow-none text-gray-400 cursor-not-allowed" 
                : "bg-amber-300 hover:bg-amber-200 border border-green-400 hover:shadow-green-400 focus:shadow-green-400 focus:shadow-md focus:outline-none cursor-pointer text-black hover:shadow-lg"
              }`}

            
            onClick={async() => {
            const trimroomId = roomId.trim()
            console.log(token)
            if(loading) return;
            setLoading(c=>!c)
            try{
                const response = await axios.post(`${BACKEND_URL}/room`,{
                name:trimroomId
                },{
                    headers:{
                        authorization:`Bearer ${token}`
                    }
                })
                if (response.status == 201){
                    router.push('/joinroom')
                }

            }
            catch(e){
                alert("Server while creating a room !! create Again")
                setLoading(false)
                router.refresh()
            }
           
            
            }}
            > {loading ?loader: "CREATE ROOM"} </button>

            
        
        </div>
    </div>
   
    
  </>
   
  );
}