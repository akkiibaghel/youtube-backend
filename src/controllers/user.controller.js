import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinry} from "../utils/cloudnary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken';
import { secureHeapUsed } from "crypto";

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
                refreshToken: undefined
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
    clearCookie("refreshToken" , options).json(new ApiResponse(200, {} , "Userlog"))


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
    
        if (incomingRefreshToken !== user?.refreshToken) {
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
export {
    registerUser,   
    loginUser,
    logoutUser,
    refreshAccessToken
}


