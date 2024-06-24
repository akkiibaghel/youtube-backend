import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinry} from "../utils/cloudnary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken';
import { secureHeapUsed } from "crypto";
import { userInfo } from "os";
import mongoose from "mongoose";

const generateAccessTokenAndRefreshToken = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken};


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}


const registerUser = asyncHandler( async (req ,res ) =>{
    //get user details from frontend
    //validation 
    //check is user alleready exists:  username , email
    //check image
    // upload them to cloudinary , avtar
    //create user object - create entry in db
    //remove password and refresh token field from responce 
    //check for user creation
    //return res 

    const {fullname , username , email , password}= req.body
    console.log("password: " , password);

    if (
        [fullname, email, password, username].some((field)=> field?.trim()==="")
    ) {
        throw new ApiError(400, "All field are required")
    }


    const existedUser =await User.findOne({
        $or: [ {username } , { email }]
    })

    if (existedUser) {
       throw new ApiError(409, "User with email or username already exists") 
    }

    // console.log(req.files);  

    const avatarlocalPath = req.files?.avatar[0]?.path;
    // const coverlocalPath = req.files?.coverImage[0]?.path;
    let coverlocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverlocalPath = req.files.coverImage[0].path
    }

    if (!avatarlocalPath) {
        throw new ApiError(400 , "Avatar file is required")
    }


    const avatar = await uploadOnCloudinry(avatarlocalPath)
    const coverImage = await uploadOnCloudinry(coverlocalPath)

    

    if (!avatar) {
        throw new ApiError(400, "Avatar is rewuired")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500 , "Something went wrong while registering the user")
    }
    return res.status(201).json(
        new ApiResponse(200,createdUser, "Userregistered successfully")
    )




})

const loginUser = asyncHandler( async (req ,res)=>{
    //req body se data lena hai 
    //username , email preaent hai ya nhi
    // find the user
    //password check
    //access and refresh token
    //send cookie

    const {username , password , email} = req.body
    console.log(email);

    if (!username && !email) {
        throw new ApiError(400 , " Username or password is required")
    }

    const user = await User.findOne({
        $or: [{username} , {email}]
    })
    // console.log(await bcrypt.hash(password,10));
    // console.log(user.password);

    if (!user) {

        throw new ApiError(404, "User not created")

    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken , refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select(" -password -refreshToken ")

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).cookie("accessToken" ,accessToken, options).
    cookie("refreshToken", refreshToken, options).json(new ApiResponse(200,

            {
                user: loggedInUser , accessToken , refreshToken
            },
            "User logged In Successfully"
        )
    )

    


})

const logoutUser = asyncHandler( async (req ,res) =>{
    //cookei clrear karna hoga 
    // refresh token clear 
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: null
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).
    clearCookie("accessToken", options).
    clearCookie("refreshToken" , options).json(new ApiResponse(200, {} , "User logout successfully"))


})

const refreshAccessToken = asyncHandler(async (req,res) =>{
    const incomingRefreshToken = req.console.refreshToken || req.body.refreshToken

    if (incomingRefreshToken) {
        throw new ApiError(401, "unathorized request")
    }
    
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRE)
    
        const  user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "unathorized request")
        }
    
        if (!incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "expired and used refresh Token")
        }
    
        const options = {
            httpOnly: true,
            secureHeapUsed: true
        }
        const {accessToken , newrefreshToken} = await generateAccessTokenAndRefreshToken(user._id)
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken" , newrefreshToken, options)
        .json(
            new ApiResponse(
                200, {accessToken,refreshToken: newrefreshToken},
                "Access token refreshToken"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async(req, res)=>{

    const {oldPassword , newPassword,confPassword} = req.body

    if (!(newPassword === confPassword)) {
        throw new ApiError(400 , "Password not match")
    }

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400 , "Password is not correct")
    }


    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200,{} ,"Your password is update successfully"))
})

const getCurrentUser = asyncHandler( async(req , res)=>{
    return res.status(200)
    .json(200, req.user, "current user fatched successfully")
})

const updateAccountDetails = asyncHandler( async(req, res) =>{
    const {fullname, email} = req.body

    if (!fullname || !email) {
        throw new ApiError(400, "All field required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {new: true}
    ).select(" -password ")
    return  res.status(200)
    .json(new ApiResponse(200, user, "Account details successfully"))


})

const updateUserAvatar = asyncHandler(async(req , res)=>{
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinry(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select(" -password ")

    return res.status(200)
    .json(
        new ApiResponse(200, user, "avatar updated successsfully")
    )
})

const updateUserCoverImg = asyncHandler(async(req , res)=>{
    const coverLocalPath = req.file?.path

    if (!coverLocalPath) {
        throw new ApiError(400, "coverImg file is missing")
    }

    const coverImage = await uploadOnCloudinry(coverLocalPath)
    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select(" -password ")

    return res.status(200)
    .json(
        new ApiResponse(200, user, "coverImage updated successsfully")
    )
})

const getUserChangeProfile = asyncHandler( async(req, res) =>{
    const {username} = req.params

    if (!username?.trim()) {
       throw new ApiError(400, "Username is missing") 
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscription",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscription",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscriberedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscriberedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscriber.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])
    console.log(channel);

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }
    return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User channel fatched successfully"))
    

})

const getWatchHistry = asyncHandler(async(req, res) =>{
    const user = User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "video",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "user",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory), "wahtch history fetched successfully")
})   

export {
    registerUser,   
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImg,
    getUserChangeProfile,
    getWatchHistry
    
}


