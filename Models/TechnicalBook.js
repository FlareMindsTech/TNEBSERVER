import mongoose from 'mongoose';

const TechnicalBookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    tag: {
      type: String,
      trim: true,
      default: ''
    },
    tags: [
      {
        type: String,
        maxlength: [30, 'Each tag cannot exceed 30 characters'],
        trim: true
      }
    ],
    docUrl: {
      type: String, // Cloudinary file URL
      default: null
    },
    cloudinaryId: {
      type: String, // Cloudinary public ID for deletion
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('TechnicalBook', TechnicalBookSchema);
