import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app=express();

//Configuration of cors
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))     //when you are filling form data, we are allowing that to be accepted.
app.use(express.urlencoded({extended:true,limit:"16kb"}))   //url encoded format data.
app.use(express.static("public"));  //To access public assets, need not necessary public any name can be given
app.use(cookieParser())  //To access cookies from user's browser and make edits as well.

export {app}