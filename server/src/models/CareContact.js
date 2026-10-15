import mongoose from 'mongoose';

const CareContactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required'],
      trim: true,
      maxlength: [60, 'Relationship cannot exceed 60 characters'],
    },
    role: {
      type: String,
      enum: ['caregiver', 'family_member', 'healthcare_professional'],
      default: 'caregiver',
    },
    escalationLevel: {
      type: Number,
      enum: [3, 4], // Stage 3 = caregiver/family, Stage 4 = healthcare contact
      default: 3,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'opted_out'],
      default: 'pending',
      index: true,
    },
    verificationToken: {
      type: String,
      default: null,
      index: true,
    },
    verificationExpires: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate contact email per patient
CareContactSchema.index({ userId: 1, email: 1 }, { unique: true });

export const CareContact = mongoose.model('CareContact', CareContactSchema);
