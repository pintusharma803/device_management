const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const { sendOtpEmail } = require('../services/emailService');

// Helper to generate 6-digit OTP
function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper to generate Unique Device ID if needed
function generateUniqueDeviceId() {
  const prefix = 'TB-DEV';
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${rand}`;
}

// ==========================================
// 1. AUTHENTICATION & ACCESS (CUSTOMER PANEL)
// ==========================================

// POST /api/auth/login (Customer Login)
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
        message: 'Email and password are required.'
      });
    }

    const userResult = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
        message: 'Invalid email or password.'
      });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
        message: 'Invalid email or password.'
      });
    }

    // Check if account is verified (for customer role)
    if (user.role === 'CUSTOMER' && (user.is_verified === false || user.is_verified === 0)) {
      const otpCode = generateOtpCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await query(
        'INSERT INTO otps (id, email, otp_code, purpose, expired_at, is_used) VALUES ($1, $2, $3, $4, $5, $6)',
        [uuidv4(), user.email, otpCode, 'REGISTRATION', expiresAt, false]
      );
      await sendOtpEmail({ to: user.email, name: user.name, otpCode, purpose: 'REGISTRATION' });

      return res.status(400).json({
        success: false,
        requiresVerification: true,
        devOtp: otpCode,
        error: 'Your account is not verified. A verification code has been dispatched to your email.',
        message: 'Your account is not verified. A verification code has been dispatched to your email.'
      });
    }

    // Check 2FA
    if (user.two_factor_enabled === true || user.two_factor_enabled === 1) {
      const otpCode = generateOtpCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await query(
        'INSERT INTO otps (id, email, otp_code, purpose, expired_at, is_used) VALUES ($1, $2, $3, $4, $5, $6)',
        [uuidv4(), user.email, otpCode, 'LOGIN_2FA', expiresAt, false]
      );
      await sendOtpEmail({ to: user.email, name: user.name, otpCode, purpose: 'LOGIN_2FA' });

      return res.json({
        success: true,
        requires2FA: true,
        devOtp: otpCode,
        message: 'Two-factor authentication code sent to your email.'
      });
    }

    // Generate JWT
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      customer_id: user.customer_id,
      customerId: user.customer_id
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // Fetch customer details if linked
    let customerData = null;
    if (user.customer_id) {
      const custRes = await query('SELECT * FROM customers WHERE id = $1', [user.customer_id]);
      if (custRes.rows.length > 0) customerData = custRes.rows[0];
    }

    // Log activity
    await query(
      'INSERT INTO activity_logs (id, user_id, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), user.id, 'CUSTOMER_LOGIN', `Customer login by ${user.email}`, req.ip || '127.0.0.1']
    );

    return res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        customerId: user.customer_id,
        phone: customerData ? customerData.phone : null,
        company: customerData ? customerData.company : null,
        avatar_url: customerData ? customerData.avatar_url : null,
        two_factor_enabled: Boolean(user.two_factor_enabled),
        is_verified: Boolean(user.is_verified),
        customer: customerData
      }
    });
  } catch (error) {
    console.error('Customer login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during login.',
      message: 'Internal server error during login.'
    });
  }
}

// GET /api/auth/me (Customer Profile)
async function getMe(req, res) {
  try {
    const userResult = await query(
      'SELECT id, email, name, role, customer_id, is_verified, two_factor_enabled, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.', message: 'User not found.' });
    }
    const user = userResult.rows[0];

    let customerData = null;
    if (user.customer_id) {
      const custRes = await query('SELECT * FROM customers WHERE id = $1', [user.customer_id]);
      if (custRes.rows.length > 0) customerData = custRes.rows[0];
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        customerId: user.customer_id,
        phone: customerData ? customerData.phone : null,
        company: customerData ? customerData.company : null,
        avatar_url: customerData ? customerData.avatar_url : null,
        two_factor_enabled: Boolean(user.two_factor_enabled),
        is_verified: Boolean(user.is_verified),
        customer: customerData
      }
    });
  } catch (error) {
    console.error('Customer getMe error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error fetching user.',
      message: 'Internal server error fetching user.'
    });
  }
}

// POST /api/auth/register (Customer Registration)
async function register(req, res) {
  try {
    const { name, email, password, phone = '' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [trimmedEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'An account with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const customerId = uuidv4();
    const userId = uuidv4();
    const now = new Date().toISOString();

    // Insert customer record
    await query(
      'INSERT INTO customers (id, phone, company, status, avatar_url, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [customerId, phone.trim(), '', 'ACTIVE', null, now, now]
    );

    // Insert user record (is_verified = false until OTP verification)
    await query(
      'INSERT INTO users (id, email, password_hash, name, role, customer_id, is_verified, two_factor_enabled, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [userId, trimmedEmail, passwordHash, name.trim(), 'CUSTOMER', customerId, false, false, now, now]
    );

    // Generate OTP
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await query(
      'INSERT INTO otps (id, email, otp_code, purpose, expired_at, is_used) VALUES ($1, $2, $3, $4, $5, $6)',
      [uuidv4(), trimmedEmail, otpCode, 'REGISTRATION', expiresAt, false]
    );

    // Send email
    await sendOtpEmail({ to: trimmedEmail, name: name.trim(), otpCode, purpose: 'REGISTRATION' });

    // Log audit
    await query(
      'INSERT INTO activity_logs (id, user_id, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), userId, 'CUSTOMER_REGISTERED', `Customer ${name.trim()} (${trimmedEmail}) registered`, req.ip || '127.0.0.1']
    );

    return res.json({
      success: true,
      message: 'Registration successful! Verification code sent to your email.',
      devOtp: otpCode
    });
  } catch (error) {
    console.error('Customer register error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during registration.' });
  }
}



// POST /api/auth/verify-otp
async function verifyOtp(req, res) {
  try {
    const { email, otpCode, purpose = 'REGISTRATION' } = req.body;
    if (!email || !otpCode) {
      return res.status(400).json({ success: false, error: 'Email and OTP code are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const otpRes = await query(
      `SELECT * FROM otps 
       WHERE LOWER(email) = LOWER($1) 
         AND otp_code = $2 
         AND purpose = $3 
         AND is_used = false
         AND expired_at > $4
       ORDER BY created_at DESC LIMIT 1`,
      [trimmedEmail, otpCode.trim(), purpose, new Date().toISOString()]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification code.' });
    }

    const matchedOtp = otpRes.rows[0];

    // Mark OTP as used
    await query('UPDATE otps SET is_used = true WHERE id = $1', [matchedOtp.id]);

    // Find user
    const userRes = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [trimmedEmail]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    const user = userRes.rows[0];

    // If purpose is REGISTRATION, verify user account
    if (purpose === 'REGISTRATION') {
      await query('UPDATE users SET is_verified = true, updated_at = $1 WHERE id = $2', [new Date().toISOString(), user.id]);
      user.is_verified = true;
    }

    // Get customer info
    let customerData = null;
    if (user.customer_id) {
      const custRes = await query('SELECT * FROM customers WHERE id = $1', [user.customer_id]);
      if (custRes.rows.length > 0) customerData = custRes.rows[0];
    }

    // Generate JWT
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      customer_id: user.customer_id,
      customerId: user.customer_id
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    // Log activity
    await query(
      'INSERT INTO activity_logs (id, user_id, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), user.id, 'OTP_VERIFIED', `OTP verified for purpose: ${purpose}`, req.ip || '127.0.0.1']
    );

    return res.json({
      success: true,
      message: 'Verification successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        customerId: user.customer_id,
        phone: customerData ? customerData.phone : null,
        company: customerData ? customerData.company : null,
        avatar_url: customerData ? customerData.avatar_url : null,
        two_factor_enabled: Boolean(user.two_factor_enabled),
        is_verified: Boolean(user.is_verified),
        customer: customerData
      }
    });
  } catch (error) {
    console.error('Customer verifyOtp error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error verifying OTP.' });
  }
}




// POST /api/auth/resend-otp
async function resendOtp(req, res) {
  try {
    const { email, purpose = 'REGISTRATION' } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const userRes = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [trimmedEmail]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No account found with this email address.' });
    }

    const user = userRes.rows[0];
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await query(
      'INSERT INTO otps (id, email, otp_code, purpose, expired_at, is_used) VALUES ($1, $2, $3, $4, $5, $6)',
      [uuidv4(), trimmedEmail, otpCode, purpose, expiresAt, false]
    );

    await sendOtpEmail({ to: trimmedEmail, name: user.name, otpCode, purpose });

    return res.json({
      success: true,
      message: 'New verification code sent successfully!',
      devOtp: otpCode
    });
  } catch (error) {
    console.error('Customer resendOtp error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error resending OTP.' });
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const userRes = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [trimmedEmail]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No account registered with this email address.' });
    }

    const user = userRes.rows[0];
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await query(
      'INSERT INTO otps (id, email, otp_code, purpose, expired_at, is_used) VALUES ($1, $2, $3, $4, $5, $6)',
      [uuidv4(), trimmedEmail, otpCode, 'RESET_PASSWORD', expiresAt, false]
    );

    await sendOtpEmail({ to: trimmedEmail, name: user.name, otpCode, purpose: 'RESET_PASSWORD' });

    return res.json({
      success: true,
      message: 'Password reset code dispatched to your email!',
      devOtp: otpCode
    });
  } catch (error) {
    console.error('Customer forgotPassword error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error requesting password reset.' });
  }
}




// POST /api/auth/reset-password
async function resetPassword(req, res) {
  try {
    const { email, otpCode, newPassword } = req.body;
    if (!email || !otpCode || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const otpRes = await query(
      `SELECT * FROM otps 
       WHERE LOWER(email) = LOWER($1) 
         AND otp_code = $2 
         AND purpose = 'RESET_PASSWORD' 
         AND is_used = false
         AND expired_at > $3
       ORDER BY created_at DESC LIMIT 1`,
      [trimmedEmail, otpCode.trim(), new Date().toISOString()]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or expired password reset code.' });
    }

    // Invalidate OTP
    await query('UPDATE otps SET is_used = true WHERE id = $1', [otpRes.rows[0].id]);

    // Hash and update password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE LOWER(email) = LOWER($3)', [
      passwordHash,
      new Date().toISOString(),
      trimmedEmail
    ]);

    // Find user for activity log
    const uRes = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [trimmedEmail]);
    if (uRes.rows.length > 0) {
      await query(
        'INSERT INTO activity_logs (id, user_id, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), uRes.rows[0].id, 'PASSWORD_RESET', 'Account password successfully reset via OTP', req.ip || '127.0.0.1']
      );
    }

    return res.json({
      success: true,
      message: 'Password reset successfully! You can now log in.'
    });
  } catch (error) {
    console.error('Customer resetPassword error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error resetting password.' });
  }
}




// 2. USER PROFILE & SETTINGS (CUSTOMER)




// PUT /api/user/profile
async function updateProfile(req, res) {
  try {
    const { name, phone = '', avatarUrl = '' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name cannot be empty.' });
    }

    const userId = req.user.id;
    const now = new Date().toISOString();

    // Update users name
    await query('UPDATE users SET name = $1, updated_at = $2 WHERE id = $3', [name.trim(), now, userId]);

    // Update customer phone and avatar if linked
    const userRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    let customerData = null;
    if (user.customer_id) {
      await query(
        'UPDATE customers SET phone = $1, avatar_url = $2, updated_at = $3 WHERE id = $4',
        [phone.trim(), avatarUrl.trim(), now, user.customer_id]
      );
      const custRes = await query('SELECT * FROM customers WHERE id = $1', [user.customer_id]);
      if (custRes.rows.length > 0) customerData = custRes.rows[0];
    }

    // Log activity
    await query(
      'INSERT INTO activity_logs (id, user_id, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), userId, 'PROFILE_UPDATED', `Profile information updated for ${user.email}`, req.ip || '127.0.0.1']
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        customerId: user.customer_id,
        phone: customerData ? customerData.phone : phone,
        avatar_url: customerData ? customerData.avatar_url : avatarUrl,
        two_factor_enabled: Boolean(user.two_factor_enabled),
        is_verified: Boolean(user.is_verified),
        customer: customerData
      }
    });
  } catch (error) {
    console.error('Customer updateProfile error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error updating profile.' });
  }
}




// PUT /api/user/password
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
    }

    const userId = req.user.id;
    const userRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [
      passwordHash,
      new Date().toISOString(),
      userId
    ]);

    await query(
      'INSERT INTO activity_logs (id, user_id, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), userId, 'PASSWORD_CHANGED', 'Account password successfully updated', req.ip || '127.0.0.1']
    );

    return res.json({
      success: true,
      message: 'Password changed successfully!'
    });
  } catch (error) {
    console.error('Customer changePassword error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error changing password.' });
  }
}




// PUT /api/user/two-factor
async function toggleTwoFactor(req, res) {
  try {
    const { enabled } = req.body;
    const userId = req.user.id;
    const boolVal = Boolean(enabled);

    await query('UPDATE users SET two_factor_enabled = $1, updated_at = $2 WHERE id = $3', [
      boolVal,
      new Date().toISOString(),
      userId
    ]);

    const userRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    let customerData = null;
    if (user.customer_id) {
      const custRes = await query('SELECT * FROM customers WHERE id = $1', [user.customer_id]);
      if (custRes.rows.length > 0) customerData = custRes.rows[0];
    }

    await query(
      'INSERT INTO activity_logs (id, user_id, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [
        uuidv4(),
        userId,
        boolVal ? '2FA_ENABLED' : '2FA_DISABLED',
        `Two-factor authentication ${boolVal ? 'enabled' : 'disabled'}`,
        req.ip || '127.0.0.1'
      ]
    );

    return res.json({
      success: true,
      message: boolVal ? 'Two-Factor Authentication is now enabled!' : 'Two-Factor Authentication disabled.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        customerId: user.customer_id,
        phone: customerData ? customerData.phone : null,
        avatar_url: customerData ? customerData.avatar_url : null,
        two_factor_enabled: boolVal,
        is_verified: Boolean(user.is_verified),
        customer: customerData
      }
    });
  } catch (error) {
    console.error('Customer toggleTwoFactor error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error updating 2FA settings.' });
  }
}




// 3. DASHBOARD METRICS (CUSTOMER PANEL)



// GET /api/dashboard/summary
async function getDashboardSummary(req, res) {
  try {
    const customerId = req.user ? (req.user.customerId || req.user.customer_id) : null;

    let devicesSql = 'SELECT * FROM devices';
    let params = [];

    if (customerId) {
      devicesSql += ' WHERE customer_id = $1';
      params = [customerId];
    }

    const devRes = await query(devicesSql, params);
    const devices = devRes.rows;

    const totalDevices = devices.length;
    let onlineDevices = 0;
    let offlineDevices = 0;
    let maintenanceDevices = 0;
    const typeDistribution = {};

    devices.forEach((d) => {
      const s = (d.status || d.state || '').toUpperCase();
      if (s === 'ONLINE' || s === 'AVAILABLE' || s === 'ASSIGNED') {
        onlineDevices++;
      } else if (s === 'MAINTENANCE') {
        maintenanceDevices++;
      } else {
        offlineDevices++;
      }

      const type = d.device_type || d.model || 'IoT Sensor';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    const uptimePercentage = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 100;

    // Recent activity logs for customer
    let actSql = 'SELECT id, action, details, created_at FROM activity_logs';
    let actParams = [];

    if (req.user && req.user.id) {
      actSql += ' WHERE user_id = $1';
      actParams = [req.user.id];
    }
    actSql += ' ORDER BY created_at DESC LIMIT 10';

    const actRes = await query(actSql, actParams);

    const summaryData = {
      totalDevices,
      onlineDevices,
      offlineDevices,
      maintenanceDevices,
      uptimePercentage,
      typeDistribution,
      recentActivities: actRes.rows
    };

    return res.json({
      success: true,
      data: summaryData,
      ...summaryData
    });
  } catch (error) {
    console.error('Customer getDashboardSummary error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error retrieving dashboard metrics.' });
  }
}




// 4. DEVICE MANAGEMENT (CUSTOMER PANEL)




// GET /api/devices (Customer: views only their assigned devices)
async function getAllDevices(req, res) {
  try {
    const { search = '', status = 'ALL', model = 'ALL', type = '', page, limit } = req.query;

    const userCustId = req.user ? (req.user.customerId || req.user.customer_id) : 'none';
    let whereSql = ' AND d.customer_id = $1';
    const params = [userCustId || 'none'];

    if (status && status !== 'ALL' && status !== '') {
      params.push(status);
      whereSql += ` AND (d.status ILIKE $${params.length} OR d.state ILIKE $${params.length})`;
    }

    if (model && model !== 'ALL' && model !== '') {
      params.push(model);
      whereSql += ` AND d.model = $${params.length}`;
    }

    if (type && type !== 'ALL' && type !== '') {
      params.push(type);
      whereSql += ` AND d.device_type ILIKE $${params.length}`;
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      whereSql += ` AND (
        d.unique_id ILIKE $${params.length} OR 
        d.serial_number ILIKE $${params.length} OR 
        d.device_name ILIKE $${params.length} OR 
        d.device_type ILIKE $${params.length} OR 
        d.location ILIKE $${params.length} OR 
        d.model ILIKE $${params.length}
      )`;
    }

    let total = null;
    if (page !== undefined) {
      const countSql = `SELECT COUNT(*) as total FROM devices d WHERE 1=1 ${whereSql}`;
      const countRes = await query(countSql, params);
      total = parseInt(countRes.rows[0]?.total || 0, 10);
    }

    let sql = `
      SELECT d.*
      FROM devices d
      WHERE 1=1 ${whereSql}
      ORDER BY d.created_at DESC
    `;

    let pageNum = 1;
    let limitNum = 10;
    if (page !== undefined) {
      pageNum = Math.max(1, parseInt(page, 10) || 1);
      limitNum = Math.max(1, parseInt(limit, 10) || 10);
      const offset = (pageNum - 1) * limitNum;
      params.push(limitNum);
      sql += ` LIMIT $${params.length}`;
      params.push(offset);
      sql += ` OFFSET $${params.length}`;
    }

    const result = await query(sql, params);

    const formattedDevices = result.rows.map((d) => {
      let displayStatus = d.status;
      if (d.state && d.state.toLowerCase() === 'maintenance') {
        displayStatus = 'Maintenance';
      } else if (d.state && d.state.toLowerCase() === 'offline') {
        displayStatus = 'Offline';
      } else {
        displayStatus = 'Online';
      }

      return {
        ...d,
        device_unique_id: d.unique_id,
        deviceUniqueId: d.unique_id,
        deviceName: d.device_name || d.model,
        serialNumber: d.serial_number,
        deviceType: d.device_type || d.model,
        status: displayStatus,
        raw_status: d.status
      };
    });

    // Distinct models for customer
    const modelsRes = await query(
      "SELECT DISTINCT model FROM devices WHERE customer_id = $1 AND model IS NOT NULL AND model != '' ORDER BY model ASC",
      [userCustId || 'none']
    );
    const models = modelsRes.rows.map((r) => r.model);

    return res.json({
      success: true,
      devices: formattedDevices,
      data: formattedDevices,
      models,
      pagination: page !== undefined ? {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum))
      } : undefined
    });
  } catch (error) {
    console.error('Customer getAllDevices error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve devices.' });
  }
}

// GET /api/devices/:id (Customer: get device details)
async function getDeviceById(req, res) {
  try {
    const { id } = req.params;
    const userCustId = req.user ? (req.user.customerId || req.user.customer_id) : null;

    const sql = 'SELECT * FROM devices WHERE id = $1 OR unique_id = $1';
    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    const device = result.rows[0];

    // Ensure customer owns this device
    if (userCustId && device.customer_id !== userCustId) {
      return res.status(403).json({ success: false, message: 'Unauthorized device access.' });
    }

    const formatted = {
      ...device,
      device_unique_id: device.unique_id,
      deviceUniqueId: device.unique_id,
      deviceName: device.device_name,
      serialNumber: device.serial_number,
      deviceType: device.device_type
    };

    return res.json({ success: true, device: formatted, data: formatted });
  } catch (error) {
    console.error('Customer getDeviceById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve device.' });
  }
}

// POST /api/devices (Customer: claims/registers manufactured device from inventory)
async function createDevice(req, res) {
  try {
    let {
      unique_id,
      deviceUniqueId,
      serial_number,
      serialNumber,
      device_name,
      deviceName,
      device_type,
      deviceType,
      location = ''
    } = req.body;

    const finalUniqueId = (unique_id || deviceUniqueId || '').trim();
    const finalSerial = (serial_number || serialNumber || '').trim();
    const finalDeviceName = (device_name || deviceName || '').trim();
    const finalDeviceType = (device_type || deviceType || '').trim();

    if (!finalUniqueId || !finalSerial) {
      return res.status(400).json({
        success: false,
        error: 'Unique ID and Serial Number are required to register a device.',
        message: 'Unique ID and Serial Number are required to register a device.'
      });
    }

    // Determine targetCustomerId
    let targetCustomerId = req.user ? (req.user.customerId || req.user.customer_id) : null;
    if (!targetCustomerId && req.user && req.user.id) {
      const uRes = await query('SELECT customer_id, phone FROM users WHERE id = $1', [req.user.id]);
      if (uRes.rows.length > 0 && uRes.rows[0].customer_id) {
        targetCustomerId = uRes.rows[0].customer_id;
      } else {
        const newCustId = uuidv4();
        const nowStr = new Date().toISOString();
        await query(
          'INSERT INTO customers (id, phone, company, status, avatar_url, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [newCustId, uRes.rows[0]?.phone || '', '', 'ACTIVE', null, nowStr, nowStr]
        );
        await query('UPDATE users SET customer_id = $1 WHERE id = $2', [newCustId, req.user.id]);
        targetCustomerId = newCustId;
      }
    }

    // Look for device in inventory
    const checkSql = 'SELECT * FROM devices WHERE LOWER(unique_id) = LOWER($1) OR LOWER(serial_number) = LOWER($2)';
    const check = await query(checkSql, [finalUniqueId, finalSerial]);

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Device not found in inventory. Please contact manufacturer.',
        message: 'Device not found in inventory. Please contact manufacturer.'
      });
    }

    const exactMatch = check.rows.find(
      (d) =>
        d.unique_id.trim().toLowerCase() === finalUniqueId.toLowerCase() &&
        d.serial_number.trim().toLowerCase() === finalSerial.toLowerCase()
    );

    if (!exactMatch) {
      return res.status(400).json({
        success: false,
        error: 'Credential mismatch: Serial Number and Unique ID do not match.',
        message: 'Credential mismatch: Serial Number and Unique ID do not match.'
      });
    }

    // Check if already assigned to someone else
    if (exactMatch.customer_id && exactMatch.customer_id !== targetCustomerId) {
      return res.status(400).json({
        success: false,
        error: 'This device is already assigned to another customer.',
        message: 'This device is already assigned to another customer.'
      });
    }

    // Check if already assigned to this customer
    if (exactMatch.customer_id && exactMatch.customer_id === targetCustomerId) {
      return res.status(400).json({
        success: false,
        error: 'This device is already registered in your account.',
        message: 'This device is already registered in your account.'
      });
    }

    // Claim device for this customer!
    const now = new Date().toISOString();
    await query(
      `UPDATE devices 
       SET customer_id = $1,
           status = 'ASSIGNED',
           state = 'offline',
           assigned_at = $2,
           device_name = COALESCE(NULLIF($3, ''), device_name),
           device_type = COALESCE(NULLIF($4, ''), device_type),
           location = COALESCE(NULLIF($5, ''), location),
           updated_at = $2
       WHERE id = $6`,
      [
        targetCustomerId,
        now,
        finalDeviceName,
        finalDeviceType,
        location,
        exactMatch.id
      ]
    );

    // Ensure sample telemetry readings exist
    const telCheck = await query('SELECT id FROM telemetry_readings WHERE device_id = $1 LIMIT 1', [exactMatch.id]);
    if (telCheck.rows.length === 0) {
      const metrics = [
        { metric: 'piezo_voltage', value: (Math.random() * 2 + 2.5).toFixed(2), unit: 'V' },
        { metric: 'pulse_frequency', value: Math.floor(Math.random() * 80 + 80), unit: 'Hz' },
        { metric: 'impact_force', value: (Math.random() * 40 + 60).toFixed(1), unit: 'kPa' },
        { metric: 'temperature', value: (Math.random() * 10 + 22).toFixed(1), unit: '°C' }
      ];
      for (const m of metrics) {
        await query(
          'INSERT INTO telemetry_readings (id, device_id, metric, value, unit) VALUES ($1, $2, $3, $4, $5)',
          [uuidv4(), exactMatch.id, m.metric, m.value, m.unit]
        );
      }
    }

    // Log audit log
    await query(
      'INSERT INTO activity_logs (id, user_id, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [
        uuidv4(),
        req.user ? req.user.id : null,
        'DEVICE_ASSIGNED',
        `Customer claimed device ${exactMatch.unique_id} (${exactMatch.serial_number})`,
        req.ip || '127.0.0.1'
      ]
    );

    const updatedDevice = {
      ...exactMatch,
      customer_id: targetCustomerId,
      status: 'Online',
      state: 'offline',
      device_name: finalDeviceName || exactMatch.device_name,
      deviceName: finalDeviceName || exactMatch.device_name,
      device_unique_id: exactMatch.unique_id,
      deviceUniqueId: exactMatch.unique_id,
      serial_number: exactMatch.serial_number,
      serialNumber: exactMatch.serial_number,
      device_type: finalDeviceType || exactMatch.device_type,
      deviceType: finalDeviceType || exactMatch.device_type,
      location: location || exactMatch.location
    };

    return res.status(201).json({
      success: true,
      message: 'Device successfully registered and claimed!',
      device: updatedDevice,
      data: updatedDevice
    });
  } catch (error) {
    console.error('Customer createDevice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to register device.' });
  }
}

// PUT /api/devices/:id (Customer: updates own device configuration)
async function updateDevice(req, res) {
  try {
    const { id } = req.params;
    const { device_name, deviceName, device_type, deviceType, location, state } = req.body;
    const userCustId = req.user ? (req.user.customerId || req.user.customer_id) : null;

    const devCheck = await query('SELECT * FROM devices WHERE id = $1', [id]);
    if (devCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    const current = devCheck.rows[0];
    if (userCustId && current.customer_id !== userCustId) {
      return res.status(403).json({ success: false, message: 'Unauthorized device modification.' });
    }

    const now = new Date().toISOString();
    const finalName = device_name || deviceName || current.device_name;
    const finalType = device_type || deviceType || current.device_type;
    const finalLoc = location !== undefined ? location : current.location;
    const finalState = state || current.state;

    await query(
      `UPDATE devices SET device_name = $1, device_type = $2, location = $3, state = $4, updated_at = $5 WHERE id = $6`,
      [finalName, finalType, finalLoc, finalState, now, id]
    );

    await query(
      `INSERT INTO activity_logs (id, user_id, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)`,
      [
        uuidv4(),
        req.user ? req.user.id : null,
        'DEVICE_UPDATED',
        `Customer updated device "${finalName}"`,
        req.ip || '127.0.0.1'
      ]
    );

    return res.json({
      success: true,
      message: 'Device updated successfully.'
    });
  } catch (error) {
    console.error('Customer updateDevice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update device.' });
  }
}

// DELETE /api/devices/:id (Customer: unassigns device from account)
async function deleteDevice(req, res) {
  try {
    const { id } = req.params;
    const userCustId = req.user ? (req.user.customerId || req.user.customer_id) : null;

    const devCheck = await query('SELECT * FROM devices WHERE id = $1', [id]);
    if (devCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    const dev = devCheck.rows[0];
    if (userCustId && dev.customer_id !== userCustId) {
      return res.status(403).json({ success: false, message: 'Unauthorized device deletion.' });
    }

    const now = new Date().toISOString();
    // For customer, deleting device means releasing/unassigning it back to inventory
    await query(
      `UPDATE devices SET customer_id = NULL, status = 'available', state = 'offline', assigned_at = NULL, updated_at = $1 WHERE id = $2`,
      [now, id]
    );

    await query(
      `INSERT INTO activity_logs (id, user_id, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)`,
      [
        uuidv4(),
        req.user ? req.user.id : null,
        'DEVICE_UNASSIGNED',
        `Customer released device "${dev.device_name || dev.model}" (${dev.serial_number})`,
        req.ip || '127.0.0.1'
      ]
    );

    return res.json({
      success: true,
      message: 'Device removed from your account successfully.'
    });
  } catch (error) {
    console.error('Customer deleteDevice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove device.' });
  }
}

// GET /api/devices/:id/telemetry (Customer)
async function getDeviceTelemetry(req, res) {
  try {
    const { id } = req.params;
    const userCustId = req.user ? (req.user.customerId || req.user.customer_id) : null;

    const devCheck = await query('SELECT * FROM devices WHERE id = $1', [id]);
    if (devCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    if (userCustId && devCheck.rows[0].customer_id !== userCustId) {
      return res.status(403).json({ success: false, message: 'Unauthorized device telemetry access.' });
    }

    const result = await query(
      'SELECT * FROM telemetry_readings WHERE device_id = $1 ORDER BY timestamp DESC LIMIT 50',
      [id]
    );

    let readings = result.rows;
    if (readings.length === 0) {
      const now = Date.now();
      for (let i = 0; i < 15; i++) {
        readings.push({
          id: `sim-${i}`,
          device_id: id,
          metric: 'piezo_voltage',
          value: (3.0 + Math.sin(i / 2) * 1.2 + (Math.random() * 0.3 - 0.15)).toFixed(2),
          unit: 'V',
          timestamp: new Date(now - (15 - i) * 1000 * 60).toISOString()
        });
      }
    }

    return res.json({
      success: true,
      telemetry: readings
    });
  } catch (error) {
    console.error('Customer getDeviceTelemetry error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve telemetry data.' });
  }
}

module.exports = {
  // Auth
  login,
  getMe,
  register,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,

  // User Profile
  updateProfile,
  changePassword,
  toggleTwoFactor,

  // Dashboard
  getDashboardSummary,

  // Devices
  getAllDevices,
  getDeviceById,
  createDevice,
  claimDevice: createDevice,
  updateDevice,
  deleteDevice,
  getDeviceTelemetry
};
