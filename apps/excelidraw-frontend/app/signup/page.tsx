"use client";
import { AuthPage } from "../components/AuthPage";
import axios from "axios";

export default function Signup(){
    return(<>
        <AuthPage isSignin={false}
        onClick={
            axios.post("http://localhost:4000/signup",{
                
            })
        } />
    </>)
}