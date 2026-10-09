import mongoose from 'mongoose';

const userApplicationSchema = new mongoose.Schema({
  formType: { 
    type: String, 
    required: true,
    enum: ['EBF-VII', 'LIFE-MEMBERSHIP', 'TA-BILL', 'GENERAL'] // You can expand this enum for future forms
  },
  status: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  // We use Mixed type here! This allows MongoDB to save ANY dynamic JSON object without needing specific columns!
  // Whether EBF sends 50 fields, or LifeMembership sends 20 fields, it all gets stored right here instantly.
  formData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, { timestamps: true });

export default mongoose.model('UserApplication', userApplicationSchema);
