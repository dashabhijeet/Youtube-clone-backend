import Joi from "joi";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { Video } from "../models/video.models.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// ===================== Joi Schemas =====================
const registerSchema = Joi.object({
    fullName: Joi.string().trim().min(3).required(),
    username: Joi.string().trim().alphanum().min(3).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
    email: Joi.string().email(),
    username: Joi.string().alphanum(),
    password: Joi.string().required()
}).or("email", "username");

const changePasswordSchema = Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
});

const updateAccountSchema = Joi.object({
    fullName: Joi.string().trim().min(3).required(),
    email: Joi.string().email().required()
});

const usernameParamSchema = Joi.object({
    username: Joi.string().trim().required()
});

const videoIdParamSchema = Joi.object({
    videoId: Joi.string().length(24).hex().required()
});

// ===================== Validation Middleware =====================
const validateBody = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) throw new ApiError(400, error.details[0].message);
    next();
};

const validateParams = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.params);
    if (error) throw new ApiError(400, error.details[0].message);
    next();
};

// ===================== Controllers =====================

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token.");
    }
}

// -------- Register User --------
const registerUser = [
    validateBody(registerSchema),
    asyncHandler(async (req, res) => {
        //get user details from frontend
        //Validate - not empty
        //check if user already exits - username,email
        //check for images, check for avatar
        //upload them to cloudinary if present
        //create user object - create entry in db
        //remove password and refresh token field from response
        //check for user creation
        //return response or else send error

        const { fullName, email, username, password } = req.body;

        if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
            throw new ApiError(400, "All fields are required.");
        }

        const existedUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existedUser) {
            throw new ApiError(409, "User with email or username already exists");
        }

        const avatarLocalPath = req.files?.avatar[0]?.path;
        const coverImageLocalPath = req.files?.coverImage[0]?.path;

        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is required");
        }

        let avatar, coverImage;

        try {
            const avatarUpload = await uploadOnCloudinary(avatarLocalPath);
            const coverImageUpload = await uploadOnCloudinary(coverImageLocalPath);

            avatar = avatarUpload;
            coverImage = coverImageUpload;

            if (!avatar) {
                throw new ApiError(400, "Avatar file is required");
            }

            const user = await User.create({
                fullName,
                avatar: {
                    url: avatar.url,
                    public_id: avatar.public_id
                },
                coverImage: {
                    url: coverImage.url,
                    public_id: coverImage.public_id
                },
                email,
                password,
                username: username.toLowerCase()
            });

            const createdUser = await User.findById(user._id).select("-password -refreshToken");

            if (!createdUser) {
                throw new ApiError(500, "Something went wrong while registering the user");
            }

            return res.status(201).json(
                new ApiResponse(200, createdUser, "User registered Successfully")
            );

        } finally {
            try {
                if (avatarLocalPath && fs.existsSync(avatarLocalPath)) {
                    await fs.promises.unlink(avatarLocalPath);
                }
                if (coverImageLocalPath && fs.existsSync(coverImageLocalPath)) {
                    await fs.promises.unlink(coverImageLocalPath);
                }
            } catch (unlinkErr) {
                console.error("Error while cleaning up temp files:", unlinkErr);
            }
        }
    })
];

// -------- Login User --------
const loginUser = [
    validateBody(loginSchema),
    asyncHandler(async (req, res) => {
        //req body -> data le aao
        //Validate if user exists or not, if not tell ki sign up karo
        //if user credentials present, enter password, if not correct say not correct
        //access and refresh token
        // send cookies

        const { email, username, password } = req.body;
        if (!username && !email)
            throw new ApiError(400, "username or email is required.");

        const user = await User.findOne({ username, email });

        if (!user) throw new ApiError(404, "User does not exist");

        const isPasswordValid = await user.isPasswordCorrect(password);
        if (!isPasswordValid) throw new ApiError(401, "Invalid user credentials.");

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

        const options = { httpOnly: true, secure: true };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully")
            );
    })
];

// -------- Logout User --------
const logOutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: undefined } }, { new: true });

    const options = { httpOnly: true, secure: true };
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out."));
});

// -------- Refresh Token --------
const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
        if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request.");

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);
        if (!user) throw new ApiError(401, "Invalid refresh token");
        if (incomingRefreshToken !== user?.refreshToken)
            throw new ApiError(401, "Refresh token is expired or used.");

        const options = { httpOnly: true, secure: true };
        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access Token Refreshed"));
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh Token");
    }
});

// -------- Change Password --------
const changeCurrentPassword = [
    validateBody(changePasswordSchema),
    asyncHandler(async (req, res) => {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user?._id);
        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

        if (!isPasswordCorrect) throw new ApiError(401, "Invalid old password.");

        user.password = newPassword;
        await user.save({ validateBeforeSave: false });

        return res.status(200).json(new ApiResponse(200, {}, "Password has been reset."));
    })
];

// -------- Get Current User --------
const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// -------- Update Account Details --------
const updateAccountDetails = [
    validateBody(updateAccountSchema),
    asyncHandler(async (req, res) => {
        const { fullName, email } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            { $set: { fullName, email } },
            { new: true }
        ).select("-password");

        return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"));
    })
];

// -------- Update Avatar --------
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    try {
        if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing.");
        const userExists = await User.findById(req.user?._id);
        if (!userExists) throw new ApiError(404, "User not found");

        if (userExists.avatar?.url) await deleteFromCloudinary(userExists.avatar?.public_id);

        const avatar = await uploadOnCloudinary(avatarLocalPath);
        if (!avatar.url) throw new ApiError(400, "Error while uploading image");

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            { $set: { avatar: { url: avatar.url, public_id: avatar.public_id } } },
            { new: true }
        ).select("-password");

        return res.status(200).json(new ApiResponse(200, user, "avatar image updated successfully"));
    } finally {
        try { if (avatarLocalPath && fs.existsSync(avatarLocalPath)) await fs.promises.unlink(avatarLocalPath); } 
        catch (error) { console.log(error?.message); }
    }
});

// -------- Update Cover Image --------
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    try {
        if (!coverImageLocalPath) throw new ApiError(400, "Cover Image file is missing.");
        const userExists = await User.findById(req.user?._id);
        if (!userExists) throw new ApiError("User does not exist");

        if (userExists.coverImage?.url) await deleteFromCloudinary(userExists.coverImage?.public_id);

        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        if (!coverImage.url) throw new ApiError(400, "Error while uploading coverImage");

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            { $set: { coverImage: { url: coverImage.url, public_id: coverImage.public_id } } },
            { new: true }
        ).select("-password");

        return res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully"));
    } finally {
        try { if (coverImageLocalPath && fs.existsSync(coverImageLocalPath)) await fs.promises.unlink(coverImageLocalPath); } 
        catch (error) { console.log("Unlinking error"); }
    }
});

// -------- Get User Channel Profile --------
const getUserChannelProfile = [
    validateParams(usernameParamSchema),
    asyncHandler(async (req, res) => {
        const { username } = req.params;

        const channel = await User.aggregate([
            { $match: { username } },
            { $lookup: { from: "subscriptions", localField: "_id", foreignField: "channel", as: "subscribers" } },
            { $lookup: { from: "subscriptions", localField: "_id", foreignField: "subscriber", as: "subscribedTo" } },
            {
                $addFields: {
                    subscribersCount: { $size: "$subscribers" },
                    channelsSubscribedToCount: { $size: "$subscribedTo" },
                    isSubscribed: {
                        $in: [
                            req.user._id,
                            { $map: { input: "$subscribedTo", as: "s", in: "$$s.subscriber" } }
                        ]
                    }
                }
            }
        ]);

        if (!channel?.length) throw new ApiError(404, "Channel does not exist.");

        return res.status(200).json(new ApiResponse(200, channel[0], "User channel details fetched successfully."));
    })
];

// -------- Get Watch History --------
const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.user._id) } },
        { $unwind: "$watchHistory" },
        { $lookup: { from: "videos", localField: "watchHistory.video", foreignField: "_id", as: "videoDetails" } },
        { $unwind: "$videoDetails" },
        {
            $lookup: {
                from: "users",
                localField: "videoDetails.owner",
                foreignField: "_id",
                as: "videoDetails.owner",
                pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }]
            }
        },
        { $addFields: { "videoDetails.owner": { $first: "$videoDetails.owner" } } },
        { $project: { _id: 0, watchedAt: "$watchHistory.watchedAt", video: "$videoDetails" } },
        { $sort: { watchedAt: -1 } }
    ]);

    return res.status(200).json(new ApiResponse(200, user, "Watch History fetched successfully"));
});

// -------- Add to Watch History --------
const addToWatchHistory = [
    validateParams(videoIdParamSchema),
    asyncHandler(async (req, res) => {
        const userId = req.user._id;
        const { videoId } = req.params;

        const videoExists = await Video.findById(videoId);
        if (!videoExists) throw new ApiError(404, "Video not found");

        const user = await User.findById(userId);

        // Remove the video if already present in history
        user.watchHistory = user.watchHistory.filter((entry) => entry.video.toString() !== videoId.toString());

        // Add the video to the top
        user.watchHistory.unshift({ video: videoId, watchedAt: new Date() });

        // Optional: Keep history length to max 50
        if (user.watchHistory.length > 50) user.watchHistory = user.watchHistory.slice(0, 50);

        await user.save();

        return res.status(200).json(new ApiResponse(200, user.watchHistory, "Watch history updated"));
    })
];

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    addToWatchHistory
};
