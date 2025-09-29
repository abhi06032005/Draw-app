"use client"

import { on } from "events";
import { AuthPage } from "../components/AuthPage";

export default function Signin(){
    return(<>
        <AuthPage isSignin={true} onClick={()=>{
            console.log("Sign in clicked");
        }} />
    </>)
}