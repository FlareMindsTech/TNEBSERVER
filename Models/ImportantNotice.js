import mongoose from 'mongoose';

const ImportantNoticeSchema = new mongoose.Schema({
  Notice_title: {
    type: String,
    required: true,
    trim: true
  },
  Type: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  docUrl: {
    type: String, // Stores the Cloudinary file URL
    default: null
  },
  cloudinaryId: {
    type: String, // Stores the Cloudinary public ID for deletion
    default: null
  }
}, {
  timestamps: true // adds createdAt and updatedAt
});

export default mongoose.model('ImportantNotice', ImportantNoticeSchema);
