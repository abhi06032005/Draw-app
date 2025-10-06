"use client";

import Particles from "@/components/Particles";
import { useRouter } from "next/navigation";

export default function CreateRoom() {
    const router =  useRouter();
  return (
    <div className="select-none relative h-screen w-screen flex flex-col items-center justify-center bg-black text-white overflow-hidden">
      {/* Background particles animation */}
      <div className="mt-10 ml-10 items-center justify-center ">

      <Particles className="absolute h-screen w-screen inset-0 z-0" />
      </div>

      {/* Main content */}
      <div className=" absolute z-10 text-center space-y-6 ">
        <h1 className="text-4xl font-bold">Create Room</h1>
        <p className="text-lg max-w-lg mx-auto text-gray-300">
          Create a room and enjoy the fun moments of a collaborative session.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
          <button className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 transition"
          onClick={()=>{
              router.push('/createroom')
          }}>
            Create New Room
          </button>
          <button className="px-6 py-3 bg-transparent border border-white rounded-xl font-semibold hover:bg-white hover:text-black transition"
          onClick={()=>{
            router.push('/joinroom')
          }}>
            Join Existing Room
          </button>
        </div>
      </div>
    </div>
  );
}
