import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.models.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const videoExists=await Video.findById(videoId);
    
    if(!videoExists)
        throw new ApiError(400,"Video doesn't exist.");


    const comments=await Comment.find({videoId})
    .sort({createdAt:-1})
    .skip((page-1)*limit)
    .limit(Number(limit));


    return res
    .status(200)
    .json(
        new ApiResponse(200,comments,"Video comments fetched succesfully.")
    )

})

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  // ✅ Check if video exists in Video collection
  const videoExists = await Video.findById(videoId);
  if (!videoExists) {
    throw new ApiError(400, "Video doesn't exist.");
  }

  // ✅ Get user from JWT middleware
  const commentedBy = req.user._id;

  // ✅ Create new comment
  const newComment = await Comment.create({
    videoId,
    content,
    commentedBy
  });

  return res.status(201).json(
    new ApiResponse(201, newComment, "Comment added successfully.")
  );
});


const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId }= req.params;
    const { content }=req.body;
    
    const existingComment=await Comment.findById(commentId);

    if(!existingComment)
         throw new ApiError(403,"Comment does not exist by the user.");
    
    if(existingComment.commentedBy.toString() !== req.user._id.toString())
        throw new ApiError(403,"You cannot edit someone else's comment");


    const response=await Comment.findByIdAndUpdate(
     {_id:commentId},
    {  
      $set:
      {
        content:content,
      }
    },
    {new:true}
  )
    
  return res
  .status(201)
  .json(
    new ApiResponse(201,response,"Updated comment succesfully")
  )
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

     const existingComment=await Comment.findById(commentId);

    if(!existingComment)
         throw new ApiError(404,"Comment does not exist by the user.");

    if(existingComment.commentedBy.toString() !== req.user._id.toString())
        throw new ApiError(403,"You cannot delete someone else's comment");

    const response=await Comment.findByIdAndDelete(commentId);

    res
    .status(200)
    .json(
      new ApiResponse(204,response,"Commented deleted successfully")
    );
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
    }