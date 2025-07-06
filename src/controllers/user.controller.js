import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";

const registerUser = asyncHandler(async (req, res) => {
    // return res.status(200).json({
    //     message:"ok"
    // })

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
    console.log("email:", email);

    // if(fullName === "")
    //     throw new ApiError(400,"fullname is required.")
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required.");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    console.log(req.files);
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    console.log(avatarLocalPath);

    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

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
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        });

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        );

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the user");
        }

        return res.status(201).json(
            new ApiResponse(200, createdUser, "User registered Successfully")
        );

    } finally {
        // ✅ Safe cleanup: always attempt to remove local temp files
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
});

export { registerUser };




export {registerUser};