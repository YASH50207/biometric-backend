const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },
    date: {
      type: Date,
      default: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
      },
    },
    timeScanned: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Present', 'Late', 'Absent'],
      default: 'Present',
    },
    remarks: {
      type: String,
      default: '',
    },
    verifiedBy: {
      type: String,
      default: 'System',
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate attendance on same day
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
