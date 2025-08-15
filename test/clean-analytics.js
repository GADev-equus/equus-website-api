const mongoose = require('mongoose');
const Analytics = require('../models/Analytics');

console.log('🧹 Analytics Database Cleaner');
console.log('⚠️  WARNING: This will delete analytics data!');

// Connect to MongoDB
mongoose
  .connect('mongodb://localhost:27017/equus-systems')
  .then(async () => {
    console.log('🔗 Connected to MongoDB');

    // Get current count
    const count = await Analytics.countDocuments();
    console.log(`📊 Current analytics entries: ${count}`);

    if (count === 0) {
      console.log('✅ Database is already clean!');
      process.exit(0);
    }

    // Prompt for confirmation (in a real environment you'd use readline)
    console.log('🚨 Press Ctrl+C to cancel, or wait 5 seconds to proceed...');

    setTimeout(async () => {
      try {
        await Analytics.deleteMany({});
        console.log('🗑️  All analytics entries deleted!');
        console.log('✅ Database cleaned successfully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error cleaning database:', error.message);
        process.exit(1);
      }
    }, 5000);
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n❌ Cleanup cancelled by user');
  mongoose.connection.close();
  process.exit(0);
});
