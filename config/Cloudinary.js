import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: process.env.CLOUDINARY_FOLDER,
    resource_type: 'auto',
    public_id: (req, file) => {
      const name = file.originalname.split('.')[0];
      const extension = file.originalname.split('.').pop();
      return `${Date.now()}-${name}.${extension}`;
    },
  },
});

const upload = multer({ storage: storage });

export { cloudinary, upload };