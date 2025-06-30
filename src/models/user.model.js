 import mongoose , {Schema} from "mongoose";
 import jwt from "jsonwebtoken"
 import bcrypt from "bcrypt"

 const UserSchema = new Schema(
    {

       username: 
       {
          type: String,
          required: true,
          unique: true,
          lowercase: true,
          index: true,
          trim: true,
       },
        email: 
       {
          type: String,
          required: true,
          unique: true,
          lowercase: true,
          index: true,
       },
        fullName: 
       {
          type: String,
          required: true,
          index: true,
          trim: true,
       },
         avatar:
        {
          type: String, //cloudnaary Services,
          required: true
        },

        coverImage:
         {
           type: String, //cloudnary Url
         },

         watchHistory:
         [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
         ],
         passwords:
          {
            type: String,
            required: [true, "Password is required"]
          },

          refereshToken:
           {
             type: String,
           }

     },
     {timestamps: true}
)

UserSchema.pre("save",async function(next){
    if(!this.isModified("passwords")) return next();

     this.passwords =await bcrypt.hash(this.passwords, 10)
    next();


});

UserSchema.methods.isPasswordCorrect = async function(passwords){

   return await bcrypt.compare(passwords, this.passwords)

};

UserSchema.methods.generateAccessToken = function(){
  return  jwt.sign(
        {
            _id: this._id,
            username: this.username,
            fullName: this.fullName,
            email: this.email
        },
         process.env.ACCESS_TOKEN_SECRET,
         {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
         }
    )
}
UserSchema.methods.generateRefreshToken = function(){

     return  jwt.sign(
        {
            _id: this._id,
        },
         process.env.REFRESH_TOKEN_SECRET,
         {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
         }
    )

}

 export const User = mongoose.model("User", UserSchema)