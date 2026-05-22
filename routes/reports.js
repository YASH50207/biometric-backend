const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const StudentAttendanceHistory = require('../models/StudentAttendanceHistory');

const toDateKey = (date) => new Date(date).toISOString().split('T')[0];

const sortHistoryDescending = (days = []) => [...days].sort((a, b) => new Date(b.date) - new Date(a.date));

const buildSummary = (days = []) => {
  const summary = { present: 0, late: 0, absent: 0, holiday: 0 };

  days.forEach((day) => {
    if (day.status === 'Holiday') summary.holiday += 1;
    else if (day.status === 'Present') summary.present += 1;
    else if (day.status === 'Late') summary.late += 1;
    else summary.absent += 1;
  });

  const schoolDays = summary.present + summary.late + summary.absent;
  const attendancePercentage = schoolDays > 0
    ? Math.round(((summary.present + summary.late) / schoolDays) * 100)
    : 0;

  return { ...summary, schoolDays, attendancePercentage };
};

const findStudentByIdentifier = async (identifier) => {
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const byId = await Student.findById(identifier);
    if (byId) return byId;
  }

  return Student.findOne({ rollNumber: identifier });
};

// ============ GET /api/reports/dashboard ============
// Comprehensive dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's stats
    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('studentId', 'name rollNumber department');

    const totalStudents = await Student.countDocuments({ status: 'Active' });
    const presentToday = todayAttendance.filter(a => a.status === 'Present').length;
    const lateToday = todayAttendance.filter(a => a.status === 'Late').length;
    const absentToday = totalStudents - presentToday - lateToday;

    // Attendance rate
    const attendanceRate = totalStudents > 0 
      ? ((presentToday + lateToday) / totalStudents * 100).toFixed(2)
      : 0;

    // Department-wise attendance
    const departmentStats = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $unwind: '$student'
      },
      {
        $group: {
          _id: '$student.department',
          present: {
            $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] }
          },
          late: {
            $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] }
          },
          total: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      dashboard: {
        totalStudents,
        presentToday,
        lateToday,
        absentToday,
        attendanceRate: `${attendanceRate}%`,
        departmentStats,
        todayAttendance: todayAttendance.slice(0, 10)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

// ============ GET /api/reports/attendance-by-date ============
// Get attendance for a specific date range
router.get('/attendance-by-date', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const attendance = await Attendance.find({
      date: { $gte: start, $lte: end }
    })
      .populate('studentId', 'name rollNumber department semester')
      .sort({ date: -1 });

    // Group by date
    const grouped = {};
    attendance.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(record);
    });

    res.json({
      success: true,
      count: attendance.length,
      data: grouped
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance report',
      error: error.message
    });
  }
});

// ============ GET /api/reports/student-performance/:studentId ============
// Get individual student performance report
router.get('/student-performance/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { days = 30 } = req.query;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.find({
      studentId: studentId,
      date: { $gte: startDate }
    }).sort({ date: -1 });

    const present = attendance.filter(a => a.status === 'Present').length;
    const late = attendance.filter(a => a.status === 'Late').length;
    const absent = attendance.filter(a => a.status === 'Absent').length;
    const total = attendance.length;
    const percentage = total > 0 ? ((present + late) / total * 100).toFixed(2) : 0;

    res.json({
      success: true,
      student: {
        name: student.name,
        rollNumber: student.rollNumber,
        department: student.department
      },
      performance: {
        present,
        late,
        absent,
        total,
        attendancePercentage: `${percentage}%`,
        status: percentage >= 75 ? 'Good' : percentage >= 60 ? 'Average' : 'Poor'
      },
      recentRecords: attendance.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching student performance',
      error: error.message
    });
  }
});

// ============ GET /api/reports/student-day/:studentId/:date ============
// Get a single student status for one date
router.get('/student-day/:studentId/:date', async (req, res) => {
  try {
    const { studentId, date } = req.params;
    const targetDate = new Date(date);

    if (Number.isNaN(targetDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }

    targetDate.setHours(0, 0, 0, 0);

    const student = await findStudentByIdentifier(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const historyDoc = await StudentAttendanceHistory.findOne({ studentId: student._id });
    if (historyDoc) {
      const record = historyDoc.days.find((day) => toDateKey(day.date) === toDateKey(targetDate));
      if (record) {
        return res.json({
          success: true,
          student: {
            _id: student._id,
            name: student.name,
            rollNumber: student.rollNumber,
          },
          date: targetDate,
          record,
        });
      }
    }

    const attendance = await Attendance.findOne({ studentId: student._id, date: targetDate });
    const isWeekend = targetDate.getDay() === 0 || targetDate.getDay() === 6;

    return res.json({
      success: true,
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
      },
      date: targetDate,
      record: attendance
        ? {
            date: attendance.date,
            status: attendance.status,
            isHoliday: false,
            timeScanned: attendance.timeScanned,
            remarks: attendance.remarks,
          }
        : {
            date: targetDate,
            status: isWeekend ? 'Holiday' : 'No Record',
            isHoliday: isWeekend,
            timeScanned: null,
            remarks: '',
          },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching student day status',
      error: error.message,
    });
  }
});

// ============ GET /api/reports/department-report ============
// Department-wise attendance report
router.get('/department-report', async (req, res) => {
  try {
    const departments = await Student.distinct('department');

    const reportData = await Promise.all(
      departments.map(async (dept) => {
        const students = await Student.find({ department: dept });
        const studentIds = students.map(s => s._id);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const attendance = await Attendance.find({
          studentId: { $in: studentIds },
          date: { $gte: today, $lt: tomorrow }
        });

        const present = attendance.filter(a => a.status === 'Present').length;
        const late = attendance.filter(a => a.status === 'Late').length;
        const absent = students.length - present - late;
        const percentage = students.length > 0 
          ? ((present + late) / students.length * 100).toFixed(2)
          : 0;

        return {
          department: dept,
          totalStudents: students.length,
          present,
          late,
          absent,
          attendancePercentage: `${percentage}%`
        };
      })
    );

    res.json({
      success: true,
      departmentReport: reportData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching department report',
      error: error.message
    });
  }
});

// ============ GET /api/reports/monthly-summary ============
// Monthly attendance summary
router.get('/monthly-summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const reportMonth = month || currentDate.getMonth() + 1;
    const reportYear = year || currentDate.getFullYear();

    const startDate = new Date(reportYear, reportMonth - 1, 1);
    const endDate = new Date(reportYear, reportMonth, 0);

    const attendance = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('studentId', 'name rollNumber department');

    const daily = {};
    attendance.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      if (!daily[dateKey]) {
        daily[dateKey] = { present: 0, late: 0, absent: 0 };
      }
      if (record.status === 'Present') daily[dateKey].present++;
      else if (record.status === 'Late') daily[dateKey].late++;
      else daily[dateKey].absent++;
    });

    res.json({
      success: true,
      month: reportMonth,
      year: reportYear,
      dailyBreakdown: daily,
      totalRecords: attendance.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly summary',
      error: error.message
    });
  }
});

// ============ GET /api/reports/low-attendance ============
// Students with low attendance
router.get('/low-attendance', async (req, res) => {
  try {
    const { threshold = 75, days = 30 } = req.query;

    const students = await Student.find({ status: 'Active' });
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const lowAttendance = await Promise.all(
      students.map(async (student) => {
        const totalRecords = await Attendance.countDocuments({
          studentId: student._id,
          date: { $gte: startDate }
        });

        const presentRecords = await Attendance.countDocuments({
          studentId: student._id,
          date: { $gte: startDate },
          $or: [{ status: 'Present' }, { status: 'Late' }]
        });

        const percentage = totalRecords > 0 
          ? (presentRecords / totalRecords * 100)
          : 0;

        if (percentage < threshold) {
          return {
            name: student.name,
            rollNumber: student.rollNumber,
            department: student.department,
            attendancePercentage: percentage.toFixed(2),
            presentDays: presentRecords,
            totalRecords: totalRecords
          };
        }
        return null;
      })
    );

    const filtered = lowAttendance.filter(a => a !== null);

    res.json({
      success: true,
      threshold: `${threshold}%`,
      days,
      lowAttendanceStudents: filtered.sort((a, b) => 
        parseFloat(a.attendancePercentage) - parseFloat(b.attendancePercentage)
      )
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching low attendance report',
      error: error.message
    });
  }
});

// ============ GET /api/reports/today-summary ============
// Today's attendance summary
router.get('/today-summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const totalStudents = 60;
    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    });

    const presentToday = todayAttendance.filter(a => a.status === 'Present').length;
    const lateToday = todayAttendance.filter(a => a.status === 'Late').length;
    const absentToday = totalStudents - presentToday - lateToday;

    // Calculate 90-day class health (entire historical period)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const allAttendance = await Attendance.find({ date: { $gte: ninetyDaysAgo } });
    const classHealth = allAttendance.length > 0 
      ? Math.round((allAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length / allAttendance.length) * 100)
      : 0;

    res.json({
      presentToday,
      lateToday,
      absentToday,
      classHealth
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GET /api/reports/trends-chart ============
// 14-day attendance trends
router.get('/trends-chart', async (req, res) => {
  try {
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const present = await Attendance.countDocuments({
        date: { $gte: date, $lt: tomorrow },
        status: 'Present'
      });

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        present: present
      });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GET /api/reports/live-feed ============
// TODAY's attendance scans only (real-time feed)
router.get('/live-feed', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get ONLY TODAY's scans, sorted newest first
    const recent = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    })
      .populate('studentId', 'name rollNumber')
      .sort({ createdAt: -1 })
      .limit(10);

    const feed = recent.map(r => ({
      _id: r._id,
      studentName: r.studentId?.name || 'Unknown',
      rollNumber: r.studentId?.rollNumber || 'N/A',
      status: r.status,
      timestamp: r.timeScanned || r.createdAt
    }));

    res.json(feed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GET /api/reports/students-roster ============
// All students with attendance percentage
router.get('/students-roster', async (req, res) => {
  try {
    const students = await Student.find({ status: 'Active' });
    
    const roster = await Promise.all(
      students.map(async (student) => {
        const totalRecords = await Attendance.countDocuments({ studentId: student._id });
        const presentRecords = await Attendance.countDocuments({
          studentId: student._id,
          $or: [{ status: 'Present' }, { status: 'Late' }]
        });

        const percentage = totalRecords > 0 
          ? Math.round((presentRecords / totalRecords) * 100)
          : 0;

        return {
          _id: student._id,
          name: student.name,
          rollNumber: student.rollNumber,
          fingerprintId: student.fingerprintId,
          attendancePercentage: percentage,
          status: student.status,
          department: student.department,
          semester: student.semester
        };
      })
    );

    res.json(roster);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GET /api/reports/student-history/:studentId ============
// Individual student's attendance history
router.get('/student-history/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await findStudentByIdentifier(studentId);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const historyDoc = await StudentAttendanceHistory.findOne({ studentId: student._id });

    if (historyDoc) {
      const history = sortHistoryDescending(historyDoc.days);
      const summary = buildSummary(history);

      return res.json({
        ...student.toObject(),
        attendancePercentage: summary.attendancePercentage,
        summary,
        history,
      });
    }

    const history = await Attendance.find({ studentId: student._id })
      .sort({ date: -1 })
      .limit(90);

    const totalRecords = await Attendance.countDocuments({ studentId: student._id });
    const presentRecords = await Attendance.countDocuments({
      studentId: student._id,
      $or: [{ status: 'Present' }, { status: 'Late' }]
    });

    const percentage = totalRecords > 0 
      ? Math.round((presentRecords / totalRecords) * 100)
      : 0;

    res.json({
      ...student.toObject(),
      attendancePercentage: percentage,
      summary: buildSummary(history),
      history: history.map(h => ({
        _id: h._id,
        date: h.date,
        status: h.status,
        timeScanned: h.timeScanned,
        isHoliday: false,
        remarks: h.remarks || '',
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

