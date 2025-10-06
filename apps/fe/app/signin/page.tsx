"use client"

import { BACKEND_URL, WS_URL } from "@/config";
import React, { use, useActionState, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";



export default function Signin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [clicked ,  setClicked] =useState(false)
  const [showPassword, setShowPassword] = useState(false);
  const router =useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black to-gray-900 p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl p-8 dark:bg-gray-900 bg-gray-800/70 backdrop-blur-md border border-gray-800/40 shadow-[0_10px_40px_rgba(16,185,129,0.08)] dark:shadow-[0_10px_40px_rgba(14,165,233,0.06)]">
          <h2 className="text-2xl font-semibold text-white mb-4">Signin</h2>
          <p className="text-sm text-gray-300 mb-6">Signin with your email and a secure password.</p>

          <div className="space-y-4">
            
            <label className="block">
              <span className="text-xs text-gray-300">Email</span>
               <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="john@gmail.com"
                className="mt-1 block w-full rounded-lg px-4 py-3 text-white bg-gray-800 border border-transparent placeholder-gray-400 outline-none transition focus:ring-0 focus:shadow-[0_0_24px_rgba(99,102,241,0.14)]" 
                required
              />
            </label>

            <label className="block relative">
              <span className="text-xs text-gray-300">Password</span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="mt-1 block w-full rounded-lg px-4 py-3 text-white bg-gray-800 border border-transparent placeholder-gray-400 outline-none transition focus:ring-0 focus:shadow-[0_0_24px_rgba(16,185,129,0.14)]"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-2 top-[34px] text-xs text-gray-300 px-2 py-1 rounded"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </label>
             </div>

            <button
              className="w-full mt-2 rounded-lg py-3 font-medium bg-gradient-to-r from-emerald-400 to-sky-400 text-black shadow-lg transform 
              transition hover:scale-[1.01] hover:shadow-[0_15px_40px_rgba(56,189,248,0.16)] focus:outline-none focus:shadow-[0_0_30px_rgba(56,189,248,0.18)]"
            onClick={async ()=>{
                try{
                  setClicked(c => !c)
                    const response = await axios.post(`${BACKEND_URL}/signin`,{
                        username,
                        password
                        
                    });
                    if(response.status === 201){
                        localStorage.setItem("Authorization", response.data.token)
                        router.push("/create")
                    }
                }
                catch(e){
                    console.log(e)
                }
              
            }}
            >
                Signin 
            </button>  

        
        </div>
      </div>
          {clicked && <Loader />}
         
    </div>
  );
}
