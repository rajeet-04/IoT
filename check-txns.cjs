const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://rajeet:xnj3uey821@iot.qpzuwfh.mongodb.net/?appName=iot';

const client = new MongoClient(MONGODB_URI);

(async () => {
  try {
    await client.connect();
    const db = client.db();
    const txns = await db.collection('transactions').find().sort({ timestamp: -1 }).limit(15).toArray();
    console.log('=== Recent Transactions ===');
    txns.forEach(t => {
      console.log('\nID:', t._id);
      console.log('  Action:', t.action);
      console.log('  walletAddress:', t.walletAddress);
      console.log('  txHash:', t.txHash);
      console.log('  status:', t.status);
      console.log('  timestamp:', t.timestamp);
    });
  } finally {
    await client.close();
  }
})();
