import mongoose from 'mongoose';

const FormsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['form', 'loan'],
    required: true,
    default: 'form'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  pdfUrl: {
    type: String, // Stores the Cloudinary file URL
    required: true
  },
  cloudinaryId: {
    type: String, // Stores the Cloudinary public ID for deletion
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Forms', FormsSchema);
