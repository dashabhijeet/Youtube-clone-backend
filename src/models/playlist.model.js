import mongoose,{ Schema } from "mongoose";

const playlistSchema=new Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        default:"No description given",
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    addedVideos:[{
        type:Schema.Types.ObjectId,
        ref:"Video"}
    ],

},{timestamps:true});


export const Playlist= mongoose.model("Playlist",playlistSchema);