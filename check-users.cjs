const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://rajeet:xnj3uey821@iot.qpzuwfh.mongodb.net/?appName=iot';

const client = new MongoClient(MONGODB_URI);

(async () => {
  try {
    await client.connect();
    const db = client.db();
    const users = await db.collection('users').find().toArray();
    console.log('=== Users in database ===');
    users.forEach(u => {
      console.log('\nID:', u._id);
      console.log('  Email:', u.email);
      console.log('  walletAddress:', u.walletAddress);
      console.log('  createdAt:', u.createdAt);
    });
  } finally {
    await client.close();
  }
})();
