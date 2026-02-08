import mongoose from "mongoose";

const minthiranSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true
    },

    month: {
      type: String,
      required: true,
      enum: [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
      ]
    },

    pdf: {
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

export default mongoose.model("Minthiran", minthiranSchema);
