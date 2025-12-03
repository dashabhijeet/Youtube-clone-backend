import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload file
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "video", // Force video for accuracy
      folder: "videos",
    });

    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);

    return {
      public_id: response.public_id,
      duration: response.duration,
      secure_url: response.secure_url,

      mp4: response.secure_url,

      hls: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/sp_auto/v1/${response.public_id}.m3u8`
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);

    return null;
  }
};

// Delete Cloudinary Asset
const deleteFromCloudinary = async (public_id, resource_type = "video") => {
  try {
    if (!public_id) return null;

    const response = await cloudinary.uploader.destroy(public_id, {
      resource_type,
    });

    return response;
  } catch (error) {
    console.error("Cloudinary couldn't delete:", error);
    return null;
  }
};

export {
        uploadOnCloudinary,
        deleteFromCloudinary
        }
