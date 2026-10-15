import mongoose from 'mongoose';

const EscalationHistoryItemSchema = new mongoose.Schema(
  {
    stage: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4],
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    recipientEmail: {
      type: String,
      required: true,
    },
    recipientRole: {
      type: String,
      required: true,
      enum: ['patient', 'caregiver', 'family_member', 'healthcare_professional'],
    },
    status: {
      type: String,
      enum: ['QUEUED', 'ATTEMPTED', 'ACCEPTED', 'DELIVERED', 'FAILED', 'SIMULATED'],
      default: 'DELIVERED',
    },
    jobId: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const DoseRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicationSchedule',
      default: null,
      index: true,
    },
    scheduledTime: {
      type: Date,
      required: true,
      index: true,
    },
    timeString: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['UPCOMING', 'DUE', 'TAKEN', 'UNCONFIRMED', 'CANCELLED'],
      default: 'UPCOMING',
      index: true,
    },
    confirmationTimestamp: {
      type: Date,
      default: null,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    notes: {
      type: String,
      default: '',
      maxlength: 300,
    },
    escalationStage: {
      type: Number,
      default: 0, // 0 = initial, 1 = reminder sent, 2 = follow-up sent, 3 = caregiver, 4 = healthcare
    },
    escalationHistory: {
      type: [EscalationHistoryItemSchema],
      default: [],
    },
    lastNotifiedAt: {
      type: Date,
      default: null,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate dose records for the same schedule and time
DoseRecordSchema.index(
  { scheduleId: 1, scheduledTime: 1 },
  { unique: true, sparse: true }
);

DoseRecordSchema.index({ userId: 1, scheduledTime: 1 });
DoseRecordSchema.index({ userId: 1, status: 1 });

export const DoseRecord = mongoose.model('DoseRecord', DoseRecordSchema);
