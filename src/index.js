import dotenv from 'dotenv'
import connectDB from './db/index.js';
import { app } from './app.js';

dotenv.config({
    path: './env'
})

connectDB()

.then(()=>{
    app.listen(process.env.PORT || 8000 , ()=>{
        console.log(`Serever is running at port : ${process.env.PORT}`);
    })
})
.catch((err) =>{
    console.log("mongodb connection fieled !! ",err);
})







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

