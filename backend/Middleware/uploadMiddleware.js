const path = require('path');
const fs = require('fs');
const multer = require('multer');

/* 
 * =========================================================================
 * PERSISTENT CLOUD STORAGE CONFIGURATION (CLOUDINARY / AWS S3)
 * =========================================================================
 * To prevent uploads from being lost on ephemeral hosts (Vercel, Heroku, AWS Fargate):
 * 
 * 1. CLOUDINARY APPROACH (Recommended for simple setup):
 *    Install packages: npm install cloudinary multer-storage-cloudinary
 *    Add environment variables:
 *      CLOUDINARY_CLOUD_NAME=your_cloud_name
 *      CLOUDINARY_API_KEY=your_api_key
 *      CLOUDINARY_API_SECRET=your_api_secret
 * 
 *    Setup code:
 *      const cloudinary = require('cloudinary').v2;
 *      const { CloudinaryStorage } = require('multer-storage-cloudinary');
 *      cloudinary.config({
 *        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
 *        api_key: process.env.CLOUDINARY_API_KEY,
 *        api_secret: process.env.CLOUDINARY_API_SECRET
 *      });
 *      const storage = new CloudinaryStorage({
 *        cloudinary: cloudinary,
 *        params: {
 *          folder: 'wf-bedding-products',
 *          allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
 *        }
 *      });
 * 
 * 2. AWS S3 APPROACH:
 *    Install packages: npm install @aws-sdk/client-s3 multer-s3
 *    Add environment variables:
 *      AWS_ACCESS_KEY_ID=your_access_key
 *      AWS_SECRET_ACCESS_KEY=your_secret_key
 *      AWS_REGION=us-east-1
 *      AWS_BUCKET_NAME=your_bucket_name
 * 
 *    Setup code:
 *      const { S3Client } = require('@aws-sdk/client-s3');
 *      const multerS3 = require('multer-s3');
 *      const s3 = new S3Client({ region: process.env.AWS_REGION });
 *      const storage = multerS3({
 *        s3: s3,
 *        bucket: process.env.AWS_BUCKET_NAME,
 *        acl: 'public-read',
 *        metadata: (_, file, cb) => cb(null, { fieldName: file.fieldname }),
 *        key: (_, file, cb) => cb(null, `products/${Date.now()}-${file.originalname}`)
 *      });
 * =========================================================================
 */

const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const fileFilter = (_, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
    return;
  }

  cb(new Error('Only image files are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = upload;