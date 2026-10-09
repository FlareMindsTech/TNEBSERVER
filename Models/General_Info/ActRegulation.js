import mongoose from 'mongoose';

const ActRegulationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
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

export default mongoose.model('ActRegulation', ActRegulationSchema);
