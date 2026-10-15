import mongoose from 'mongoose';

const MedicationScheduleSchema = new mongoose.Schema(
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
    times: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          if (!Array.isArray(v) || v.length === 0) return false;
          const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
          return v.every((t) => timeRegex.test(t));
        },
        message: 'Scheduled times must be in 24-hour HH:mm format (e.g. "08:00")',
      },
    },
    daysOfWeek: {
      type: [Number],
      default: [0, 1, 2, 3, 4, 5, 6], // Sunday through Saturday
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0 && v.every((d) => d >= 0 && d <= 6);
        },
        message: 'daysOfWeek must contain integers between 0 and 6',
      },
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
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
  },
  {
    timestamps: true,
  }
);

MedicationScheduleSchema.index({ userId: 1, medicineId: 1, isActive: 1 });

export const MedicationSchedule = mongoose.model('MedicationSchedule', MedicationScheduleSchema);
