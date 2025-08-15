import mongoose from "mongoose";
import { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkOwnership } from "../utils/checkOwnership.js";
import Joi from "joi";

// Joi Schemas
const createPlaylistSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow("").optional(),
});

const getUserPlaylistsSchema = Joi.object({
  userId: Joi.string().required(),
});

const getPlaylistByIdSchema = Joi.object({
  playlistId: Joi.string().required(),
});

const addOrRemoveVideoSchema = Joi.object({
  playlistId: Joi.string().required(),
  videoId: Joi.string().required(),
});

const updatePlaylistSchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().allow("").optional(),
});

// ✅ Create Playlist
const createPlaylist = asyncHandler(async (req, res) => {
  const { error } = createPlaylistSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const { name, description } = req.body;
  const user = req.user?._id;
  if (!user) throw new ApiError(401, "User not authenticated.");

  const playlistExists = await Playlist.findOne({
    name,
    owner: user,
  });

  if (playlistExists)
    throw new ApiError(409, "Playlist with same name already exists.");

  const playlist = await Playlist.create({
    name,
    description,
    owner: user,
    addedVideos: [],
  });

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created successfully"));
});

// ✅ Get all playlists of a user
const getUserPlaylists = asyncHandler(async (req, res) => {
  const { error } = getUserPlaylistsSchema.validate(req.params);
  if (error) throw new ApiError(400, error.details[0].message);

  const { userId } = req.params;

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Invalid user ID");

  const playlistsOfUser = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        owner: 1,
        addedVideos: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, playlistsOfUser, "Playlists fetched successfully."));
});

// ✅ Get playlist by ID
const getPlaylistById = asyncHandler(async (req, res) => {
  const { error } = getPlaylistByIdSchema.validate(req.params);
  if (error) throw new ApiError(400, error.details[0].message);

  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid playlist ID");

  const playlist = await Playlist.findById(playlistId);

  if (!playlist)
    throw new ApiError(404, "Playlist does not exist with the given ID");

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Particular playlist fetched successfully."));
});

// ✅ Add video to playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { error } = addOrRemoveVideoSchema.validate(req.params);
  if (error) throw new ApiError(400, error.details[0].message);

  const { playlistId, videoId } = req.params;
  const playlist = await checkOwnership(playlistId, Playlist, req.user._id);

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const videoExists = await Video.findById(videoId);
  if (!videoExists) throw new ApiError(404, "Video does not exist.");

  if (!playlist.addedVideos.map(id => id.toString()).includes(videoId)) {
    playlist.addedVideos.push(videoId);
  }

  const response = await playlist.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Video added to playlist successfully."));
});

// ✅ Remove video from playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { error } = addOrRemoveVideoSchema.validate(req.params);
  if (error) throw new ApiError(400, error.details[0].message);

  const { playlistId, videoId } = req.params;
  const playlist = await checkOwnership(playlistId, Playlist, req.user._id);

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  playlist.addedVideos = playlist.addedVideos.filter(
    (id) => id.toString() !== videoId
  );

  const response = await playlist.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Video removed from playlist successfully."));
});

// ✅ Delete playlist
const deletePlaylist = asyncHandler(async (req, res) => {
  const { error } = getPlaylistByIdSchema.validate(req.params);
  if (error) throw new ApiError(400, error.details[0].message);

  const { playlistId } = req.params;
  await checkOwnership(playlistId, Playlist, req.user._id);

  const response = await Playlist.findByIdAndDelete(playlistId);

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Playlist deleted successfully."));
});

// ✅ Update playlist
const updatePlaylist = asyncHandler(async (req, res) => {
  const { error: paramsError } = getPlaylistByIdSchema.validate(req.params);
  if (paramsError) throw new ApiError(400, paramsError.details[0].message);

  const { error: bodyError } = updatePlaylistSchema.validate(req.body);
  if (bodyError) throw new ApiError(400, bodyError.details[0].message);

  const { playlistId } = req.params;
  const { name, description } = req.body;

  const playlist = await checkOwnership(playlistId, Playlist, req.user._id);

  playlist.name = name || playlist.name;
  playlist.description = description || playlist.description;

  const updated = await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, updated, "Playlist details updated successfully."));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
