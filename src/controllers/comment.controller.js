import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Joi from "joi";

// ✅ Joi schemas
const commentQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).optional()
});

const commentBodySchema = Joi.object({
  content: Joi.string().min(1).required()
});

// ✅ Get all comments for a video
const getVideoComments = asyncHandler(async (req, res) => {
  const { error } = commentQuerySchema.validate(req.query);
  if (error) throw new ApiError(400, error.details[0].message);

  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const videoExists = await Video.findById(videoId);
  if (!videoExists) throw new ApiError(400, "Video doesn't exist.");

  const comments = await Comment.find({ videoId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Video comments fetched successfully."));
});

// ✅ Add a comment
const addComment = asyncHandler(async (req, res) => {
  const { error } = commentBodySchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const { videoId } = req.params;
  const { content } = req.body;

  const videoExists = await Video.findById(videoId);
  if (!videoExists) throw new ApiError(400, "Video doesn't exist.");

  const commentedBy = req.user._id;

  const newComment = await Comment.create({
    videoId,
    content,
    commentedBy
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newComment, "Comment added successfully."));
});

// ✅ Update a comment
const updateComment = asyncHandler(async (req, res) => {
  const { error } = commentBodySchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const { commentId } = req.params;
  const { content } = req.body;

  const existingComment = await Comment.findById(commentId);
  if (!existingComment) throw new ApiError(403, "Comment does not exist by the user.");

  if (existingComment.commentedBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You cannot edit someone else's comment");
  }

  const response = await Comment.findByIdAndUpdate(
    { _id: commentId },
    { $set: { content } },
    { new: true }
  );

  return res
    .status(201)
    .json(new ApiResponse(201, response, "Updated comment successfully"));
});

// ✅ Delete a comment
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const existingComment = await Comment.findById(commentId);
  if (!existingComment) throw new ApiError(404, "Comment does not exist by the user.");

  if (existingComment.commentedBy.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You cannot delete someone else's comment");
  }

  const response = await Comment.findByIdAndDelete(commentId);

  return res
    .status(200)
    .json(new ApiResponse(204, response, "Comment deleted successfully"));
});

export {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment
};
