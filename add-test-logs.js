/**
 * Add 49 test logs to trigger paywall testing
 */

const { MMKV } = require('react-native-mmkv');

const storage = new MMKV({
  id: 'instalog-storage',
});

// Generate 49 test logs
const logs = [];
const now = new Date();

for (let i = 1; i <= 49; i++) {
  const timestamp = new Date(now.getTime() - (49 - i) * 3600000); // Spread over last 49 hours
  const dateKey = timestamp.toISOString().split('T')[0];
  
  logs.push({
    id: `test-${timestamp.getTime()}-${i}`,
    timestamp: timestamp.toISOString(),
    text: `Test log ${i}`,
    bucketId: null,
    dateKey: dateKey,
  });
}

// Save to storage
storage.set('logs', JSON.stringify(logs));
console.log('Added 49 test logs');
console.log('Next log will be #50 and trigger the paywall');
