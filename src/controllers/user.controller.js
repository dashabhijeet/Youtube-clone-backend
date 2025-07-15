import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary,deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";
import jwt from 'jsonwebtoken';
import mongoose from "mongoose";


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

    console.log(req.body);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    console.log(avatarLocalPath);

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
                url:avatar.url,
                public_id:avatar.public_id
            },
            coverImage: {
                url:coverImage.url,
                public_id:coverImage.public_id
            },
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
    .json(new ApiResponse(200,req.user,"Current user fetched successfully"))
});

const updateAccountDetails=asyncHandler(async(req,res) => {
    const {fullName,email} = req.body;

    if(!fullName || !email){
        throw new ApiError(400,"All fields are required");
    }

    const user=await User.findByIdAndUpdate(
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
       try {
         console.log("haina ji",req.file);
 
         if(!avatarLocalPath)
             throw new ApiError(400,"Avatar file is missing.");
 
         const userExists=await User.findById(req.user?._id);
 
         if(!userExists)
             throw new ApiError(404,"User not found");
         console.log("gian hun mai",userExists?.avatar?.public_id);
         if(userExists.avatar?.url)
             await deleteFromCloudinary(userExists.avatar?.public_id);
 
         const avatar=await uploadOnCloudinary(avatarLocalPath);
 
         if(!avatar.url)
             throw new ApiError(400,"Error while uploading image")
 
        const user= await User.findByIdAndUpdate(
             req.user?._id,
             {
                 $set:{
                     avatar:{
                         url:avatar.url,
                         public_id:avatar.public_id
                     }
                 }
             },
             {new:true}
         ).select("-password");
 
         
     return res
     .status(200)
     .json(new ApiResponse(200,user,"avatar image updated successfully"));
       } 
       finally{
        try {
            if(avatarLocalPath && fs.existsSync(avatarLocalPath))
                await fs.promises.unlink(avatarLocalPath);
        } catch (error) {
            console.log(error?.message);
        }
       }
})

const updateUserCoverImage=asyncHandler(async(req,res) => {
    const coverImageLocalPath=req.file?.path;

   try {
     if(!coverImageLocalPath)
         throw new ApiError(400,"Cover Image file is missing.");
 
 
     const userExists=await User.findById(req.user?._id);
 
     if(!userExists)
         throw new ApiError("User does not exist.");
     
     if(userExists.avatar?.url)
         await deleteFromCloudinary(userExists.coverImage?.public_id);
 
     const coverImage=await uploadOnCloudinary(coverImageLocalPath);
 
     if(!coverImage.url)
         throw new ApiError(400,"Error while uploading coverImage");
 
     const user=await User.findByIdAndUpdate(
         req.user?._id,
         {
             $set:{
 
                 coverImage:{
                     url:coverImage.url,
                     public_id:coverImage.public_id
                 }
             }
         },
         {new:true}
     ).select("-password");
 
     return res
     .status(200)
     .json(new ApiResponse(200,user,"Cover image updated successfully"));
    } finally {
       try {
        if(fs.existsSync(coverImageLocalPath) && coverImageLocalPath)
            await fs.promises.unlink(coverImageLocalPath)
       } catch (error) {
           console.log("Unlinking error");
       }
    
   }

})

const getUserChannelProfile=asyncHandler( async(req,res) => {
    const {username} =req.params;

    if(!username?.trim())
        throw new ApiError(400,"username is missing");

    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"     
        }
    },
    {
        $lookup:{
            from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo" 
        }
    },
    {
        $addFields:{
            subscribersCount:{
                $size:"$subscribers"
            },
            channelsSubscribedToCount:{
                $size:"$subscribedTo"
            },
            isSubscribed:{
                $condition:{
                    if:{$in: [req.user?._id,"subscribers.subscriber"]},
                    then:true,
                    else:false
                }
            }
        }
    },
    {
        $project:{
            fullName:1,
            username:1,
            subscribersCount:1,
            channelsSubscribedToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1
        }
    }
    ])

    if(!channel?.length)
        throw new ApiError(404,"Channel does not exist.");

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully.")
    );
});

const getWatchHistory=asyncHandler(async(req,res) => {
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch History fetched successfully"
        )
    )
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
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};