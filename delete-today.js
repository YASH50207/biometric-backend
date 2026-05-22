#!/usr/bin/env node

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Attendance = require('./models/Attendance');

dotenv.config();

async function deleteToday() {
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

    console.log('\n🗑️  Deleting today\'s attendance records...');
    console.log(`   Date range: ${today.toLocaleDateString()} to ${tomorrow.toLocaleDateString()}`);

    const result = await Attendance.deleteMany({
      date: { $gte: today, $lt: tomorrow }
    });

    console.log(`✅ Deleted ${result.deletedCount} attendance records from today`);
    console.log('\n📊 Today\'s Live Scans will now be EMPTY');
    console.log('   New scans will appear as students scan their fingerprints\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteToday();
