const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function checkBuckets() {
  try {
    const buckets = await AsyncStorage.getItem('@instalog/buckets');
    console.log('Buckets in storage:', buckets);
    if (buckets) {
      console.log('Parsed:', JSON.parse(buckets));
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

checkBuckets();
