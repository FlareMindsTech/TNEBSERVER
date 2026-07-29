import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone_no: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  pbo_number: {
    type: String,
    trim: true,
    default: null
  },
  date_of_birth: {
    type: Date,
    default: null
  },
  emp_id: {
    type: String,
    trim: true,
    default: null
  },
  lm_number: {
    type: String,
    unique: true,
    sparse: true, // Allows null/undefined to not clash, though we expect it for Users
    trim: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'user'],
    default: 'user'
  },
  lastLoginLocation: {
    type: String, // You can store "Lat, Long" string or a JSON string. keeping it flexible.
    default: null
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
