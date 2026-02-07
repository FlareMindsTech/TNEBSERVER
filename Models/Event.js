import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date, 
    required: [true, 'Please provide the event date']
  },
  pdfUrl: {
    type: String,
    required: true
  },
  cloudinaryId: {
    type: String, 
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now 
  }
});

export default mongoose.model('Event', EventSchema);