import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import Joi from "joi";

const getAllVideosSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).optional(),
  query: Joi.string().allow("").optional(),
  sortBy: Joi.string().valid("createdAt", "title", "views", "duration").optional(),
  sortType: Joi.string().valid("asc", "desc").optional(),
  userId: Joi.string().required()
});

const publishVideoSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow("").optional(),
});

const updateVideoSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow("").optional(),
});


export const getAllVideos = asyncHandler(async (req, res) => {
  const { error } = getAllVideosSchema.validate(req.query);
  if (error) throw new ApiError(400, error.details[0].message);

  const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query;

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User does not exist");

  const filter = { owner: userId };
  if (query) filter.title = { $regex: query, $options: "i" };

  const sortObj = { [sortBy]: sortType === "asc" ? 1 : -1 };

  const videos = await Video.aggregate([
    { $match: filter },
    { $sort: sortObj },
    { $skip: (page - 1) * limit },
    { $limit: Number(limit) },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1
      }
    }
  ]);

  return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));
});


export const publishAVideo = asyncHandler(async (req, res) => {
  const { error } = publishVideoSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const { title, description } = req.body;
  const userId = req.params.id;

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User does not exist");

  let videoLocalPath, thumbnailLocalPath;

  try {
    if (!req.files?.videoFile?.[0]) throw new ApiError(400, "Video file is required");
    if (!req.files?.thumbnail?.[0]) throw new ApiError(400, "Thumbnail image is required");

    videoLocalPath = req.files.videoFile[0].path;
    thumbnailLocalPath = req.files.thumbnail[0].path;

    // Uploading video
    const uploadedVideo = await uploadOnCloudinary(videoLocalPath);
    if (!uploadedVideo) throw new ApiError(400, "Failed to upload video");

    // Adaptive HLS URL
    const hlsUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/sp_auto/v1/${uploadedVideo.public_id}.m3u8`;

    // Uploading Thumbnail
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!uploadedThumbnail) throw new ApiError(400, "Failed to upload thumbnail");

    const videoDoc = await Video.create({
      title,
      description,
      owner: userId,
      duration: uploadedVideo.duration,
      thumbnail: {
        public_id: uploadedThumbnail.public_id,
        url: uploadedThumbnail.url
      },
      videoFile: {
        public_id: uploadedVideo.public_id,
        url: hlsUrl       // Storing HLS Adaptive Streaming URL
      }
    });

    return res.status(201).json(new ApiResponse(201, videoDoc, "Video uploaded successfully"));
  } finally {
    if (videoLocalPath && fs.existsSync(videoLocalPath)) fs.unlinkSync(videoLocalPath);
    if (thumbnailLocalPath && fs.existsSync(thumbnailLocalPath)) fs.unlinkSync(thumbnailLocalPath);
  }
});


export const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videoId");

  const video = await Video.findById(videoId).select(
    "videoFile thumbnail title description duration views"
  );

  if (!video) throw new ApiError(404, "Video not found");

  return res.status(200).json(new ApiResponse(200, video, "Video details fetched successfully"));
});


export const updateVideo = asyncHandler(async (req, res) => {
  const { error } = updateVideoSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const { videoId } = req.params;

  const existing = await Video.findById(videoId);
  if (!existing) throw new ApiError(404, "Video does not exist");

  let videoLocalPath, thumbnailLocalPath;

  try {
    const updates = {
      title: req.body.title,
      description: req.body.description
    };

    // Update video file (optional)
    if (req.files?.videoFile?.[0]) {
      videoLocalPath = req.files.videoFile[0].path;
      const newVideo = await uploadOnCloudinary(videoLocalPath);

      //HLS URL
      const newHlsUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/sp_auto/v1/${newVideo.public_id}.m3u8`;

      updates.videoFile = {
        public_id: newVideo.public_id,
        url: newHlsUrl
      };

      updates.duration = newVideo.duration;

      await deleteFromCloudinary(existing.videoFile.public_id, "video");
    }

    // Update thumbnail (optional)
    if (req.files?.thumbnail?.[0]) {
      thumbnailLocalPath = req.files.thumbnail[0].path;
      const newThumb = await uploadOnCloudinary(thumbnailLocalPath);

      updates.thumbnail = {
        public_id: newThumb.public_id,
        url: newThumb.url
      };

      await deleteFromCloudinary(existing.thumbnail.public_id);
    }

    const updated = await Video.findByIdAndUpdate(videoId, { $set: updates }, { new: true });

    return res.status(200).json(new ApiResponse(200, updated, "Video updated successfully"));
  } finally {
    if (videoLocalPath && fs.existsSync(videoLocalPath)) fs.unlinkSync(videoLocalPath);
    if (thumbnailLocalPath && fs.existsSync(thumbnailLocalPath)) fs.unlinkSync(thumbnailLocalPath);
  }
});



export const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const existing = await Video.findById(videoId);
  if (!existing) throw new ApiError(404, "Video does not exist");

  await deleteFromCloudinary(existing.videoFile.public_id, "video");
  await deleteFromCloudinary(existing.thumbnail.public_id);

  const deleted = await Video.findByIdAndDelete(videoId);

  return res.status(200).json(new ApiResponse(200, deleted, "Video deleted successfully"));
});


export const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) throw new ApiError(400, "videoId required");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, video, "Publish status updated"));
});
