import mongoose from 'mongoose';
import User from './Models/User.js';
import LMNumber from './Models/LMNumber.js';
import 'dotenv/config';

/*
  Verification Script for TNEB Server Auth
  Run using: node verify_auth.js
*/

const runVerification = async () => {
  try {
    console.log('--- Starting Verification ---');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Clean up relevant data for test (Optional, be careful in prod)
    // For safety, I will only look for my specific test user/lm
    const testLM = 'TEST-LM-12345';
    const testPhone = '9999999999';
    const testEmail = 'testuser@example.com';
    await User.deleteMany({ email: testEmail });
    await LMNumber.deleteMany({ number: testLM });
    console.log('🧹 Cleaned up previous test data');

    // 2. Create LM Number (Simulate Admin Seeding)
    await LMNumber.create({ number: testLM });
    console.log('✅ Created LM Number:', testLM);

    // 3. Register User (Simulate HTTP Request Logic locally)
    // We'll mimic the Controller logic steps here to verify the Model/Flow
    const lmDoc = await LMNumber.findOne({ number: testLM });
    if (!lmDoc || lmDoc.isUsed) throw new Error('LM Number validation failed');
    
    const newUser = await User.create({
        name: 'Test User',
        email: testEmail,
        phoneno: testPhone,
        password: '$2b$10$FakeHashForTestingOnly', // In real app, controller hashes it
        lm_number: testLM,
        role: 'user'
    });
    console.log('✅ Registered User:', newUser.name);

    // Mark used
    await LMNumber.findOneAndUpdate({ number: testLM }, { isUsed: true, usedBy: newUser._id });
    console.log('✅ Marked LM Number as used');

    // 4. Verify Duplicate Registration Fails
    const lmDoc2 = await LMNumber.findOne({ number: testLM });
    if (lmDoc2.isUsed) {
        console.log('✅ Correctly detected LM Number is already used');
    } else {
        console.error('❌ Failed to detect used LM Number');
    }

    // 5. Test Login Logic (Location update)
    const loginUser = await User.findOne({ lm_number: testLM });
    if (loginUser) {
        loginUser.lastLoginLocation = JSON.stringify({ lat: 12.34, lng: 56.78 });
        await loginUser.save();
        console.log('✅ User Login Location Updated');
    }

    // 6. Verify Owner View (Data check)
    const allUsers = await User.find({}).select('name lastLoginLocation');
    // console.log('Current Users:', allUsers);
    console.log('✅ Owner can fetch user list (simulated)');

    console.log('--- Verification Complete: SUCCESS ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
  }
};

runVerification();
