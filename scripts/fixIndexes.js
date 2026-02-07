import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

const fixIndexes = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('users');

        // List indexes
        const indexes = await collection.indexes();
        console.log('Existing Indexes:', indexes.map(i => i.name));

        // Drop 'phone_1' if it exists
        if (indexes.find(i => i.name === 'phone_1')) {
            await collection.dropIndex('phone_1');
            console.log('✅ Dropped stale index: phone_1');
        }

        // Drop 'empId_1' if it exists (Another stale index)
        if (indexes.find(i => i.name === 'empId_1')) {
            await collection.dropIndex('empId_1');
            console.log('✅ Dropped stale index: empId_1');
        } else {
            console.log('ℹ️ Index phone_1 not found (already clean)');
        }

        console.log('🎉 Index fix complete');
        process.exit();

    } catch (error) {
        console.error('❌ Error fixing indexes:', error.message);
        process.exit(1);
    }
};

fixIndexes();
