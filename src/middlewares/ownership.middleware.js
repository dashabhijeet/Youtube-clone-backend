import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

// utils/checkOwnership.js

import mongoose from "mongoose";
import { ApiError } from "./ApiError.js";

/**
 * Verifies ownership of any Mongoose document with an `owner` field.
 *
 * @param {string} resourceId - The ID of the document to check.
 * @param {mongoose.Model} model - The Mongoose model (e.g., Playlist, Video).
 * @param {string} userId - The ID of the currently authenticated user.
 * @returns {Promise<Object>} - The found document if ownership is verified.
 * @throws {ApiError} - If ID is invalid, not found, or unauthorized.
 */
export const checkOwnership = async (resourceId, model, userId) => {
  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    throw new ApiError(400, "Invalid resource ID.");
  }

  const document = await model.findById(resourceId);

  if (!document) {
    throw new ApiError(404, `${model.modelName} not found.`);
  }

  if (!document.owner || document.owner.toString() !== userId.toString()) {
    throw new ApiError(403, `You are not authorized to access this ${model.modelName}.`);
  }

  return document;
};
