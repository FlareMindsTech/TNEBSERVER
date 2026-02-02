import express from 'express'
import mongoose from 'mongoose'
import dotenv from "dotenv"
import cors from "cors"
  
dotenv.config() 

const app= express();
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({extended:true}));
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Connected to MongoDB...'))
.catch(err => console.error('Could not connect to MongoDB... '+err.message));
  
app.get("/",(req,res)=>{
    res.send("Hello world")
})

const PORT = process.env.PORT || 7800;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));