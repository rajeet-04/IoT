import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

await mongoose.connect('mongodb+srv://rajeet:xnj3uey821@iot.qpzuwfh.mongodb.net/?appName=iot', { serverApi: { version: '1' } });

const newHash = await bcrypt.hash('Meek2004', 10);
console.log('New hash:', newHash);

await mongoose.connection.db.collection('users').updateOne(
    { email: 'rajeetash@hotmail.com' },
    { $set: { passwordHash: newHash } }
);
console.log('Password updated');

await mongoose.disconnect();