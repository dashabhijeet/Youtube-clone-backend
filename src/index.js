// require('dotenv').config({path:'./env'})
import dotenv from "dotenv";
import mongoose from "mongoose";
import {app} from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({
    path:'./env'
})

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})





// import express from "express";
// const app=express();
// ;(async () => {
//     try{
//         mongoose.connnect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error",(error) => {
//             console.log("ERRR",error);
//             throw error;
//         })

//         app.listen(process.env.PORT,() =>{
//             console.log(`Server is running on port ${process.env.PORT}`);
//         })
//     }catch(error){
//         console.error("Error connecting to MongoDB:", error);
//         throw error;
//     }
// })