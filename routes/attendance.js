const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const StudentAttendanceHistory = require('../models/StudentAttendanceHistory');

// ============ POST /api/attendance/mark ============
// Microcontroller sends: { "fingerprintId": 12 }
router.post('/mark', [
  body('fingerprintId').isInt().withMessage('fingerprintId must be an integer'),
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { fingerprintId } = req.body;

    // Find student by fingerprint ID
    const student = await Student.findOne({ fingerprintId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: `❌ Student with Fingerprint ID ${fingerprintId} not found`,
      });
    }

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if student already marked present today
    const existingAttendance = await Attendance.findOne({
      studentId: student._id,
      date: today,
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: `⚠️ ${student.name} already marked present today at ${existingAttendance.timeScanned.toLocaleTimeString()}`,
        student: {
          name: student.name,
          rollNumber: student.rollNumber,
        },
      });
    }

    // Create attendance record
    const attendance = new Attendance({
      studentId: student._id,
      date: today,
      timeScanned: new Date(),
      status: 'Present',
    });

    await attendance.save();

    res.status(201).json({
      success: true,
      message: `✅ Attendance marked for ${student.name}`,
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
      },
      attendance: {
        date: attendance.date,
        timeScanned: attendance.timeScanned,
        status: attendance.status,
      },
    });
  } catch (error) {
    console.error('❌ Error marking attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking attendance',
      error: error.message,
    });
  }
});

// ============ DELETE /api/attendance/:id ============
// Delete an attendance record (remove from today's live feed)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findByIdAndDelete(id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    res.json({
      success: true,
      message: `✅ Attendance record deleted for ${attendance.studentId}`,
      deletedRecord: attendance,
    });
  } catch (error) {
    console.error('❌ Error deleting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting attendance record',
      error: error.message,
    });
  }
});

// ============ GET /api/attendance/today ============
// Get all students marked present today
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendanceToday = await Attendance.find({ date: today })
      .populate('studentId', 'name rollNumber')
      .sort({ timeScanned: -1 });

    res.json({
      success: true,
      count: attendanceToday.length,
      data: attendanceToday,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching today\'s attendance',
      error: error.message,
    });
  }
});

// ============ GET /api/attendance/history/:rollNumber ============
// Get attendance history for a specific student
router.get('/history/:rollNumber', async (req, res) => {
  try {
    const { rollNumber } = req.params;

    const student = await Student.findOne({ rollNumber });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const historyDoc = await StudentAttendanceHistory.findOne({ studentId: student._id });

    if (historyDoc) {
      const history = [...historyDoc.days].sort((a, b) => new Date(b.date) - new Date(a.date));

      return res.json({
        success: true,
        student: {
          name: student.name,
          rollNumber: student.rollNumber,
        },
        count: history.length,
        data: history,
      });
    }

    const attendanceHistory = await Attendance.find({ studentId: student._id })
      .sort({ date: -1 })
      .limit(90);

    res.json({
      success: true,
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
      },
      count: attendanceHistory.length,
      data: attendanceHistory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance history',
      error: error.message,
    });
  }
});

// ============ GET /api/attendance/stats ============
// Get attendance statistics
router.get('/stats', async (req, res) => {
  try {
    const total = await Attendance.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await Attendance.countDocuments({ date: today });

    res.json({
      success: true,
      stats: {
        totalAttendanceRecords: total,
        todayPresent: todayCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error.message,
    });
  }
});

module.exports = router;
