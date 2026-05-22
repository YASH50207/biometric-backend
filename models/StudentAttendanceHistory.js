const mongoose = require('mongoose');

const studentAttendanceDaySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    dayName: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Present', 'Late', 'Absent', 'Holiday'],
      required: true,
    },
    isHoliday: {
      type: Boolean,
      default: false,
    },
    timeScanned: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const studentAttendanceHistorySchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true,
      index: true,
    },
    generatedFrom: {
      type: Date,
      required: true,
    },
    generatedTo: {
      type: Date,
      required: true,
    },
    days: {
      type: [studentAttendanceDaySchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudentAttendanceHistory', studentAttendanceHistorySchema);