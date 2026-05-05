const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const COLLECTION_TO_KEEP = 'customers';

const connectToMongo = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await resetDatabase();
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const resetDatabase = async () => {
  console.log('\nStarting database reset...');
  console.warn(`⚠️ WARNING: This will delete all collections except "${COLLECTION_TO_KEEP}"!\n`);

  try {
    // Get all existing collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const existingCollectionNames = collections.map(col => col.name);

    console.log(`Found ${existingCollectionNames.length} collections in database:`, existingCollectionNames);
    console.log();

    for (const name of existingCollectionNames) {
      if (name === COLLECTION_TO_KEEP) {
        console.log(`ℹ️ Collection "${name}" is being kept, skipping...`);
        continue;
      }
      try {
        await mongoose.connection.db.collection(name).drop();
        console.log(`✅ Dropped "${name}" collection.`);
      } catch (err) {
        console.error(`❌ Error dropping "${name}":`, err.message);
      }
    }
  } catch (err) {
    console.error('❌ Error listing collections:', err.message);
  }

  console.log('\n✅ Database reset complete.');
};

connectToMongo();
