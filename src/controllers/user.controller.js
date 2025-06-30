import {asyncHandler} from "../utils/asynchandler.js"
import { ApiError } from "../utils/ApiError.js";
 import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

      const existedUser =   User.findOne({
            $or : [{email}, {username}]
         })

         if(existedUser){
            throw new ApiError(409, "useranme or email already exist")
         }

       const avatorLocalPath =  req.files?.avator[0]?.path;
      const coverImageLocalPath = req.files?.coverImage[0]?.path;

      if(!avatorLocalPath){
        throw new ApiError(400, "Avator is compulasory")
      }

      const avator = await uploadCloudinary(avatorLocalPath);
     const coverImage = await uploadCloudinary(coverImageLocalPath)

     if(!avator){
        throw new ApiError(400,  "Avaor is needed")
     }

     const user = await User.create(
        {
            fullName,
            username: username.toLowerCase(),
            passwords,
            email,
            avator: avator.url,
            coverImage: coverImage?.url || "",
        }
     )
    const createdUser = await User.findById(user(_id)).select("-passwords -refereshToken");

    if(!createdUser){
        throw new ApiError(500, "founding Error while registerign the user");
    }
     
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )



})

export {registerUser}