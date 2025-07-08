import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";
import jwt from 'jsonwebtoken';


const generateAccessAndRefreshToken = async (userId) => {
    try{
        const user=await User.findById(userId);
        // console.log("user data",user);
        const accessToken= user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        // console.log("refresh and access",refreshToken,accessToken);

        user.refreshToken=refreshToken;
        
        await user.save({validateBeforeSave:false});  // no need for validation

        return {accessToken,refreshToken};
    
    }catch(error)
    {
        throw new ApiError(500,"Something went wrong while generating refresh and access token.");
    }
}

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

const loginUser=asyncHandler(async (req,res) => {
    //req body -> data le aao
    //Validate if user exists or not, if not tell ki sign up karo
    //if user credentials present, enter password, if not correct say not correct
    //access and refresh token
    // send cookies

    const {email,username,password} = req.body;
    if(!username && !email)
        throw new ApiError(400,"username or email is required.");

   const user=await User.findOne({
        $or:[ {username} , {email} ]
    })  

    if(!user){
        throw new ApiError(404,"User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials.");
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);

        //Abhi update nahi hua hai user me refreshtoken it's still empty destructuring karke we got both tokens but they have to be 
        //updated.

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    //cookie values can be updated from server only not backend.

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,
                refreshToken
            },
            "User logged in successfully"
        )
    )
    
})

const logOutUser=asyncHandler(async(req,res) => {
   
   await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true     //updated refreshtoken ki value milegi
        }
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{},"User logged out.")
        );
})


const refreshAccessToken=asyncHandler( async(req,res) => {
    try {
        const incomingRefreshToken=req.cookies?.refreshToken || req.body.refreshToken;  // Or part if koi mobile se bhej raha ho 
        if(!incomingRefreshToken)
            throw new ApiError(401,"Unauthorized request.");
    
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);  // payload maybe or may not be there,but handled it
    
        const user=await User.findById(decodedToken?._id);
        if(!user)
            throw new ApiError(401,"Invalid refresh token");
    
        if(incomingRefreshToken!==user?.refreshToken)
            throw new ApiError(401,"Refresh token is expired or used.");
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshToken(user._id)
        
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken:newRefreshToken
                },
            "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh Token")
    }




});


const changeCurrentPassword = asyncHandler( async(req,res) => {
    const {oldPassword,newPassword}=req.body;

    const user=await User.findById(req.user?._id);
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect)
        throw new ApiError(401,"Invalid old password.");

    user.password=newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password has been reset."));
});



const getCurrentUser=asyncHandler(async(req,res) => {
    // const user=await User.findById(req.user?._id);
    return res
    .status(200)
    .json(200,"Current user fetched successfully");
});

const updateAccountDetails=asyncHandler(async(req,res) => {
    const {fullName,email} = req.body;

    if(!fullName || !email){
        throw new ApiError(400,"All fields are required");
    }

    const user=User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email:email
            }
        },
        {new:true}
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"));
})

const updateUserAvatar=asyncHandler(async(req,res) => {
        const avatarLocalPath=req.file?.path;

        if(!avatarLocalPath)
            throw new ApiError(400,"Avatar file is missing.");

        const avatar=await uploadOnCloudinary(avatarLocalPath);

        if(!avatar.url)
            throw new ApiError(400,"Error while uploading image")

       const user= await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    avatar:avatar.url,
                }
            },
            {new:true}
        ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200,user,"avatar image updated successfully"));
})

const updateUserCoverImage=asyncHandler(async(req,res) => {
    const coverImageLocalPath=req.file?.path;

    if(!coverImageLocalPath)
        throw new ApiError(400,"Cover Image file is missing.");
    
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url)
        throw new ApiError(400,"Error while uploading coverImage");

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url,
            }
        },
        {new:true}
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover image updated successfully"));
})

export { 
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};