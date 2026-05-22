const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    rollNumber: {
      type: String,
      unique: [true, 'Roll number must be unique'],
      required: [true, 'Please provide a roll number'],
      trim: true,
    },
    fingerprintId: {
      type: Number,
      unique: [true, 'Fingerprint ID must be unique'],
      required: [true, 'Please provide a fingerprint ID'],
    },
    email: {
      type: String,
      default: null,
    },
    department: {
      type: String,
      enum: ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Chemical', 'Other'],
      default: 'Computer Science',
    },
    semester: {
      type: Number,
      min: 1,
      max: 8,
      default: 1,
    },
    phone: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      default: null,
    },
    enrolledDate: {
      type: Date,
      default: Date.now,
    },
    attendanceHistoryRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentAttendanceHistory',
      default: null,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
