import mongoose from "mongoose";

const minnagamSchema = new mongoose.Schema(
  {
    nomineeName: {
      type: String,
      required: true
    },
    relation: {
      type: String,
      required: true
    },
    units: {
      type: Number,
      required: true,
      min: 1
    },
    amount: {
      type: Number,
      required: true
    },
    utrNumber: {
      type: String,
      required: true
    },
    document: {
      url: {
        type: String,
        required: true
      },
      public_id: {
        type: String,
        required: true
      }
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to ensure amount is calculated based on units
minnagamSchema.pre('save', function () {
  if (this.isModified('units') || this.isNew) {
    this.amount = this.units * 20000;
  }
});

export default mongoose.model("Minnagam", minnagamSchema);
