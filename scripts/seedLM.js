import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LMNumber from '../Models/LMNumber.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ MONGO_URI is not defined in .env");
    process.exit(1);
}

// --- EDIT THESE VALUES TO MANUALLY ADD NUMBERS ---
const NEW_LM_NUMBERS = [
    { number: 'OWNER001', role: 'owner' },
    { number: 'ADMIN001', role: 'admin' },
    { number: 'USER001', role: 'user' },
    { number: 'USER002', role: 'user' }
];
// -------------------------------------------------

const seedLMNumbers = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        let insertedCount = 0;
        let skippedCount = 0;

        for (const item of NEW_LM_NUMBERS) {
            const existing = await LMNumber.findOne({ number: item.number });
            if (existing) {
                console.log(`⚠️  Skipped ${item.number} (Already exists)`);
                skippedCount++;
            } else {
                await LMNumber.create({
                    number: item.number,
                    role: item.role,
                    isUsed: false
                });
                console.log(`✅ Added ${item.number} [${item.role}]`);
                insertedCount++;
            }
        }

        console.log(`\n🎉 Process Complete. Inserted: ${insertedCount}, Skipped: ${skippedCount}`);
        process.exit();

    } catch (error) {
        console.error('❌ Error Seeding LM Numbers:', error.message);
        process.exit(1);
    }
};

seedLMNumbers();
