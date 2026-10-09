import mongoose from 'mongoose';

const CommitteeTermSchema = new mongoose.Schema(
  {
    committeeType: {
      type: String,
      required: [true, 'Committee type (CEC or EBF) is required'],
      enum: {
        values: ['CEC', 'EBF', 'REGIONAL', 'BRANCH'],
        message: 'Committee type must be one of CEC, EBF, REGIONAL, or BRANCH'
      },
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    currentTerm: {
      type: String,
      trim: true,
      default: ''
    },
    electedDate: {
      type: String,
      trim: true,
      default: ''
    },
    nextElectionDate: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { timestamps: true }
);

export default mongoose.model('CommitteeTerm', CommitteeTermSchema);
