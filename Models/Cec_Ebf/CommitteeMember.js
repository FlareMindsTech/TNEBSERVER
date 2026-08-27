import mongoose from 'mongoose';

const CommitteeMemberSchema = new mongoose.Schema(
  {
    photo: {
      type: String,
      default: ''
    },
    cloudinaryId: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      required: [true, 'Member name is required'],
      trim: true
    },
    post: {
      type: String,
      required: [true, 'Post / Position is required'],
      trim: true
    },
    designation: {
      type: String,
      trim: true,
      default: ''
    },
    branch: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    committeeType: {
      type: String,
      required: [true, 'Committee type (CEC or EBF) is required'],
      enum: {
        values: ['CEC', 'EBF'],
        message: 'Committee type must be either CEC or EBF'
      },
      uppercase: true,
      trim: true
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isQueryContact: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Compound Index for fast lookups and sorting
CommitteeMemberSchema.index({ committeeType: 1, isActive: 1, displayOrder: 1 });

export default mongoose.model('CommitteeMember', CommitteeMemberSchema);
