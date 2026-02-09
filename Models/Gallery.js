import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: true
        },
        public_id: {
            type: String,
            required: true
        },
        caption: {
            type: String,
            default: null
        },
        format: {
            type: String
        }
    },
    { _id: true }
);

const gallerySchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        date: {
            type: Date,
            default: Date.now
        },
        images: {
            type: [imageSchema],
            default: []
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Gallery", gallerySchema);
