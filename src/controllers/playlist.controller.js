import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {Video} from "../models/video.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    //TODO: create playlist
    if(!name)
        throw new ApiError(400,"Playlist name is mandatory.");

    const user=req.user?._id;

    const playlistExists = await Playlist.findOne({
  name: name,
  owner: user
});


    if(playlistExists)
        throw new ApiError(404,"Playlist with same name already exists.");

    const playlist=await Playlist.create({
        name,
        description,
        owner:user,
        addedVideos:[],
    })

    return res
    .status(200)
    .json(
        new ApiResponse(200,playlist,"Playlist created successfully")
    );


})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists

    const playlistsOfUser=await Playlist.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $project:{
                name:1,
                description:1,
                owner:1,
                addedVideos:1
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200,playlistsOfUser,"Playlists fetched successfully.")
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    const playlist=await Playlist.findById(playlistId);

    if(!playlist)
        throw new ApiError(404,"playlist does not exist witht the given id");

    return res
    .status(200)
    .json(
        new ApiResponse(200,playlist,"Particular playlist fetched successfully.")
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params;

    const fetchPlaylist=await Playlist.findById(playlistId);

    const videoExists=await Video.findById(videoId);

    if(!videoExists)
        throw new ApiError(400,"Video does not exist.");

    if(!fetchPlaylist)
        throw new ApiError(404,"Playlist with such id does not exist.");
    
    if (!fetchPlaylist.addedVideos.includes(videoId)) {
  fetchPlaylist.addedVideos.push(videoId);
}

const response = await fetchPlaylist.save({ validateBeforeSave: false });

    return res
    .status(200)
    .json(
        new ApiResponse(200,response,"Video added to playlist successfully.")
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params;

    const fetchPlaylist=await Playlist.findById(playlistId);

    if(!fetchPlaylist)
        throw new ApiError(404,"Playlist with such id does not exist.");

    const videos=fetchPlaylist.addedVideos;

    if (videos.includes(videoId)) 
    {
        videos.splice(videos.indexOf(videoId),1);
    }

const response = await fetchPlaylist.save({ validateBeforeSave: false });

    return res
    .status(200)
    .json(
        new ApiResponse(200,response,"Video removed from playlist successfully.")
    )


})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    const playlistExists=await Playlist.findById(playlistId);

    if(!playlistExists)
        throw new ApiError(404,"playlist does not exist to delete.");

    const response=await Playlist.findByIdAndDelete(playlistId);

    return res
    .status(200)
    .json(
        new ApiResponse(200,response,"Playlist deleted successfully.")
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  const playlist = await Playlist.findById(playlistId);

  if (!playlist)
    throw new ApiError(404, "Playlist does not exist to update.");

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
    updatePlaylist
}