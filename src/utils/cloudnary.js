import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View Credentials' below to copy your API secret
    });

    const uploadOnCloudinry = async (localfilepath)=>{
        try {
            if(!localfilepath) return null
            //upload the file on cloudinaty
            const responces = await cloudinary.uploader.upload(localfilepath, {
                resource_type: "auto"
            })
            // file has beenn uploaded successfull
            // console.log("File is uploaded on cloudniary" , responces.url);
            fs.unlinkSync(localfilepath)
            return responces;

        } catch (error) {
            fs.unlinkSync(localfilepath) // remove the locally saved  temporarry file as the upload operation got failed

            return null;
        }
    }

export {uploadOnCloudinry}