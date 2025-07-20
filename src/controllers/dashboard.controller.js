import mongoose from "mongoose"
import {Video} from "../models/video.models.js"
import { User } from "../models/user.models.js"
import {Subscription} from "../models/subscription.models.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
        const userId = req.user?._id;

        if (!await User.findById(userId)) 
        {
            throw new ApiError(400, "User does not exist.");
        }

    const [videoStats] = await Video.aggregate([
        { 
            $match: 
            { 
                owner: new mongoose.Types.ObjectId(userId) 
            } 
        },
        { 
            $group: 
            { 
                _id: null,
                totalViews: { $sum: "$views" },
                totalVideos: { $sum: 1 } 
            } 
        }
  ]);

    const [subscriberStats] = await Subscription.aggregate([
        { 
            $match: 
            { 
                channel: new mongoose.Types.ObjectId(userId) 
            } 
        },
        { 
            $count: "totalSubscribers" 
        }
  ]);

    const [likeStats] = await Like.aggregate([
        { 
            $match: 
            { 
                likedBy: new mongoose.Types.ObjectId(userId) 
            } 
        },
        { 
            $count: "totalLikes" 
        }
  ]);

  const channelStats = 
  {
    totalVideos: videoStats?.totalVideos || 0,
    totalViews: videoStats?.totalViews || 0,
    totalSubscribers: subscriberStats?.totalSubscribers || 0,
    totalLikes: likeStats?.totalLikes || 0
  };

  return res
  .status(200)
  .json(
    new ApiResponse(200, channelStats, "All channel stats fetched successfully")
  );

});

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
     const userId = req.user?._id;
    //  console.log("hello",r);
     const g=await User.findById(userId)
    //  console.log("GIAAAN",g);
        if (!g) 
        {
            throw new ApiError(400, "User does not exist.");
        }

    
    
    const videos= await Video.aggregate([
        { 
            $match: 
            { 
                owner: new mongoose.Types.ObjectId(userId) 
            } 
        }
  ]);

  return res
  .status(200)
  .json(
    new ApiResponse(200, videos, "All videos have been fetched successfully")
  );
        
})

export {
    getChannelStats, 
    getChannelVideos
    }