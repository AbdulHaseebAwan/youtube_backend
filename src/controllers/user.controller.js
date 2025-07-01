import {asyncHandler} from "../utils/asynchandler.js"
import { ApiError } from "../utils/ApiError.js";
 import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { application } from "express";
import jwt from "jsonwebtoken";



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
         $set: 
         {
            refreshToken: undefined
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



export {
   registerUser,
   loginUser,
   logOutUser,
   refreshAccessToken
}