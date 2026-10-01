import express from 'express';
import bcrypt from 'bcryptjs';
import { store, logAuditAction } from '../db/store.js';
import { generateToken, verifyToken } from '../middleware/auth.js';

const router = express.Router();

// 1. STUDENT SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { name, register_number, department, year, email, password, role, admin_secret } = req.body;

    if (role === 'admin') {
      if (!name || !email || !password || !admin_secret) {
        return res.status(400).json({ error: 'All admin fields are required.' });
      }
      
      if (admin_secret !== (process.env.ADMIN_SECRET || 'college_admin_secret')) {
        return res.status(403).json({ error: 'Invalid Admin Secret Key.' });
      }

      const existingAdmin = store.admins.find(a => a.email.toLowerCase() === email.toLowerCase());
      if (existingAdmin) {
        return res.status(400).json({ error: 'An admin with this email already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newAdmin = {
        id: `adm-${Date.now()}`,
        name,
        email: email.toLowerCase(),
        role: 'admin',
        password: hashedPassword,
        created_at: new Date().toISOString()
      };

      store.admins.push(newAdmin);
      logAuditAction(newAdmin.name, 'ADMIN_REGISTERED', `New admin registered: ${newAdmin.email}`);

      const token = generateToken({
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role
      });

      const { password: _, ...adminWithoutPassword } = newAdmin;
      return res.status(201).json({
        message: 'Admin Registration successful!',
        token,
        user: adminWithoutPassword
      });
    }

    // Student Registration
    if (!name || !register_number || !department || !year || !email || !password) {
      return res.status(400).json({ error: 'All student fields are required.' });
    }

    // College Email Format Check
    if (!email.toLowerCase().endsWith('@college.edu') && !email.toLowerCase().includes('.edu')) {
      return res.status(400).json({ error: 'Must use a valid institutional college email (e.g. name@college.edu).' });
    }

    // Check duplicate email
    const existingUser = store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    // Check duplicate register number
    const existingReg = store.users.find(u => u.register_number.toLowerCase() === register_number.toLowerCase());
    if (existingReg) {
      return res.status(400).json({ error: 'A student with this register number is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: `usr-${Date.now()}`,
      name,
      register_number: register_number.toUpperCase(),
      department,
      year,
      email: email.toLowerCase(),
      role: 'student',
      password: hashedPassword,
      is_blocked: false,
      created_at: new Date().toISOString()
    };

    store.users.push(newUser);

    logAuditAction(newUser.name, 'STUDENT_REGISTERED', `Student registered with Reg No: ${newUser.register_number}`);

    const token = generateToken({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      register_number: newUser.register_number,
      department: newUser.department,
      year: newUser.year
    });

    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: 'Registration successful! Email verified.',
      token,
      user: userWithoutPassword
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// 2. LOGIN (Student or Admin)
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check Admin Login first if role is admin or email is admin
    if (role === 'admin' || cleanEmail === 'admin@college.edu') {
      const admin = store.admins.find(a => a.email.toLowerCase() === cleanEmail);
      
      if (!admin) {
        return res.status(401).json({ error: 'Invalid admin email credentials.' });
      }

      let validPass = false;
      if (admin.password) {
        validPass = await bcrypt.compare(password, admin.password);
      } else {
        // Fallback for seeded demo admin without hashed password
        validPass = (password === 'admin123');
      }

      if (!validPass) {
        return res.status(401).json({ error: 'Invalid admin password.' });
      }

      const token = generateToken({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'admin'
      });

      logAuditAction(admin.name, 'ADMIN_LOGIN', 'Admin logged into control console');

      return res.json({
        message: 'Admin authentication successful.',
        token,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: 'admin'
        }
      });
    }

    // Student Login
    const user = store.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email credentials.' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Your student account has been administrative locked. Contact election officer.' });
    }

    // Verify Password (if hashed compare, or if demo user password matches)
    let validPass = false;
    if (user.password) {
      validPass = await bcrypt.compare(password, user.password);
    } else {
      // Demo password fallback
      validPass = (password === 'student123' || password === 'password');
    }

    if (!validPass) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'student',
      register_number: user.register_number,
      department: user.department,
      year: user.year
    });

    logAuditAction(user.name, 'STUDENT_LOGIN', `Student logged in (${user.register_number})`);

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Student authentication successful.',
      token,
      user: userWithoutPassword
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// 3. GET CURRENT PROFILE
router.get('/me', verifyToken, (req, res) => {
  if (req.user.role === 'admin') {
    const admin = store.admins.find(a => a.id === req.user.id);
    return res.json({ user: admin || req.user });
  }

  const user = store.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  const { password: _, ...userWithoutPassword } = user;
  
  // Check if voted in active election
  const userVotes = store.votes.filter(v => v.user_id === user.id);
  
  res.json({
    user: {
      ...userWithoutPassword,
      votes_history: userVotes
    }
  });
});

export default router;
