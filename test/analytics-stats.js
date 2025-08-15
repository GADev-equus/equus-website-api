const mongoose = require('mongoose');
const Analytics = require('../models/Analytics');

console.log('📊 Analytics Database Stats');

// Connect to MongoDB
mongoose
  .connect('mongodb://localhost:27017/equus-systems')
  .then(async () => {
    console.log('🔗 Connected to MongoDB');
    console.log('');

    try {
      // Basic stats
      const totalEntries = await Analytics.countDocuments();
      const clientTracked = await Analytics.countDocuments({
        clientTracked: true,
      });
      const serverTracked = totalEntries - clientTracked;

      console.log('📈 BASIC STATS');
      console.log(`Total entries: ${totalEntries}`);
      console.log(`Client tracked: ${clientTracked}`);
      console.log(`Server tracked: ${serverTracked}`);
      console.log('');

      // Method breakdown
      const methodStats = await Analytics.aggregate([
        { $group: { _id: '$method', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      console.log('🔍 METHOD BREAKDOWN');
      methodStats.forEach((stat) => {
        console.log(`${stat._id}: ${stat.count}`);
      });
      console.log('');

      // Top paths
      const topPaths = await Analytics.aggregate([
        { $group: { _id: '$path', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      console.log('🏆 TOP 10 PATHS');
      topPaths.forEach((path, index) => {
        console.log(`${index + 1}. ${path._id}: ${path.count} views`);
      });
      console.log('');

      // Recent entries
      const recent = await Analytics.find({})
        .sort({ timestamp: -1 })
        .limit(5)
        .lean();

      console.log('🕒 RECENT ENTRIES');
      recent.forEach((entry) => {
        const time = entry.timestamp
          .toISOString()
          .slice(0, 19)
          .replace('T', ' ');
        const source = entry.clientTracked ? '[CLIENT]' : '[SERVER]';
        console.log(`${time} | ${entry.method} ${entry.path} ${source}`);
      });

      process.exit(0);
    } catch (error) {
      console.error('❌ Error getting stats:', error.message);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
