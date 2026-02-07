import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: true,
            trim: true
        },
        public_id: {
            type: String,
            required: true
        },
        caption: {
            type: String,
            trim: true,
            default: null
        },
        format: {
            type: String,
            trim: true
        }
    },
    { _id: false }
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
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
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

gallerySchema.index({ slug: 1 });

export default mongoose.model("Gallery", gallerySchema);
