const mongoose = require('mongoose');
require('dotenv').config();

const Student = require('./models/Student');
const Attendance = require('./models/Attendance');

async function testDelete() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Get first student
    const student = await Student.findOne();
    if (!student) {
      console.log('❌ No students found. Please register students first.');
      process.exit(1);
    }

    console.log(`\n📋 Using student: ${student.name} (${student.rollNumber})`);

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if student already has record today
    let record = await Attendance.findOne({
      studentId: student._id,
      date: today,
    });

    if (record) {
      console.log(`✅ Found existing record: ${record._id}`);
    } else {
      // Create new record
      record = new Attendance({
        studentId: student._id,
        date: today,
        timeScanned: new Date(),
        status: 'Present',
      });
      await record.save();
      console.log(`✅ Created test record: ${record._id}`);
    }

    console.log(`\n🧪 Testing DELETE endpoint with ID: ${record._id}`);
    console.log(`\n📌 Use this curl command to test:`);
    console.log(`   curl -X DELETE http://localhost:8080/api/attendance/${record._id}`);

    // Test the live-feed endpoint to see if _id is included
    console.log(`\n📌 Check live-feed endpoint to see _id:`);
    console.log(`   curl http://localhost:8080/api/reports/live-feed`);

    console.log(`\n✅ Test setup complete. Record ready for deletion test.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testDelete();
