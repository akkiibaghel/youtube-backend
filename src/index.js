// require('dotenv').config({path: './evc'})
import dotenv from 'dotenv'
import connectDB from './db/index.js';

configDotenv.config({
    path: './env'
})

connectDB()







// import express from 'express'
// import { error, log } from 'console';
// const app = express();


// ( async ()=>{
//     try{
//         await mongoose.connect(`${process.env.DB_NAME}/${DB_NAME}`)
//         app.on("error" , (error)=>{
//             console.log("Err" , error);
//             throw error
//         })
//         app.listen(process.env.PORT ,()=>{
//             console.log(`app is lisiting on ${print.env.PORT}`);
//         })
//     } catch (error) {
//         console.log("Error" , error);
//         throw error
//     }
// })()

