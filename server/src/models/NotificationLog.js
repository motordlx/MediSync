import mongoose from 'mongoose';

const NotificationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doseRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoseRecord',
      required: true,
      index: true,
    },
    stage: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4],
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    recipientRole: {
      type: String,
      required: true,
      enum: ['patient', 'caregiver', 'family_member', 'healthcare_professional'],
    },
    recipientName: {
      type: String,
      default: '',
    },
    channel: {
      type: String,
      default: 'email',
    },
    status: {
      type: String,
      enum: ['QUEUED', 'ATTEMPTED', 'ACCEPTED', 'DELIVERED', 'FAILED', 'SIMULATED'],
      default: 'ATTEMPTED',
      index: true,
    },
    subject: {
      type: String,
      required: true,
    },
    contentSnippet: {
      type: String,
      default: '',
    },
    errorMessage: {
      type: String,
      default: null,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    jobId: {
      type: String,
      default: '',
    },
    attemptCount: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

NotificationLogSchema.index({ userId: 1, createdAt: -1 });

export const NotificationLog = mongoose.model('NotificationLog', NotificationLogSchema);
