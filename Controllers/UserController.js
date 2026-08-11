import User from '../Models/User.js';
import LMNumber from '../Models/LMNumber.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

// Generate JWT Helper
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Generate password based on pattern: TN + Name(2) + DOB Day(2)
const generatePassword = (name, date_of_birth) => {
  const namePart = name ? name.substring(0, 2).toUpperCase() : 'XX';
  
  let dayPart = '00';
  if (date_of_birth) {
    const dobDate = new Date(date_of_birth);
    if (!isNaN(dobDate.getTime())) {
      const day = dobDate.getDate();
      dayPart = day < 10 ? '0' + day : day.toString();
    } else if (typeof date_of_birth === 'string' && date_of_birth.length >= 2) {
      dayPart = date_of_birth.slice(-2);
    }
  }

  return `TN${namePart}${dayPart}`;
};

// Nodemailer setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
}});

// Async background email sender
const sendEmailBackground = async (mailOptions) => {
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
  } catch (error) {
    console.error("Error sending email in background: ", error);
  }
};

/*
    @desc Register a new user
    @route POST /api/users/register
    @access Public
*/
export const register = async (req, res) => {
  const {
    name,
    email,
    phone_no,
    city,
    lm_number,
    pbo_number,
    date_of_birth,
    emp_id,
    password,
    confirmPassword
  } = req.body;

  // Required fields
  if (!name || !email || !phone_no || !password || !confirmPassword) {
    return res.status(400).json({
      message: 'Name, email, phone number, and password are required'
    });
  }

  // Normalize
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone_no.trim();

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      message: 'Please provide a valid email address'
    });
  }

  // Phone validation
  if (!/^\d{10}$/.test(normalizedPhone)) {
    return res.status(400).json({
      message: 'Phone number must be exactly 10 digits'
    });
  }

  // Password validation
  if (password !== confirmPassword) {
    return res.status(400).json({
      message: 'Passwords do not match'
    });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // User data
    const userData = {
      name: name.trim(),
      email: normalizedEmail,
      phone_no: normalizedPhone,
      password: hashedPassword,
      role: 'user'
    };

    if (city) userData.city = city;
    if (lm_number) userData.lm_number = lm_number;
    if (pbo_number) userData.pbo_number = pbo_number;
    if (date_of_birth) userData.date_of_birth = date_of_birth;
    if (emp_id) userData.emp_id = emp_id;

    // Create user
    await User.create(userData);

    return res.status(201).json({
      message: 'Registration successful.'
    });

  } catch (error) {

    // Duplicate key
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];

      if (field === 'email') {
        return res.status(409).json({
          message: 'Email already exists'
        });
      }

      if (field === 'phone_no') {
        return res.status(409).json({
          message: 'Phone number already exists'
        });
      }

      if (field === 'lm_number') {
        return res.status(409).json({
          message: 'LM number already exists'
        });
      }

      return res.status(409).json({
        message: 'Duplicate data already exists'
      });
    }

    console.error('Register Error:', error);

    return res.status(500).json({
      message: 'Server Error'
    });
  }
};
/*
    @desc Register a treasurer
    @route POST /api/users/register-treasurer
    @access Public or Admin
*/
export const registerTreasurer = async (req, res) => {
  const { name, email, phone_no, role, password } = req.body;

  if (!name || !email || !phone_no || !role || !password) {
    return res.status(400).json({ message: 'Name, Email, Phone Number, Role, and Password are required' });
  }

  try {
    const userExists = await User.findOne({ $or: [{ email }, { phone_no }] });

    if (userExists) {
      return res.status(400).json({ message: 'User with this Email or Phone Number already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      phone_no,
      password: hashedPassword,
      role: role
    });

    if (user) {
      res.status(201).json({
        message: "Treasurer registration successful.",
        _id: user._id,
        name: user.name,
        email: user.email,
        phone_no: user.phone_no,
        role: user.role
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register Treasurer Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

/*
    @desc Login user
    @route POST /api/users/login
    @access Public
*/
export const login = async (req, res) => {
  const { identifier, password } = req.body;

  // Basic validation
  if (!identifier || !password) {
    return res.status(400).json({
      message: 'Email/Phone number and password are required'
    });
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();

  try {
    // Find user using indexed email or phone number
    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { phone_no: identifier.trim() }
      ]
    }).lean();

    if (!user) {
      return res.status(401).json({
        message: 'Invalid Email / Phone Number or password'
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid Email / Phone Number or password'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    });

  } catch (error) {
    console.error('Login Error:', error);

    return res.status(500).json({
      message: 'Server Error'
    });
  }
};

/*
    @desc Admin Login user
    @route POST /api/users/admin-login
    @access Public
*/
export const adminLogin = async (req, res) => {
  const { identifier, password } = req.body;

  // 1. Validate required fields
  if (!identifier || !password) {
    return res.status(400).json({
      message: 'Name, email/phone number, and password are required'
    });
  }

  // 2. Normalize input
  const normalizedIdentifier = identifier.trim();
  const normalizedEmail = normalizedIdentifier.toLowerCase();

  try {
    // 3. Find admin/owner
    const user = await User.findOne({
      $or: [
        { name: normalizedIdentifier },
        { email: normalizedEmail },
        { phone_no: normalizedIdentifier }
      ]
    })
      .select('_id name email role password')
      .lean();

    // 4. User not found
    if (!user) {
      return res.status(401).json({
        message: 'Invalid Name / Email / Phone Number or password'
      });
    }

    // 5. Check admin privileges
    if (user.role !== 'admin' && user.role !== 'owner') {
      return res.status(403).json({
        message: 'Access denied. Admins only.'
      });
    }

    // 6. Check password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid Name / Email / Phone Number or password'
      });
    }

    // 7. Generate token
    const token = generateToken(user._id, user.role);

    // 8. Response
    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    });

  } catch (error) {
    console.error('Admin Login Error:', error);

    return res.status(500).json({
      message: 'Server Error'
    });
  }
};

/*
    @desc Forgot Password
    @route POST /api/users/forgot-password
    @access Public
*/
export const forgotPassword = async (req, res) => {
  const { identifier, password, confirmPassword } = req.body;

  // 1. Validate required fields
  if (!identifier || !password || !confirmPassword) {
    return res.status(400).json({
      message:
        'Identifier (Email or Phone Number), password, and confirm password are required'
    });
  }

  // 2. Validate passwords
  if (password !== confirmPassword) {
    return res.status(400).json({
      message: 'Passwords do not match'
    });
  }

  // 3. Normalize identifier
  const normalizedIdentifier = identifier.trim().toLowerCase();

  try {
    // 4. Find user
    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { phone_no: identifier.trim() }
      ]
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found with the provided email or phone number'
      });
    }

    // 5. Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6. Update password
    user.password = hashedPassword;

    // 7. Save user
    await user.save();

    return res.status(200).json({
      message: 'Password has been successfully updated.'
    });

  } catch (error) {
    console.error('Forgot Password Error:', error);

    return res.status(500).json({
      message: 'Server Error'
    });
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
};

/*
    @desc Get user by ID
    @route GET /api/users/:id
    @access Private
*/
export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/*
    @desc Update user details
    @route PUT /api/users/:id
    @access Private (Owner/Admin or self)
*/
export const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.phone_no = req.body.phone_no || user.phone_no;
            user.date_of_birth = req.body.date_of_birth || user.date_of_birth;
            
            // Password update logic if provided
            if (req.body.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(req.body.password, salt);
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone_no: updatedUser.phone_no
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

/*
    @desc Delete a user by phone number
    @route DELETE /api/users/:id (where id is the phone number)
    @access Private (Owner/Admin only)
*/
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findOne({ phone_no: req.params.id });
        
        if (user) {
            await User.deleteOne({ _id: user._id });
            res.json({ message: 'User removed successfully' });
        } else {
            res.status(404).json({ message: 'User not found with this phone number' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
