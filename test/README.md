# Test Directory

This directory contains test scripts and utilities for the Equus Website API.

## Available Tests

### Analytics Tests

- `test-analytics.js` - Real-time analytics monitoring script

  - Monitors database for new analytics entries
  - Helps verify that duplicate tracking has been resolved
  - Usage: `node test/test-analytics.js`

- `analytics-stats.js` - Analytics database statistics

  - Shows total entries, method breakdown, top paths, recent entries
  - Usage: `node test/analytics-stats.js`

- `clean-analytics.js` - Database cleanup utility
  - ⚠️ **WARNING**: Deletes all analytics data!
  - Usage: `node test/clean-analytics.js`

## Running Tests

Make sure MongoDB is running and the API server is started before running any tests.

```bash
# Start the analytics monitor (recommended for testing duplicate fix)
node test/test-analytics.js

# View analytics statistics
node test/analytics-stats.js

# Clean analytics database (use with caution!)
node test/clean-analytics.js

# Run from API root directory
cd /path/to/equus-website-api
node test/test-analytics.js
```

## Test Database

Tests use the same database as the development environment:

- Database: `equus-systems`
- Connection: `mongodb://localhost:27017/equus-systems`

## Testing Duplicate Fix

To verify the analytics duplicate fix is working:

1. Start the analytics monitor: `node test/test-analytics.js`
2. Open your website in a browser
3. Refresh a page several times
4. Monitor should show only **1 entry per refresh** (not 2)
5. Look for `[CLIENT]` entries from usePageMonitor hook

## Adding New Tests

When adding new test files:

1. Place them in this `/test` directory
2. Use descriptive names starting with `test-`
3. Update this README with usage instructions
4. Include error handling and graceful shutdown
