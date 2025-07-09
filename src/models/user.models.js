import mongoose,{Schema} from "mongoose";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ApiError } from "../utils/ApiError.js";

const userSchema=new Schema({
    username:{
        type:String,
        required:true,
        lowercase:true,
        trim:true,
        unique:true,
        index:true   //Index true karne se, we can search records based on it.
    },

    email:{
        type:String,
        required:true,
        lowercase:true,
        trim:true,
        unique:true
    },

    fullName:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avatar:{
        url:{
            type:String  //cloudinary url
        },
        public_id:{

            type: String, //cloudinary public_id for deletion
        },
        // required:true,
    },
    coverImage:{
        url:{
            type:String     //cloudinary url
        },
        public_id:{
            type:String    //cloudinary public_id for deletion
        }
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:"Video"
        }
    ],
    password:{
        type:String,
        required:[true,'Password is required']
    },
    refreshToken:{
        type:String,
    }

},{timestamps:true});

userSchema.pre("save",async function(next) {
    if(!this.isModified("password")) return next();
    this.password=await bcrypt.hash(this.password,10);
    next();
})

userSchema.pre("save",async function(next){
    if(!this.avatar || !this.avatar.url || !this.avatar.public_id)
        throw new ApiError(405,"Either avatar, or Avatar url or public_id, or both not present");
    next();
})

userSchema.methods.isPasswordCorrect=async function(password){
   return await bcrypt.compare(password,this.password);
}

userSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullName:this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    )
}


userSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            username:this.username,
            fullName:this.fullName
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    )
}

 
export const User=mongoose.model("User",userSchema);