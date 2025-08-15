import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Joi from "joi";

// Joi Schemas
const toggleSubscriptionSchema = Joi.object({
  // No body required, channelId comes from params
});

const getUserChannelSubscribersSchema = Joi.object({
  channelId: Joi.string().required()
});

// ✅ Toggle subscription (subscribe/unsubscribe)
const toggleSubscription = asyncHandler(async (req, res) => {
  // Validate body (if needed in future, currently no body for toggle)
  const { error } = toggleSubscriptionSchema.validate(req.body);
  if (error) throw new ApiError(400, error.details[0].message);

  const { channelId } = req.params;
  const subscriberId = req.user?._id;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  if (subscriberId.toString() === channelId.toString()) {
    throw new ApiError(400, "You cannot subscribe to your own channel");
  }

  const existingSub = await Subscription.findOne({
    channel: channelId,
    subscriber: subscriberId,
  });

  if (existingSub) {
    await existingSub.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Unsubscribed successfully"));
  }

  const newSubscription = await Subscription.create({
    channel: channelId,
    subscriber: subscriberId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, newSubscription, "Subscribed successfully"));
});

// ✅ Get list of subscribers for a specific channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  // Validate params
  const { error } = getUserChannelSubscribersSchema.validate(req.params);
  if (error) throw new ApiError(400, error.details[0].message);

  const { channelId } = req.params;

  const channelExists = await Subscription.findOne({ channel: channelId });
  if (!channelExists) {
    throw new ApiError(400, "Channel does not exist.");
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberInfo",
        pipeline: [
          {
            $project: {
              "avatar.url": 1,
              fullName: 1,
              username: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscriberInfo", // optional, if you want flat results
    },
    {
      $project: {
        _id: 0,
        subscriber: "$subscriberInfo",
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, subscribers, "Subscribers fetched successfully"));
});

// ✅ Get channels a user is subscribed to
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const subscriberId = req.user._id;

  const subscriptions = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelUserInfo",
        pipeline: [
          {
            $project: {
              _id: 1,
              fullName: 1,
              username: 1,
              "avatar.url": 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$channelUserInfo",
    },
    {
      $group: {
        _id: "$subscriber",
        subscriberToChannelsInfo: { $push: "$channelUserInfo" },
        subscriptions: { $push: "$$ROOT" }, // if you also want the subscription metadata
      },
    },
    {
      $project: {
        _id: 0,
        subscriber: "$_id",
        subscriberToChannelsInfo: 1,
        // optionally add subscriptions: 1 if you want full subscription details
      },
    },
  ]);

  if (!subscriptions.length) {
    throw new ApiError(404, "No subscribed channels found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscriptions, "Subscribed channels fetched successfully")
    );
});

export {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
};
