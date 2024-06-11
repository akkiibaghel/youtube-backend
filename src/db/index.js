import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () =>{
    try{
        const connectionInstance = await mongoose.connect(`${process.env.DB_NAME}/${DB_NAME}`)
        console.log(`\n MongoD connected !! DB host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MongoDb connecting error" , error);
        process.exit(1)
    }
}


export default connectDB