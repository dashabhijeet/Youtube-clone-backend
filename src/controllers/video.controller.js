import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary,deleteFromCloudinary} from "../utils/cloudinary.js"
import fs from "fs";
import { validateHeaderName } from "http"


const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query;

  // 1️⃣ Validate user
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User does not exist.");

  // 2️⃣ Build filter
  const filter = { owner: userId }; // Replace 'owner' with your actual Video schema field

  if (query) {
    filter.title = { $regex: query, $options: "i" }; // Example: filter by title
  }

  // 3️⃣ Build sort
  const sortOrder = sortType === "asc" ? 1 : -1;
  const sortObj = {};
  sortObj[sortBy] = sortOrder;

  // 4️⃣ Find videos
//   const videos = await Video.find(filter)
//     .populate("videoFile")
//     .skip((page - 1) * limit)
//     .limit(Number(limit))
//     .sort(sortObj);

const videos=await Video.aggregate(
    [
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $sort:{
                [sortBy]:sortType ==="asc"? 1:-1
            }
        },
        {
        
            $skip:(page-1)*limit
        },
        {
            $limit:Number(limit)
        },
        {
            $project:{
                "videoFile":1,
                "thumbnail":1,
                "title":1,
                "description":1,
                "duration":1,
                "views":1
            }
        }
    ]
)

  if (videos.length === 0) {
    throw new ApiError(404, "No videos uploaded by the user.");
  }

  // 5️⃣ Respond
  res.status(200).json(
    new ApiResponse(200, videos, "Videos fetched successfully.")
  );
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    console.log("ghji",title,description)
    const  userId =req.params.id;
    console.log("jiiii",req.params)
    // TODO: get video, upload to cloudinary, create video
    console.log(userId);
    const user=await User.findById(userId);

    let videoLocalPath;
  let thumbnailLocalPath;
    if(!user)
        throw new ApiError(404,"User does not exist,signup please.");

    try {
        videoLocalPath=req.files?.videoFile[0]?.path;
    
        thumbnailLocalPath=req.files?.thumbnail[0]?.path;
    
        const uploadingVideo=await uploadOnCloudinary(videoLocalPath);

        console.log(uploadingVideo)
    
        if(!uploadingVideo)
            throw new ApiError(400,"Error in uploading video");
    
        const uploadingThumbnail=await uploadOnCloudinary(thumbnailLocalPath);
    
        if(!uploadingThumbnail)
            throw new ApiError(400,"Error in uploading thumbnail");
    
        const response=await Video.create({
            title:title,
            description:description,
            thumbnail:{
                public_id:uploadingThumbnail.public_id,
                url:uploadingThumbnail.url
            },
            videoFile:{
                public_id:uploadingVideo.public_id,
                url:uploadingVideo.url
            },
            owner:userId,
            duration:uploadingVideo.duration,
        })
        return res
        .status(201)
        .json(
            new ApiResponse(201,response,"Video file and thumbnail uploaded successfully.")
        )
    } finally {
        if (videoLocalPath && fs.existsSync(videoLocalPath)) {
      await fs.promises.unlink(videoLocalPath);
    }
    if (thumbnailLocalPath && fs.existsSync(thumbnailLocalPath)) {
      await fs.promises.unlink(thumbnailLocalPath);
    }
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id\
    const videoExists=await Video.findById(videoId);

    if(!videoExists)
        throw new ApiError(404,"Video does not exist.");

    const videoDetails=await Video.findById(videoId).select("videoFile thumbnail title description duration views");

    return res
    .status(202)
    .json(
        new ApiResponse(202,videoDetails,"Video details fetched successfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    let videoLocalPath
    let thumbnailLocalPath
    try {
        const { videoId } = req.params
        //TODO: update video details like title, description, thumbnail
        const {title,description}=req.body;
    
        const videoExists=await Video.findById(videoId);


        // console.log("videoExists",videoExists);
    
        if(!videoExists)
            throw new ApiError(404,"Video does not exist.");
    
        // console.log("id",videoExists.videoFile.public_id);

        const responseVideoDelete=await deleteFromCloudinary(videoExists.videoFile.public_id,"video");

        console.log(responseVideoDelete);
        const responseThumbnailDelete=await deleteFromCloudinary(videoExists.thumbnail.public_id);
     console.log(responseThumbnailDelete);
        if(!responseThumbnailDelete)
            throw new ApiError(403,"Thumbnail could not be deleted")
    
         if(!responseVideoDelete)
            throw new ApiError(403,"VIdeo File could not be deleted")
    
         videoLocalPath=req.files?.videoFile[0]?.path;
        thumbnailLocalPath=req.files?.thumbnail[0]?.path;
    
         const videoFileUpdate=await uploadOnCloudinary(videoLocalPath);
         const thumbnailUpdate=await uploadOnCloudinary(thumbnailLocalPath);
    
         const response=await Video.findByIdAndUpdate(
            videoId,{
                $set:{
                    videoFile:{
                        public_id:videoFileUpdate.public_id,
                        url:videoFileUpdate.url,
                    },
                    thumbnail:{
                        public_id:thumbnailUpdate.public_id,
                        url:thumbnailUpdate.url,
                    },
                    title:title,
                    description:description
                }
            },
            {
              new:true,
              runValidators:false
            }
         )

//          video.validateBeforeSave = false;
// await video.save();

         return res
         .status(201)
         .json(
            new ApiResponse(201,response,"Video and thumbnail has been updated.")
         )
    } finally {
        if(videoLocalPath && fs.existsSync(videoLocalPath))
            await fs.promises.unlink(videoLocalPath);
        if(thumbnailLocalPath && fs.existsSync(thumbnailLocalPath))
            await fs.promises.unlink(thumbnailLocalPath);
    }



})

const deleteVideo = asyncHandler(async (req, res) => {
    let videoLocalPath
    let thumbnailLocalPath
    try {
        const { videoId } = req.params
    
        const videoExists=await Video.findById(videoId);


        // console.log("videoExists",videoExists);
    
        if(!videoExists)
            throw new ApiError(404,"Video does not exist.");
    
        // console.log("id",videoExists.videoFile.public_id);

        const responseVideoDelete=await deleteFromCloudinary(videoExists.videoFile.public_id,"video");

        // console.log(responseVideoDelete);

        const responseThumbnailDelete=await deleteFromCloudinary(videoExists.thumbnail.public_id);

    //  console.log(responseThumbnailDelete);
        if(!responseThumbnailDelete)
            throw new ApiError(403,"Thumbnail could not be deleted")
    
         if(!responseVideoDelete)
            throw new ApiError(403,"VIdeo File could not be deleted")
        const responseDatabase=await Video.findByIdAndDelete(videoId);

        return res
        .status(200)
        .json(
            new ApiResponse(200,responseDatabase,"Video deleted succssfully")
        )
        }catch(error)
        {
            console.log(error?.message || "Couldn't delete video");
        }
})

const togglePublishStatus = asyncHandler(async (req, res) => {
     const { videoId } = req.params

    if(!videoId?.trim()) {
        throw new ApiError(400, "videoId is required")
    }
    const video=await Video.findById(videoId);
    
    if(!video) 
        throw new ApiError(404, "Video not found")

    video.isPublished=!video.isPublished;
    video.save({validateBeforeSave:false});

    return res
    .status(200)
    .json(new ApiResponse(200, video, "Video publish status updated successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}