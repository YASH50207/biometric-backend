#!/usr/bin/env node

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const seedData = require('./seed');

async function runSeed() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    console.log('URI:', process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB Connected!');
    console.log('\n📊 Starting seed...\n');

    await seedData();

    console.log('\n✅ Seeding complete!');
    console.log('\n🎯 Next steps:');
    console.log('   1. npm run dev (to start the backend)');
    console.log('   2. cd ../frontend && npm run dev (to start the frontend)');
    console.log('   3. Open http://localhost:5173 in your browser');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error during seeding:');
    console.error(error);
    process.exit(1);
  }
}

runSeed();
