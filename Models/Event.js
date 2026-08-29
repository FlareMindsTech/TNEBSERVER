import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: false,
    default: '',
    trim: true
  },
  category: {
    type: String,
    required: false,
    default: 'new_event',
    trim: true
  },
  date: {
    type: Date, 
    required: [true, 'Please provide the event date'],
    default: Date.now
  },
  pdfUrl: {
    type: String,
    required: false,
    default: null
  },
  cloudinaryId: {
    type: String, 
    required: false,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now 
  }
});

export default mongoose.model('Event', EventSchema);
