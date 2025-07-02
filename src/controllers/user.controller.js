import {asyncHandler} from "../utils/asynchandler.js"
import { ApiError } from "../utils/ApiError.js";
 import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { application } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";



const generateAccessTokenAndRefreshToken =async (userId)=> {
   try {

      const user = await User.findById(userId)
     const accessToken =  user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()

      user.refreshToken = refreshToken
      await user.save({validateBeforeSave: false})

      return {accessToken, refreshToken}
      
   } catch (error) {
      throw new ApiError(500, "something went wrong while generation accessa and refresh token")
   }
}

const registerUser = asyncHandler(async(req, res)=>{
         //get user detail from frontend
         //validate and not empty everything
         //check if user already exist
         //check for image and avator
         //upload to cloudinary
         //create user object
         // create entity in db
         //not retrun password and refresh token in response
         //check user created or not


         const { username, fullName, email, password } =req.body;
         console.log("email", email)
         if (
            [fullName, username, email, password].some((field)=> field?.trim() ==="")
         ) {
             throw new ApiError(400, "All field are refquired")
         }

      const existedUser =  await User.findOne({
            $or : [{email}, {username}]
         })

         if(existedUser){
            throw new ApiError(409, "useranme or email already exist")
         }

      //  const avatarLocalPath =  req.files?.avatar[0]?.path;
      // const coverImageLocalPath = req.files?.coverImage[0]?.path;
      let avatarLocalPath;
if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
  avatarLocalPath = req.files.avatar[0].path;
} else {
  throw new ApiError(400, "Avatar is compulsory");
}
      let coverImageLocalPath;
      if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
         coverImageLocalPath = req.files?.coverImage[0].path
      }


      if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is compulasory")
      }

      const avatar = await uploadCloudinary(avatarLocalPath);
     const coverImage = await uploadCloudinary(coverImageLocalPath)

     if(!avatar){
        throw new ApiError(400,  "Avatar is needed")
     }

     const user = await User.create(
        {
            fullName,
            username: username.toLowerCase(),
            password,
            email,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
        }
     )
  const createdUser = await User.findById(user._id).select("-password -refreshToken");


    if(!createdUser){
        throw new ApiError(500, "founding Error while registerign the user");
    }
     
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )



})

const loginUser = asyncHandler(async (req, res)=>{

   //req body ->data
   //usernaem and emial tking
   //find the user
   //password check
   //generate access token and refresh token\
   //send secure cookies

   const { email, username, password} = req.body
   if (!(username || email) || typeof password !== "string") {
  throw new ApiError(400, "Email or username and password are required and must be strings");
}
   // if(!(username || email)){
   //    throw new ApiError(400, "email and username are required")
   // }

  const user = await User.findOne({
      $or: [{username}, {email}]
   })
   if(!user){
      throw new ApiError(404, "user doesnot exist")
   }

   const isPasswordValid = await user.isPasswordCorrect(password)
   if(!isPasswordValid){
      throw new ApiError(401, "password is incorrect")
   }

   const {accessToken, refreshToken} = await  generateAccessTokenAndRefreshToken(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

   const options = {
      httpOnly: true,
      secure: true
   }
   return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options)
   .json(
   new ApiResponse(200, {loggedInUser, accessToken, refreshToken},"User loggedIn succesfully")
   )
     

})

const logOutUser = asyncHandler(async (req , res) => {

 await  User.findByIdAndUpdate(
      req.user._id,
      {
         $unset: 
         {
            refreshToken: 1
         },
         
      },
      {
         new: true
      }
   )
   const options = {
      httpOnly: true,
      secure: true
   }

   return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
      new ApiResponse(200, {}, "used loggedOut Successfully")
   )

})
const refreshAccessToken = asyncHandler(async (req, res)=> {
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

   if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized access")
      
   }

   try {
      const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
   
     const user = await User.findById(decodedToken?._id)
     if(!user){
      throw new ApiError(401, "invalid  refresh token")
   
     }
   
   //   if (incomingRefreshToken !==user?.refreshToken) {
   //    throw new ApiError(401, "Refresh token is expired or used")
      
   //   }
   
     const options = {
      httpOnly: true,
      secure: true
   
     }
   
   const {accessToken, newrefreshToken} = await   generateAccessTokenAndRefreshToken(user._id)
   
   return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newrefreshToken, options).json(
      new ApiResponse(200,
         {
            accessToken, refreshToken : newrefreshToken, 
         },
         "access token refresh succsssfully"
      )
   )
   } catch (error) {
      throw new ApiError(400, error?.message || "invalid Token")
      
   }

  
})

const changeCurrentPassword = asyncHandler(async (req, res)=>{
   const {oldPassword, newPassword} = req.body
   if(!oldPassword && !newPassword){
      throw new ApiError(400, "old password and new password are required")
   }
  const user =  await  User.findById( req.user?._id)
 const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

 if (!isPasswordCorrect) {
   throw new ApiError(400, "Invalid Old Password")
   
 }

 user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res.status(200).json(new ApiResponse(200, {}, "Password updated successfuly"))
})

const getCurrentUser = asyncHandler(async(req, res)=>{
   const {username, email} = req.body
   if(!username){
      throw new ApiError(400, "user name and email is required")
   }
   const user = await User.findOne({
      $or: [{username}, {email}]
   })
   if(!user){
      throw new ApiError(404, "user doesnot exist")
   }
   return res.status(200).json(
      new ApiResponse(200, user, "user fetched successfully")
   )
})

const updateAccountDetails = asyncHandler(async (req , res)=>{
   const {email, fullName} = req.body
   if (!email && !fullName) {
      throw new ApiError(400, "both email and fullName are required")
      
   }
 const user =  await User.findByIdAndUpdate( req.user?._id,
    {
       $set: {
         fullName,
         email,
       }
    }
 , {new: true}).select("-password")

  return res.status(200).json(new ApiResponse(200, user, "User data updated succesfully"))
})

const userAvatarUpdate = asyncHandler(async(req, res)=>{
  const localFilePath = await req.file?.path
  if (!localFilePath) {
   throw new ApiError(400, 'avatar is missing')
  }
  const avatar = await uploadCloudinary(localFilePath)
  if(!avatar.url){
   throw new ApiError(400, "error while uploading an avatar")
}

const user = await User.findByIdAndUpdate(req.user?._id, 
   {$set: { avatar: avatar.url}},
   {new: true}

).select("-password")

 return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async(req, res)=>{
  const coverImageLocalPath = await req.file?.path

  if(!coverImageLocalPath){
   throw new ApiError(400, "Cover image is missing")
  }
  
 const coverImage = await uploadCloudinary(coverImageLocalPath)

 if(!coverImage.url){
   throw new ApiError(400, "converImage is not uplaoding ")
 }
 const user = await User.findByIdAndUpdate(req.user?._id,
   {$set: {coverImage:coverImage.url}},
   {new: true}
 ).select("-password")

 return res.status(200).json(
   new ApiResponse(200, user,"CoverImage updated Successfully")
 )
})

const getUserChannelProfile = asyncHandler(async(req, res)=>{
   const {username} = req.params
   if(!username?.trim()){
      throw new ApiError(400, "username is missing")
   }
  const channel =await User.aggregate([
   {
   $match:{
      username: username
   },
  },
  {
   $lookup: 
   {
      from: "subscriptions",
      localField: "_id",
      foreignField: "channel",
      as: "subscribers"
   }
  },
  {
   $lookup: 
   {
      from: "subscriptions",
      localField: "_id",
      foreignField:"subscriber",
      as: "subscibedTo"

   }
  },
  {
   $addFields: 
   {
      subscribersCounts: {
         $size: "$subscribers"
      },
       channelSubscribeToCount : {
         $size: "$subscibedTo"
       },
       isSubscribed: {
         $cond: {
            if: {$in: [req.user?._id, "$subscribers.subscriber"]},
            then: true,
            else: false
         }
       }


   }
   
  },
  {
   $project: {
      fullName: 1,
      email: 1,
      username: 1,
      subscribersCounts: 1,
      channelSubscribeToCount: 1,
      isSubscribed: 1,
      avatar: 1,
      coverImage: 1


   }
  }

])
console.log("🔍 Username from URL:", req.params.username);
console.log("🔐 Authenticated User:", req.user);
console.log("📦 Channel Result:", channel);

if(!channel?.length){
   throw new ApiError(404, "channel does not exist")
}

return res.status(200).json(
   new ApiResponse(200, channel[0], "channel fetched successfully")
)


})

const getWatchHistory = asyncHandler(async (req, res)=>{
   const user =await User.aggregate([
      {
         $match: {
            _id: new mongoose.Types.ObjectId(req.user._id)
         }
      },
      {
         $lookup: {
            from: "videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchHistory",
            pipeline: [
               {
                  $lookup: {
                     from: "users",
                     localField: "owner",
                     foreignField: "_id",
                     as: "owner",
                     pipeline: [
                        {
                           $project: {
                              fullName: 1,
                              username: 1,
                              avatar: 1
                           }
                        }
                     ]
                  }
               },
               {
                  $addFields: 
                  {
                     owner: {
                        $first: "$owner"
                     }
                  }
               }
            ]
         }
      }
   ])
   
   return res.status(200).json(
      new ApiResponse(200, user[0].watchHistory, "user watchHistory fetched successfully")
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
   userAvatarUpdate,
   updateUserCoverImage,
   getUserChannelProfile,
   getWatchHistory
}