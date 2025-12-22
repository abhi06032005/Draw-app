"use client";

import { BACKEND_URL } from "@/config"

import axios from "axios"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Loader from "@/components/Loader"

type User = {
  id: number
  name: string
  email: string
}

type Room = {
  id: number
  slug: string
  createAt: string
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loadingRooms, setLoadingRooms] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")

    if (!token) {
      router.push("/signin")
      return
    }

    async function fetchData() {
      try {
        // 🔹 fetch user
        const userRes = await axios.get(`${BACKEND_URL}/user`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setUser(userRes.data)

        // 🔹 fetch rooms
        const roomRes = await axios.get(`${BACKEND_URL}/get-rooms`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setRooms(roomRes.data.rooms)
      } catch (err) {
        router.push("/signin")
      } finally {
        setLoadingRooms(false)
      }
    }

    fetchData()
  }, [router])

  if (!user) return <Loader />

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">

        {/* ---------- PROFILE ---------- */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 shadow-xl p-6">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-100">
            Dashboard
          </h1>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Name</span>
              <span className="font-semibold text-gray-100">{user.name}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Email</span>
              <span className="font-semibold text-gray-100 truncate max-w-[60%]">
                {user.email}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">User ID</span>
              <span className="font-mono text-xs text-gray-300">
                {user.id}
              </span>
            </div>
          </div>
        </div>

        {/* ---------- ROOMS ---------- */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 shadow-xl p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">
            Your Rooms
          </h2>

          {loadingRooms ? (
            <Loader />
          ) : rooms.length === 0 ? (
            <p className="text-gray-400 text-sm">
              You haven’t created any rooms yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {rooms.map((room) => (
                <li
                  key={room.id}
                  className="flex justify-between items-center rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700 transition"
                >
                  <span className="text-gray-100">{room.slug}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(room.createAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}

