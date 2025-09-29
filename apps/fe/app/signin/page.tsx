"use client"
import axios from "axios";
import { on } from "events";
import { AuthPage } from "../components/AuthPage";
import { BACKEND_URL } from "@/config";

export default function Signin(){
    
    return(<>
        <AuthPage isSignin={true} onClick={async ({username, name ,password })=>{
            try{
                 const response = await axios.post(`${BACKEND_URL}/signup`,{
                username,
                password,
                name
            })
            }
           
            
        }} />
        
    </>)
}

