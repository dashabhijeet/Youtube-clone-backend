import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.model.js";
import { User } from "../models/user.models.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Joi from "joi";

// Joi Schemas
const videoLikeSchema = Joi.object({
  videoId: Joi.string().required(),
});

const commentLikeSchema = Joi.object({
  commentId: Joi.string().required(),
});

const tweetLikeSchema = Joi.object({
  tweetId: Joi.string().required(),
});

// ✅ Toggle like on video
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { error } = videoLikeSchema.validate(req.params);
  if (error) throw new ApiError(400, error.details[0].message);

  const { videoId } = req.params;

  // 1. Check if video exists
  const videoExists = await Video.findById(videoId);
  if (!videoExists) throw new ApiError(400, "Video does not exist to like.");

  const userId = req.user?._id;
  if (!await User.findById(userId)) throw new ApiError(404, "User does not exist.");

  // 3. Check if the like already exists
  const existingLike = await Like.findOne({ video: videoId, likedBy: userId });

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

// ✅ Toggle like on comment
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { error } = commentLikeSchema.validate(req.params);
  if (error) throw new ApiError(400, error.details[0].message);

  const { commentId } = req.params;

  const commentExists = await Comment.findById(commentId);
  if (!commentExists) throw new ApiError(400, "Comment does not exist to like.");

  const userId = req.user?._id;
  if (!await User.findById(userId)) throw new ApiError(404, "User does not exist.");

  const existingLike = await Like.findOne({ comment: commentId, likedBy: userId });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return res.status(200).json(
      new ApiResponse(200, null, "Comment like removed successfully.")
    );
  } else {
    const newLike = await Like.create({
      comment: commentId,
      likedBy: userId,
    });

    return res.status(200).json(
      new ApiResponse(200, newLike, "Comment liked successfully.")
    );
  }
});

// ✅ Toggle like on tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { error } = tweetLikeSchema.validate(req.params);
  if (error) throw new ApiError(400, error.details[0].message);

  const { tweetId } = req.params;

  const tweetExists = await Tweet.findById(tweetId);
  if (!tweetExists) throw new ApiError(400, "Tweet does not exist to like.");

  const userId = req.user?._id;
  if (!await User.findById(userId)) throw new ApiError(404, "User does not exist.");

  const existingLike = await Like.findOne({ tweet: tweetId, likedBy: userId });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return res.status(200).json(
      new ApiResponse(200, null, "Tweet like removed successfully.")
    );
  } else {
    const newLike = await Like.create({
      tweet: tweetId,
      likedBy: userId,
    });

    return res.status(200).json(
      new ApiResponse(200, newLike, "Tweet liked successfully.")
    );
  }
});

// ✅ Get all liked videos
const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const allLikedVideos = await Like.find({ likedBy: userId })
    .populate("video", "_id title description thumbnail url createdAt")
    .select("video");

  const videos = allLikedVideos.filter((like) => like.video);

  return res.status(200).json(
    new ApiResponse(200, videos, "All liked videos fetched successfully")
  );
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
};
