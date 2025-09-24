import express from "express";
import zod, { string } from "zod";
import { Jwt } from "jsonwebtoken";
const app= express();

const signupSchema = zod.object({
    username :zod.email(),
    firstname : zod.string(),
    lastname : zod. string(),
    password : zod.string()
})


app.post("/signup", function(req, res){
    

})


app.post("/signin", function(req, res){
    
})


app.post("/signin", function(req, res){
    
})

app.listen(4000)