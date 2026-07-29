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
  const { name, email, phone_no, city, lm_number, pbo_number, date_of_birth, emp_id } = req.body;

  // Validate all fields are provided
  if (!name || !email || !phone_no || !city || !lm_number || !pbo_number || !date_of_birth || !emp_id) {
    return res.status(400).json({ message: 'All fields are required to register' });
  }

  // Validate Email contains '@'
  if (!email.includes('@')) {
    return res.status(400).json({ message: 'Please provide a valid email address containing @' });
  }

  // Validate Phone Number is exactly 10 digits
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phone_no)) {
    return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
  }

  try {
    const userExists = await User.findOne({ $or: [{ email }, { phone_no }] });

    if (userExists) {
      return res.status(400).json({ message: 'User with this email or phone number already exists' });
    }

    let role = 'user';

    // const validLM = await LMNumber.findOne({ number: lm_number });
    // if (!validLM) {
    //     return res.status(400).json({ message: 'Invalid Lifetime Membership Number' });
    // }

    // if (validLM.isUsed) {
    //     return res.status(400).json({ message: 'This LM Number has already been used' });
    // }

    // role = validLM.role;

    // Generate password based on name and DOB
    const plainPassword = generatePassword(name, date_of_birth);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    // Create User
    const user = await User.create({
      name,
      email,
      phone_no,
      city,
      password: hashedPassword,
      lm_number,
      role,
      pbo_number,
      date_of_birth,
      emp_id
    });

    if (user) {
      // Mark LM as used if applicable
      if (role !== 'owner') {
          await LMNumber.findOneAndUpdate({ number: lm_number }, { isUsed: true, usedBy: user._id });
      }

      // Send Email with password
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Welcome! Your Account Registration Details',
        text: `Hello ${name},\n\nYou have successfully registered.\n\nYour login details are:\nUser ID: ${emp_id} OR ${pbo_number}\nPassword: ${plainPassword}\n\nPlease keep this password safe.\n\nBest Regards,\nTNEB Admin`
      };

      // Dispatch email in background so it doesn't delay the response
      sendEmailBackground(mailOptions);

      res.status(201).json({
        message: "Registration successful. Your password has been sent to your email."
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
  const { identifier, password } = req.body;

  try {
    // Identifier can be emp_id or pbo_number
    const user = await User.findOne({
      $or: [{ emp_id: identifier }, { pbo_number: identifier }]
    });

    if (user && (await bcrypt.compare(password, user.password))) {

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid Employee ID / PBO Number or password' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

/*
    @desc Admin Login user
    @route POST /api/users/admin-login
    @access Public
*/
export const adminLogin = async (req, res) => {
  const { identifier, password } = req.body;

  try {
    // Identifier can be name or phone_no
    const user = await User.findOne({
      $or: [{ name: identifier }, { phone_no: identifier }]
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Check if they have admin privileges (optional but good practice)
      if (user.role !== 'admin' && user.role !== 'owner') {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid Name / Phone Number or password' });
    }
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

/*
    @desc Forgot Password
    @route POST /api/users/forgot-password
    @access Public
*/
export const forgotPassword = async (req, res) => {
  const { email, emp_id, pbo_number, lm_number } = req.body;

  if (!email || !emp_id || !pbo_number || !lm_number) {
    return res.status(400).json({ message: 'All fields are required to verify identity' });
  }

  try {
    const user = await User.findOne({
      email,
      emp_id,
      pbo_number,
      lm_number
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found with the provided details' });
    }

    // Generate new password
    const newPassword = generatePassword(user.name, user.date_of_birth);
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Send email with new password
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Password Reset Successful',
      text: `Hello ${user.name},\n\nYour password has been successfully reset.\n\nYour new login details are:\nUser ID: ${user.emp_id} OR ${user.pbo_number}\nNew Password: ${newPassword}\n\nPlease keep this password safe.\n\nBest Regards,\nTNEB Admin`
    };

    // Dispatch email in background so it doesn't delay the response
    sendEmailBackground(mailOptions);

    res.json({ message: 'A new password has been sent to your registered email address.' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
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
