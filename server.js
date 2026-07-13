import 'dotenv/config'; // Modern way to load .env
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import eventRoutes from './Routes/EventRoutes.js';
import carouselRoutes from './Routes/CarouselRoutes.js';
import userRoutes from './Routes/UserRoutes.js';
import galleryRoutes from './Routes/GalleryRoutes.js';
import minthiranRoutes from './Routes/MinthiranRoutes.js';
import visitorRoutes from './Routes/VisitorRoutes.js';
import aboutRoutes from './Routes/AboutRoutes.js';
import formsRoutes from './Routes/FormsRoutes.js';
import importantNoticeRoutes from './Routes/ImportantNoticeRoutes.js';
import lmNumberRoutes from './Routes/LMNumberRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve local upload files statically
app.use('/uploads', express.static('uploads'));

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
  }
};

connectDB();

app.use('/api/events', eventRoutes);
app.use('/api/carousel', carouselRoutes);
app.use('/api/users', userRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/minthiran', minthiranRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/about', aboutRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/important-notices', importantNoticeRoutes);
app.use('/api/lm-numbers', lmNumberRoutes);

// Global error handler middleware to catch and format middleware/route errors as JSON
app.use((err, req, res, next) => {
  console.error("❌ Global Error Handler Caught:", err);
  res.status(err.status || 500).json({
    message: err.message || "An unexpected error occurred",
    error: err.toString() || err
  });
});

app.get("/", (req, res) => {
  res.send("welcome");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});