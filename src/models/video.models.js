import mongoose,{Schema} from 'mongoose';
import mongooseAggregatePaginate from
"mongoose-aggregate-paginate-v2";
const videoSchema=Schema({
    videoFile:{
        type:String,    //Cloudinary
        required:true
    },
    thumbnail:{
        type:String,    //Cloudinary
        required:true
    },
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    duration:{          //Cloudinary
        type:String,
        required:true
    },
    views:{
        type:Number,
        default:0
    },
    isPublished:{
        type:Boolean,
        default:true
    },
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }
},{timestamps:true});



export const Video=mongoose.model("Video",videoSchema);