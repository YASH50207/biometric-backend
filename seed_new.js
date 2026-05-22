const mongoose = require('mongoose');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');

const seedData = async () => {
  try {
    console.log('🌱 Seeding database with 60 EEE students...');

    // Clear existing data
    await Student.deleteMany({});
    await Attendance.deleteMany({});
    console.log('📋 Cleared existing data');

    // ============ GENERATE 60 EEE STUDENTS ============
    const firstNames = [
      'Rajesh', 'Priya', 'Amit', 'Neha', 'Vikram', 'Anjali', 'Rohit', 'Divya', 'Arjun', 'Isha',
      'Aditya', 'Pooja', 'Sanjay', 'Meera', 'Karan', 'Ananya', 'Nikhil', 'Shreya', 'Vivek', 'Ritika',
      'Manish', 'Deepika', 'Suresh', 'Sakshi', 'Harsh', 'Nidhi', 'Ravi', 'Sophia', 'Kunal', 'Sneha',
      'Abhishek', 'Kavya', 'Ashok', 'Payal', 'Rohan', 'Anaya', 'Siddharth', 'Riya', 'Varun', 'Ishita',
      'Ramesh', 'Aditi', 'Ajay', 'Swati', 'Bhavesh', 'Jaya', 'Sandeep', 'Priyanka', 'Yogesh', 'Aadhya',
      'Manoj', 'Shreyas', 'Aryan', 'Navya', 'Sameer', 'Gitika', 'Vikrant', 'Charu', 'Pawan', 'Zara',
    ];

    const lastNames = [
      'Kumar', 'Singh', 'Sharma', 'Patel', 'Gupta', 'Reddy', 'Verma', 'Nair', 'Kapoor', 'Desai',
      'Rao', 'Bhat', 'Iyer', 'Menon', 'Sinha', 'Pandey', 'Joshi', 'Mishra', 'Tripathi', 'Dwivedi',
    ];

    const studentsList = [];
    for (let i = 1; i <= 60; i++) {
      const firstName = firstNames[(i - 1) % firstNames.length];
      const lastName = lastNames[Math.floor((i - 1) / 3) % lastNames.length];
      
      studentsList.push({
        name: `${firstName} ${lastName}`,
        rollNumber: `1AY24EE${String(i).padStart(3, '0')}`,
        fingerprintId: i,
        email: `student${i}@eee.college.edu`,
        department: 'Electrical & Electronics Engineering',
        semester: 4,
        status: 'Active',
        enrolledDate: new Date('2024-08-15'),
      });
    }

    const students = await Student.insertMany(studentsList);
    console.log(`✅ Created ${students.length} EEE students`);

    // ============ GENERATE 60 DAYS OF ATTENDANCE ============
    const attendanceRecords = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // For each day in the past 60 days
    for (let dayOffset = 60; dayOffset >= 1; dayOffset--) {
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

    console.log('\n🌱 Database seeding complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Total Students: ${students.length}`);
    console.log(`   - Total Attendance Records: ${attendance.length}`);
    console.log(`   - Department: Electrical & Electronics Engineering`);
    console.log(`   - Semester: 4`);
    console.log(`   - Roll Number Format: 1AY24EE001 to 1AY24EE060`);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  }
};

module.exports = seedData;
