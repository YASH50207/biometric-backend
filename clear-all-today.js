#!/usr/bin/env node

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Attendance = require('./models/Attendance');

dotenv.config();

async function deleteAllToday() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB Connected!');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('\n🗑️  Deleting ALL records created today (by createdAt)...');
    console.log(`   CreatedAt range: ${today.toISOString()} to ${tomorrow.toISOString()}`);

    // Delete by BOTH date AND createdAt to catch everything
    const result = await Attendance.deleteMany({
      $or: [
        { date: { $gte: today, $lt: tomorrow } },
        { createdAt: { $gte: today, $lt: tomorrow } }
      ]
    });

    console.log(`✅ Deleted ${result.deletedCount} attendance records`);
    console.log('\n📊 Today\'s Live Scans should now be COMPLETELY EMPTY');
    console.log('   Refresh browser (Ctrl+Shift+R) to see changes\n');

    // Show what's left
    const remaining = await Attendance.countDocuments();
    console.log(`📈 Remaining records in database: ${remaining}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteAllToday();
