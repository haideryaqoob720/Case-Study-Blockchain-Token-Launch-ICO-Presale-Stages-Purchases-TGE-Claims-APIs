const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectToMongo = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await fixUserWalletIndex();
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const fixUserWalletIndex = async () => {
  console.log('\nStarting UserWallet index fix...');

  try {
    // Get the database instance
    const db = mongoose.connection.db;

    // List all indexes on the userwallets collection
    const indexes = await db.collection('userwallets').indexes();
    console.log('Current indexes on userwallets collection:');
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, index.key);
    });

    // Check if there's a userId index
    const userIdIndex = indexes.find(index => index.key && index.key.userId === 1);

    if (userIdIndex) {
      console.log(`\nFound problematic userId index: ${userIdIndex.name}`);
      console.log('Removing userId index...');

      try {
        await db.collection('userwallets').dropIndex(userIdIndex.name);
        console.log('✅ Successfully removed userId index');
      } catch (err) {
        console.error('❌ Error removing userId index:', err.message);
      }
    } else {
      console.log('\n✅ No userId index found, no action needed');
    }

    // Also check if there are any documents with userId field and remove it
    const documentsWithUserId = await db
      .collection('userwallets')
      .find({
        userId: { $exists: true }
      })
      .toArray();

    if (documentsWithUserId.length > 0) {
      console.log(`\nFound ${documentsWithUserId.length} documents with userId field`);
      console.log('Removing userId field from all documents...');

      try {
        await db.collection('userwallets').updateMany({ userId: { $exists: true } }, { $unset: { userId: '' } });
        console.log('✅ Successfully removed userId field from all documents');
      } catch (err) {
        console.error('❌ Error removing userId field:', err.message);
      }
    } else {
      console.log('\n✅ No documents with userId field found');
    }

    // List indexes again to confirm
    const updatedIndexes = await db.collection('userwallets').indexes();
    console.log('\nUpdated indexes on userwallets collection:');
    updatedIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, index.key);
    });
  } catch (err) {
    console.error('❌ Error fixing UserWallet index:', err.message);
  }

  console.log('\n✅ UserWallet index fix complete.');
};

connectToMongo();
