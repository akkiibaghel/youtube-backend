import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinry} from "../utils/cloudnary.js"
import {ApiResponse} from "../utils/ApiResponse.js"


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

    const {fullname , username , email , pasword}= req.body
    console.log("Email: " , email);

    // if (fullname === "") {
    //     throw new ApiError(400, "fullname is required")
    // }

    if (
        [fullname, email, password, username].some((field)=> field?.trim()==="")
    ) {
        throw new apiError(400, "All field are required")
    }


    const existedUser = User.findOne({
        $or: [{username} , {email}]
    })

    if (existedUser) {
       throw new ApiError(409, "User with email or username already exists") 
    }

    const avatarlocalPath = req.files?.avatar[0]?.path;
    const coverlocalPath = req.files?.coverImage[0]?.path;

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
export {registerUser}


