import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import { Video } from "../models/video.models.js"
import { Comment } from "../models/comment.model.js"
import { User } from "../models/user.models.js"
import { Tweet } from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // 1. Check if video exists
    const videoExists = await Video.findById(videoId);
    if (!videoExists) {
        throw new ApiError(400, "Video does not exist to like.");
    }

    // 2. Get user ID from request (assumes authentication middleware adds req.user)
    const userId = req.user?._id;

    if (!await User.findById(userId)) {
        throw new ApiError(404, "User does not exist.");
    }

    // 3. Check if the like already exists
    const existingLike = await Like.findOne({ video: videoId, user: userId });

    if (existingLike) {
        // 4a. If exists, remove the like (toggle off)
        await Like.findByIdAndDelete(existingLike._id);

        return res.status(200).json(
            new ApiResponse(200, null, "Video like removed successfully.")
        );
    } else {
        // 4b. If not, add a like (toggle on)
        const newLike = await Like.create({
            video: videoId,
            likedBy: userId,
        });

        return res.status(200).json(
            new ApiResponse(200, newLike, "Video liked successfully.")
        );
    }
});


const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
     const commentExists = await Comment.findById(commentId);
    if (!commentExists) {
        throw new ApiError(400, "Comment does not exist to like.");
    }

    // 2. Get user ID from request (assumes authentication middleware adds req.user)
    const userId = req.user?._id;

    if (!await User.findById(userId)) {
        throw new ApiError(404, "User does not exist.");
    }

    // 3. Check if the like already exists
    const existingLike = await Like.findOne({ comment: commentId, user: userId });

    if (existingLike) {
        // 4a. If exists, remove the like (toggle off)
        await Like.findByIdAndDelete(existingLike._id);

        return res.status(200).json(
            new ApiResponse(200, null, "Comment like removed successfully.")
        );
    } else {
        // 4b. If not, add a like (toggle on)
        const newLike = await Like.create({
            comment: commentId,
            likedBy: userId,
        });

        return res.status(200).json(
            new ApiResponse(200, newLike, "Comment liked successfully.")
        );
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
     const tweetExists = await Tweet.findById(tweetId);
    if (!tweetExists) {
        throw new ApiError(400, "Tweet does not exist to like.");
    }

    // 2. Get user ID from request (assumes authentication middleware adds req.user)
    const userId = req.user?._id;

    if (!await User.findById(userId)) {
        throw new ApiError(404, "User does not exist.");
    }

    // 3. Check if the like already exists
    const existingLike = await Like.findOne({ tweet: tweetId, user: userId });

    if (existingLike) {
        // 4a. If exists, remove the like (toggle off)
        await Like.findByIdAndDelete(existingLike._id);

        return res.status(200).json(
            new ApiResponse(200, null, "Tweet like removed successfully.")
        );
    } else {
        // 4b. If not, add a like (toggle on)
        const newLike = await Like.create({
            tweet: tweetId,
            likedBy: userId,
        });

        return res.status(200).json(
            new ApiResponse(200, newLike, "Tweet liked successfully.")
        );
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    const allLikedVideos = await Like.find({ likedBy: userId })
        .populate("video", "_id title description thumbnail url createdAt") // Only fetch selected fields
        .select("video"); // Only return the 'video' field from Like documents

        console.log("jian",allLikedVideos)
    const videos = allLikedVideos.filter((like) => like.video);

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "All liked videos fetched successfully"));
});



export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}