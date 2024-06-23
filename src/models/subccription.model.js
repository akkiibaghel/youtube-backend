import { subscribe } from "diagnostics_channel";
import mongoose,{Schema} from "mongoose";
import { User } from "./user.model";

const scubriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, //one who is subscribing
        ref: User
    },
    channel: {
        type: Schema.Types.ObjectId, //one to who subscriber is subcribeing 
        ref: User
    },

},   {timestamps: true})

export const Subscription = mongoose.model("Subscription", scubriptionSchema)
 