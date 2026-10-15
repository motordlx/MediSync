import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['patient', 'admin'],
      default: 'patient',
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      includeMedicineName: { type: Boolean, default: true }, // Privacy option
      gracePeriodMinutes: { type: Number, default: 30 }, // Stage 2 follow-up
      caregiverGraceMinutes: { type: Number, default: 60 }, // Stage 3 caregiver notification
      healthcareGraceMinutes: { type: Number, default: 120 }, // Stage 4 healthcare contact notification
      enableHealthcareEscalation: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password helper method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe JSON serialization (strip password)
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export const User = mongoose.model('User', UserSchema);
