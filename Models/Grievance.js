import mongoose from 'mongoose';
import { deleteFromBunny } from '../config/Bunny.js';

const grievanceSchema = new mongoose.Schema(
  {
    lmNumber: {
      type: String,
      required: [true, 'LM Number is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    district: {
      type: String,
      trim: true,
      default: '',
    },
    grievanceDetails: {
      type: String,
      required: [true, 'Grievance Details are required'],
      trim: true,
    },
    // Supporting Attachment details (Optional, Max 1 file, Max 10 MB)
    attachmentUrl: {
      type: String,
      default: null,
    },
    attachmentKey: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    fileType: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Pending', 'Verified', 'In Progress', 'Resolved', 'Rejected'],
      default: 'Pending',
    },
    // Admin verification fields
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedByName: {
      type: String,
      default: null,
      trim: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual property to return attachment object structure cleanly if needed by frontend
grievanceSchema.virtual('attachment').get(function () {
  if (!this.attachmentUrl) return null;
  return {
    url: this.attachmentUrl,
    key: this.attachmentKey,
    name: this.fileName,
    size: this.fileSize,
    type: this.fileType,
  };
});

// Indexes for query performance
grievanceSchema.index({ lmNumber: 1 });
grievanceSchema.index({ status: 1 });
grievanceSchema.index({ isVerified: 1 });
grievanceSchema.index({ createdAt: -1 });

// Middleware: Clean up Bunny storage file when a grievance document is removed
grievanceSchema.pre('findOneAndDelete', async function () {
  try {
    const docToDelete = await this.model.findOne(this.getQuery());
    if (docToDelete) {
      const fileKey = docToDelete.attachmentKey || docToDelete.attachmentUrl;
      if (fileKey) {
        console.log(`🗑️ Pre-hook (findOneAndDelete): Deleting Bunny storage file: ${fileKey}`);
        await deleteFromBunny(fileKey);
      }
    }
  } catch (err) {
    console.error('Error removing Bunny storage file in Grievance pre findOneAndDelete hook:', err.message);
  }
});

grievanceSchema.pre('deleteOne', { document: true, query: false }, async function () {
  try {
    const fileKey = this.attachmentKey || this.attachmentUrl;
    if (fileKey) {
      console.log(`🗑️ Pre-hook (deleteOne document): Deleting Bunny storage file: ${fileKey}`);
      await deleteFromBunny(fileKey);
    }
  } catch (err) {
    console.error('Error removing Bunny storage file in Grievance pre deleteOne hook:', err.message);
  }
});

grievanceSchema.pre('deleteMany', async function () {
  try {
    const docs = await this.model.find(this.getQuery());
    for (const doc of docs) {
      const fileKey = doc.attachmentKey || doc.attachmentUrl;
      if (fileKey) {
        console.log(`🗑️ Pre-hook (deleteMany): Deleting Bunny storage file: ${fileKey}`);
        await deleteFromBunny(fileKey);
      }
    }
  } catch (err) {
    console.error('Error removing Bunny storage file in Grievance pre deleteMany hook:', err.message);
  }
});

export default mongoose.model('Grievance', grievanceSchema);
