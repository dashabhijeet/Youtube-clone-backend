import mongoose from "mongoose";
import { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkOwnership } from "../utils/checkOwnership.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) throw new ApiError(400, "Playlist name is mandatory.");

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

const getUserPlaylists = asyncHandler(async (req, res) => {
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

const getPlaylistById = asyncHandler(async (req, res) => {
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

const addVideoToPlaylist = asyncHandler(async (req, res) => {
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

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
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

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  await checkOwnership(playlistId, Playlist, req.user._id);

  const response = await Playlist.findByIdAndDelete(playlistId);

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Playlist deleted successfully."));
});

const updatePlaylist = asyncHandler(async (req, res) => {
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
