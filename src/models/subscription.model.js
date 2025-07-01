import mongoose ,{Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber : {
        type: Schema.Types.ObjectId,//subscriber
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId,// to whom subscriber is subscribig the channel
        ref: "User"
    }
},{timestamps: true})

export const Subscription = mongoose.model("Subscription", subscriptionSchema)