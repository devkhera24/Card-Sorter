const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloudinary(filePath) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'cardvault',
    resource_type: 'image',
  });
  return result.secure_url;
}

async function deleteFromCloudinary(imageUrl) {
  try {
    // Extract public_id from URL
    const parts = imageUrl.split('/');
    const filenameWithExt = parts[parts.length - 1];
    const filename = filenameWithExt.split('.')[0];
    const publicId = `cardvault/${filename}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (e) {
    console.warn('Could not delete from Cloudinary:', e.message);
  }
}

module.exports = { uploadToCloudinary, deleteFromCloudinary };