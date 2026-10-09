import mongoose from 'mongoose';

const BoardProceedingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Board proceeding title is required'],
      trim: true
    },
    category: {
      type: String,
      enum: {
        values: ["BP's & Orders", "Panels & Promotion"],
        message: '{VALUE} is not a valid category. Must be either "BP\'s & Orders" or "Panels & Promotion"'
      },
      required: [true, 'Category is required ("BP\'s & Orders" or "Panels & Promotion")'],
      default: "BP's & Orders",
      trim: true
    },
    date: {
      type: Date,
      default: Date.now
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

export default mongoose.model('BoardProceeding', BoardProceedingSchema);
