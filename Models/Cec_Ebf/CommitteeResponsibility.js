import mongoose from 'mongoose';

const CommitteeResponsibilitySchema = new mongoose.Schema(
  {
    committeeType: {
      type: String,
      required: [true, 'Committee type (CEC or EBF) is required'],
      enum: {
        values: ['CEC', 'EBF', 'REGIONAL', 'BRANCH'],
        message: 'Committee type must be one of CEC, EBF, REGIONAL, or BRANCH'
      },
      uppercase: true,
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Responsibility title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Responsibility description is required'],
      trim: true
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Compound Index for fast lookup and sorting
CommitteeResponsibilitySchema.index({ committeeType: 1, isActive: 1, displayOrder: 1 });

export default mongoose.model('CommitteeResponsibility', CommitteeResponsibilitySchema);
