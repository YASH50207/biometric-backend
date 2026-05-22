const mongoose = require('mongoose');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');
const realStudentsData = require('./real_students_data.json');
const dotenv = require('dotenv');

dotenv.config();

const seedData = async () => {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/attendance', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected!');

    console.log('🗑️  Clearing existing data...');
    await Student.deleteMany({});
    await Attendance.deleteMany({});
    console.log('✅ Data cleared');

    console.log('📥 Inserting real students...');
    const students = await Student.insertMany(realStudentsData);
    console.log(`✅ SUCCESS! Created ${students.length} students`);

    // Show sample
    if (students.length > 0) {
      console.log('\n📋 Sample students:');
      students.slice(0, 3).forEach(s => {
        console.log(`  - ${s.name} (ID: ${s.fingerprintId}, Roll: ${s.rollNumber})`);
      });
    }

    // ============ GENERATE 90 DAYS OF ATTENDANCE ============
    console.log('\n📅 Generating 90 days of attendance records...');
    const attendanceRecords = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // For each day in the past 90 days (excluding today)
    for (let dayOffset = 90; dayOffset >= 1; dayOffset--) {
      const scanDate = new Date(today);
      scanDate.setDate(scanDate.getDate() - dayOffset);

      // Skip Sundays (day 0)
      if (scanDate.getDay() === 0) continue;

      // For each student
      for (let idx = 0; idx < students.length; idx++) {
        const student = students[idx];

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
          remarks: status === 'Late' ? 'Arrived late' : undefined,
        });
      }
    }

    const attendance = await Attendance.insertMany(attendanceRecords);
    console.log(`✅ Created ${attendance.length} attendance records`);

    await mongoose.disconnect();
    console.log('\n✨ Seeding complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Total Students: ${students.length}`);
    console.log(`   - Total Attendance Records: ${attendance.length}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedData();
