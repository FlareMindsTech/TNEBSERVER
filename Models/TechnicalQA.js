import mongoose from 'mongoose';

const TechnicalQASchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    docUrl: {
      type: String, // Stores the Cloudinary file URL
      default: null
    },
    cloudinaryId: {
      type: String, // Stores the Cloudinary public ID for deletion
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('TechnicalQA', TechnicalQASchema);
