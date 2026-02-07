import 'dotenv/config'; // Modern way to load .env
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import eventRoutes from './Routes/EventRoutes.js'; // Note the .js extension is required!
import carouselRoutes from './Routes/CarouselRoutes.js';
import userRoutes from './Routes/UserRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});