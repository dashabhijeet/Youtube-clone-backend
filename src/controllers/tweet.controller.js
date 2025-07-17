import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    console.log(req);
    const { content }=req.body;
    if(!content)
        throw new ApiError(404,"Tweet not present");

    const response= await Tweet.create({
        content:content,
        owner:req.user?._id
    })

    return res
    .status(200)
    .json(
        new ApiResponse(200,response,"Tweeted successfully")
    );
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId}=req.params;
    const response=await Tweet.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $project:{
                content:1
            }
        }
    ])
    console.log(response);

    if(response.length>0?false:true)
        throw new ApiError(402,"User has no tweets.")

    return res
    .status(200)
    .json(
        new ApiResponse(200,response,"User tweets successfully fetched")
    );
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId }=req.params;

    const updateTweetResponse=await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content:req.body.content
            }
        },{
            new:true
        }
    )

    return res
    .status(201)
    .json(
        new ApiResponse(201,updateTweetResponse,"tweet updated successfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId }=req.params;
    const response=await Tweet.findByIdAndDelete(tweetId);
    if(!response)
        throw new ApiError(404,"tweet doesn't exist.");

    return res
    .status(200)
    .json(
        new ApiResponse(200,response,"Tweet deleted successfully.")
    )

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}