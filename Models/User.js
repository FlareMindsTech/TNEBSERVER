import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: function() { return this.role !== 'treasurer'; },
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  phone_no: {
    type: String,
    required: function() { return this.role !== 'treasurer'; },
    unique: true,
    sparse: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: function() { return this.role !== 'treasurer'; },
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
    enum: ['owner', 'admin', 'treasurer', 'user'],
    default: 'user'
  },
  lastLoginLocation: {
    type: String, // You can store "Lat, Long" string or a JSON string. keeping it flexible.
    default: null
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
