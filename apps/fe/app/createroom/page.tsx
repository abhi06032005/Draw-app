"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Particles from "@/components/Particles";
import axios from "axios";
import { BACKEND_URL } from "@/config";



export default function CreateRoom(){

    const [disabled , setDisabled] = useState(false);
    const [roomId  , setRoomId] = useState(" ")
    const router = useRouter();
    const token = localStorage.getItem("Authorization")


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

            <h1 className=" text-white text-5xl items-center justify-center font-semibold">Enter Room <br />ID</h1>
            <input className="p-5 backdrop-blur-md bg-white/10 border border-green-400 rounded-2xl hover:shadow-green-400 focus:shadow-green-400 focus:shadow-md focus:outline-none text-white" value={roomId} onChange={(e) => {
            setRoomId(e.target.value);
            }} type="text" placeholder="ROOM NAME"></input>

            <button className={`${disabled ? "bg-amber-100 text-gray-800 py-3 px-5" :" py-3 px-5 font-bold  bg-amber-300 hover:bg-amber-700 "}
            hover:text-white border border-green-400 rounded-2xl hover:shadow-green-400 focus:shadow-green-400 focus:shadow-md focus:outline-none cursor-pointer
            text-black hover:scale-105 transition-all duration-500 hover:shadow-lg`}


            onClick={async() => {
            const trimroomId = roomId.trim()
            console.log(token)
            if(disabled) return;
            setDisabled(true)
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
                setDisabled(false)
                router.refresh()
            }
           
            
            }}
            >{disabled? "CREATING....": "CREATE ROOM"}</button>
        
        </div>
    </div>
   
    
  </>
   
  );
}