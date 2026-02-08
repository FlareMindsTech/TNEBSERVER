import mongoose from "mongoose";

/* ================= Visitor Schema ================= */

const visitorSchema = new mongoose.Schema({
  visitorId: {
    type: String,
    required: true,
    unique: true
  },

  lastVisit: {
    type: Date,
    required: true
  }
});

// Optional TTL (Remove if you don't want auto delete)
visitorSchema.index(
  { lastVisit: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 }
);


/* ================= Counter Schema ================= */

const counterSchema = new mongoose.Schema({
  totalVisitors: {
    type: Number,
    default: 0
  }
});


/* ================= Models ================= */

export const Visitor = mongoose.model("Visitor", visitorSchema);
export const Counter = mongoose.model("Counter", counterSchema);
