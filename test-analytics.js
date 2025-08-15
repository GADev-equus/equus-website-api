const mongoose = require('mongoose');
const Analytics = require('./models/Analytics');

console.log('🚀 Starting analytics monitor...');

// Connect to MongoDB
mongoose
  .connect('mongodb://localhost:27017/equus-systems')
  .then(async () => {
    console.log('🔗 Connected to MongoDB');

    // Get current count
    const count = await Analytics.countDocuments();
    console.log(`📊 Current analytics entries: ${count}`);
    console.log('🔍 Now refresh a page in your browser to test...\n');

    let lastCount = count;

    const checkForNewEntries = async () => {
      try {
        const currentCount = await Analytics.countDocuments();

        if (currentCount > lastCount) {
          const newEntries = currentCount - lastCount;
          console.log(
            `📈 NEW ENTRIES DETECTED: +${newEntries} (Total: ${currentCount})`,
          );

          // Get the latest entries
          const latest = await Analytics.find({})
            .sort({ timestamp: -1 })
            .limit(newEntries)
            .lean();

          latest.reverse().forEach((entry) => {
            const time = entry.timestamp.toISOString().slice(11, 19);
            const source = entry.clientTracked ? '[CLIENT]' : '[SERVER]';
            console.log(`  ${time} | ${entry.method} ${entry.path} ${source}`);
          });
          console.log('');

          lastCount = currentCount;
        }
      } catch (error) {
        console.error('❌ Monitor error:', error.message);
      }
    };

    // Check every 1 second
    setInterval(checkForNewEntries, 1000);
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
