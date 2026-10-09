import mongoose from 'mongoose';

const AboutSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  vision: {
    type: String,
    trim: true
  },
  mission: {
    type: String,
    trim: true
  },
  history: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String
  },
  cloudinaryId: {
    type: String
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('About', AboutSchema);
