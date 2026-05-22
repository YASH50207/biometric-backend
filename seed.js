const mongoose = require('mongoose');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');
const StudentAttendanceHistory = require('./models/StudentAttendanceHistory');
const realStudentsData = require('./real_students_data.json');

const seedData = async () => {
  try {
    console.log('🌱 Seeding database with real EEE students...');

    // Clear existing data
    await Student.deleteMany({});
    await Attendance.deleteMany({});
    await StudentAttendanceHistory.deleteMany({});
    console.log('📋 Cleared existing data');

    // ============ INSERT REAL STUDENTS ============
    const students = await Student.insertMany(realStudentsData);
    console.log(`✅ Created ${students.length} EEE students`);

    // ============ GENERATE 90 DAYS OF ATTENDANCE + LINKED HISTORY ============
    const attendanceRecords = [];
    const historyDocs = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 90);

    const getDayName = (date) => date.toLocaleDateString('en-US', { weekday: 'long' });

    const createHistoryEntry = ({ date, status, isHoliday, timeScanned = null, remarks = '' }) => ({
      date: new Date(date),
      dayName: getDayName(date),
      status,
      isHoliday,
      timeScanned,
      remarks,
    });

    // For each day in the past 90 days (excluding today)
    for (let dayOffset = 90; dayOffset >= 1; dayOffset--) {
      const scanDate = new Date(today);
      scanDate.setDate(scanDate.getDate() - dayOffset);
      scanDate.setHours(0, 0, 0, 0);

      // For each student
      for (let idx = 0; idx < students.length; idx++) {
        const student = students[idx];

        historyDocs[idx] = historyDocs[idx] || {
          studentId: student._id,
          generatedFrom: startDate,
          generatedTo: today,
          days: [],
        };

        const isHoliday = scanDate.getDay() === 0 || scanDate.getDay() === 6;

        if (isHoliday) {
          historyDocs[idx].days.unshift(
            createHistoryEntry({
              date: scanDate,
              status: 'Holiday',
              isHoliday: true,
              remarks: scanDate.getDay() === 0 ? 'Sunday holiday' : 'Saturday holiday',
            })
          );
          continue;
        }
        
        // Realistic attendance: 85% present, 10% absent, 5% late
        const random = Math.random();
        let status = 'Present';
        let timeScanned = null;

        if (random < 0.85) {
          status = 'Present';
        } else if (random < 0.95) {
          status = 'Absent';
        } else {
          status = 'Late';
        }

        // Some students have perfect attendance (first 10 students)
        if (idx < 10 && idx % 3 === 0) {
          status = 'Present';
        }

        // Some students have low attendance (last 10 students)
        if (idx >= 50 && random < 0.3) {
          status = 'Absent';
        }

        // Generate realistic scan time
        if (status === 'Present') {
          const hour = 9 + Math.floor(Math.random() * 2); // 9 or 10 AM
          const minute = Math.floor(Math.random() * 60);
          timeScanned = new Date(scanDate);
          timeScanned.setHours(hour, minute, 0, 0);
        } else if (status === 'Late') {
          const hour = 10 + Math.floor(Math.random() * 3); // 10-12 PM
          const minute = Math.floor(Math.random() * 60);
          timeScanned = new Date(scanDate);
          timeScanned.setHours(hour, minute, 0, 0);
        }

        attendanceRecords.push({
          studentId: student._id,
          date: new Date(scanDate),
          status,
          timeScanned: timeScanned,
          remarks: status === 'Late' ? 'Arrived late' : '',
        });

        historyDocs[idx].days.unshift(
          createHistoryEntry({
            date: scanDate,
            status,
            isHoliday: false,
            timeScanned,
            remarks: status === 'Late' ? 'Arrived late' : '',
          })
        );
      }
    }

    const histories = await StudentAttendanceHistory.insertMany(historyDocs);
    await Student.bulkWrite(
      histories.map((historyDoc) => ({
        updateOne: {
          filter: { _id: historyDoc.studentId },
          update: { $set: { attendanceHistoryRef: historyDoc._id } },
        },
      }))
    );

    const attendance = await Attendance.insertMany(attendanceRecords);
    console.log(`✅ Created ${histories.length} student history documents`);
    console.log(`✅ Created ${attendance.length} attendance records`);

    console.log('\n🌱 Database seeding complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Total Students: ${students.length}`);
    console.log(`   - Student History Docs: ${histories.length}`);
    console.log(`   - Total Attendance Records: ${attendance.length}`);
    console.log(`   - Department: Electronics (EEE)`);
    console.log(`   - Semester: 4`);
    console.log(`   - Roll Number Format: 1AY24EE001 to 1AY24EE060`);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  }
};

module.exports = seedData;
