import User from '../Models/User.js';
import LMNumber from '../Models/LMNumber.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Generate JWT Helper
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

/*
    @desc Register a new user
    @route POST /api/users/register
    @access Public
*/
export const register = async (req, res) => {
  const { name, email, phoneno, password, lm_number, secretKey } = req.body;

  try {
    // 1. Check if user already exists (email or phone)
    const userExists = await User.findOne({ 
      $or: [{ email }, { phoneno }] 
    });

    if (userExists) {
      return res.status(400).json({ message: 'User with this email or phone number already exists' });
    }

    let role = 'user';

    // 2. Owner Registration Logic
    // 2. Strict LM Logic - Everyone (Owner/Admin/User) needs an LM Number
    if (!lm_number) {
        return res.status(400).json({ message: 'LM Number is required for registration' });
    }

    const validLM = await LMNumber.findOne({ number: lm_number });

    if (!validLM) {
        return res.status(400).json({ message: 'Invalid Lifetime Membership Number' });
    }

    if (validLM.isUsed) {
        return res.status(400).json({ message: 'This LM Number has already been used' });
    }

    // Auto-assign role based on LM Number (Strict)
    role = validLM.role;

    // Mark LM as used (will save after user creation to be safe, or transaction)
    // For simplicity, we just mark it used here if user creation succeeds

    // 4. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Create User
    const user = await User.create({
      name,
      email,
      phoneno,
      password: hashedPassword,
      lm_number, // Allow LM number for everyone, including owners
      role
    });

    if (user) {
      // Mark LM as used if applicable
      if (role !== 'owner' && lm_number) {
          await LMNumber.findOneAndUpdate({ number: lm_number }, { isUsed: true, usedBy: user._id });
      }

      res.status(201).json({
        message: "Registration successful. Please login to continue."
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

/*
    @desc Login user
    @route POST /api/users/login
    @access Public
*/
export const login = async (req, res) => {
  const { identifier, password, location } = req.body;

  try {
    // Identifier can be phoneno or lm_number
    // We check both fields
    const user = await User.findOne({
      $or: [{ phoneno: identifier }, { lm_number: identifier }]
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Update location if provided
      if (location) {
          user.lastLoginLocation = typeof location === 'object' ? JSON.stringify(location) : location;
          await user.save();
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid email/LM number or password' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};



/*
    @desc Get all users
    @route GET /api/users/all
    @access Private (Owner Only)
*/
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}
