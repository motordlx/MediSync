import mongoose from 'mongoose';

const MedicineSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      maxlength: [120, 'Medicine name cannot exceed 120 characters'],
    },
    dosage: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Dosage notes cannot exceed 100 characters'],
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Instructions cannot exceed 500 characters'],
    },
    purpose: {
      type: String,
      trim: true,
      default: '',
      maxlength: [150, 'Purpose cannot exceed 150 characters'],
    },
    startDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

MedicineSchema.index({ userId: 1, isArchived: 1, isActive: 1 });

export const Medicine = mongoose.model('Medicine', MedicineSchema);
