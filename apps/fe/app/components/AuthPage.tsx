import React, { useActionState, useState } from "react";
interface signin{
    isSignin :boolean,
    onClick : (formData: {name?:string , username : string , password: string})=> void
}


export function AuthPage({isSignin, onClick}:signin) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name , setName] = useState("")
  const [showPassword, setShowPassword] = useState(false);


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black to-gray-900 p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl p-8 dark:bg-gray-900 bg-gray-800/70 backdrop-blur-md border border-gray-800/40 shadow-[0_10px_40px_rgba(16,185,129,0.08)] dark:shadow-[0_10px_40px_rgba(14,165,233,0.06)]">
          <h2 className="text-2xl font-semibold text-white mb-4">{isSignin? "Signin": "Signup"}</h2>
          <p className="text-sm text-gray-300 mb-6">{isSignin?"Sign in" :"Sign up"} with your email and a secure password.</p>

          <form className="space-y-4">
            <label className="block">
              <span className="text-xs text-gray-300">Email</span>
               <input
                type="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="john"
                className="mt-1 block w-full rounded-lg px-4 py-3 text-white bg-gray-800 border border-transparent placeholder-gray-400 outline-none transition focus:ring-0 focus:shadow-[0_0_24px_rgba(99,102,241,0.14)]" 
                required
              />
            </label>
            <label className="">
                <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="you@example.com"
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

            <button
              type="submit"
              className="w-full mt-2 rounded-lg py-3 font-medium bg-gradient-to-r from-emerald-400 to-sky-400 text-black shadow-lg transform transition hover:scale-[1.01] hover:shadow-[0_15px_40px_rgba(56,189,248,0.16)] focus:outline-none focus:shadow-[0_0_30px_rgba(56,189,248,0.18)]"
              onClick={()=> onClick({username, password , name})} //onclick will take onclick with the given values
            >
             {isSignin? "Sign in": "Sign up"}
            </button>  
          </form>
        </div>
      </div>
    </div>
  );
}
