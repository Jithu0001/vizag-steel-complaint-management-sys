const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/AppError');

// Cloudinary storage for complaint photos
const complaintPhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'vizag-steel-cms/complaints',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
    transformation: [
      { width: 1920, height: 1080, crop: 'limit', quality: 'auto' },
    ],
  },
});

// File filter — images only
const imageFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new AppError('Only image files are allowed.', 400), false);
  }
  cb(null, true);
};

// Up to 5 photos per complaint, 10MB each
const uploadComplaintPhotos = multer({
  storage: complaintPhotoStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5,
  },
}).array('photos', 5);

// Promisified version for use in async controllers
const handlePhotoUpload = (req, res) => {
  return new Promise((resolve, reject) => {
    uploadComplaintPhotos(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return reject(new AppError('File too large. Max size is 10MB per photo.', 400));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return reject(new AppError('Too many files. Maximum 5 photos allowed.', 400));
        }
        return reject(new AppError(`Upload error: ${err.message}`, 400));
      }
      if (err) return reject(err);
      resolve();
    });
  });
};

module.exports = { handlePhotoUpload };
