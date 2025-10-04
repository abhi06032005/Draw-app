"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Loader from "@/components/Loader";



export default function LandingPage() {
    const router = useRouter()
    const [clicked , setClicked] = useState(false)
  return (
    <div className="w-full min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center px-4 py-12">
      
      {/* Hero */}
      <div className="text-center max-w-3xl mb-12">
        <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mb-4">
          Draw. Chat. Collaborate.
        </h1>
        <p className="text-gray-400 text-lg md:text-xl mb-8">
          Welcome to your collaborative canvas — sketch, share ideas, and chat in real-time with your team or friends.
        </p>

        {/* Sign Up Button */}
        <button className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-4 rounded-full transition-all shadow-lg"
        onClick={()=>{
            setClicked( c => !c)
            router.push("/signup")
        }}>
          Sign Up
        </button>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-6xl mb-12">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center hover:bg-gray-700 transition transform hover:-translate-y-2">
          <div className="text-4xl mb-4">🖌️</div>
          <h3 className="font-semibold text-lg mb-2">Draw in Real Time</h3>
          <p className="text-gray-400 text-sm">Sketch freely or design collaboratively on a live shared canvas.</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center hover:bg-gray-700 transition transform hover:-translate-y-2">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="font-semibold text-lg mb-2">Chat Instantly</h3>
          <p className="text-gray-400 text-sm">Communicate with your team while drawing, in real-time.</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center hover:bg-gray-700 transition transform hover:-translate-y-2">
          <div className="text-4xl mb-4">🤝</div>
          <h3 className="font-semibold text-lg mb-2">Join Rooms</h3>
          <p className="text-gray-400 text-sm">Create or join secure rooms with one click for seamless collaboration.</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center hover:bg-gray-700 transition transform hover:-translate-y-2">
          <div className="text-4xl mb-4">⚡</div>
          <h3 className="font-semibold text-lg mb-2">Lightning Fast</h3>
          <p className="text-gray-400 text-sm">Every stroke and message syncs instantly across all users.</p>
        </div>
      </div>

      {/* Preview Image */}
      <div className="w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl mb-12">
      
      </div>

      {/* Footer */}
      <p className="text-gray-500 text-sm">
        © {new Date().getFullYear()} ExcileDraw — Draw. Chat. Collaborate.
      </p>
      
      {clicked && <Loader />}
    </div>
);
}


