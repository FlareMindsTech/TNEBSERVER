import mongoose from 'mongoose';

const TechnicalParameterSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    tag: {
      type: String,
      maxlength: [30, 'Tag cannot exceed 30 characters'],
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

export default mongoose.model('TechnicalParameter', TechnicalParameterSchema);
