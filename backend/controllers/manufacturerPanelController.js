const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { query, getDatabaseStatus } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const { sendSetPasswordEmail, getEmailServiceStatus } = require('../services/emailService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Helper to generate ThingsBoard style Unique Device ID
function generateUniqueDeviceId() {
  const prefix = 'TB-DEV';
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${rand}`;
}

// ==========================================
// 1. AUTHENTICATION & ACCESS (MANUFACTURER)
// ==========================================

// POST /api/auth/login (Manufacturer / Admin)
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
      [uuidv4(), user.id, 'MANUFACTURER_LOGIN', `Manufacturer login by ${user.email}`, req.ip || '127.0.0.1']
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
    console.error('Manufacturer login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during manufacturer login.',
      message: 'Internal server error during manufacturer login.'
    });
  }
}

// GET /api/auth/me (Manufacturer / Admin)
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
    console.error('Manufacturer getMe error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error fetching user profile.',
      message: 'Internal server error fetching user profile.'
    });
  }
}

// GET /api/auth/verify-invite/:token
async function verifyInviteToken(req, res) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required.' });
    }

    const otpRes = await query(
      `SELECT * FROM otps 
       WHERE otp_code = $1 
         AND purpose IN ('INVITE', 'SET_PASSWORD')
         AND is_used = false
         AND expired_at > $2`,
      [token, new Date().toISOString()]
    );

    if (otpRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid or expired invitation link.' });
    }

    const otp = otpRes.rows[0];
    const userRes = await query(
      `SELECT u.id as user_id, u.name, u.email, u.customer_id, c.status 
       FROM users u 
       LEFT JOIN customers c ON u.customer_id = c.id 
       WHERE LOWER(u.email) = LOWER($1)`,
      [otp.email]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Associated customer user not found.' });
    }

    const user = userRes.rows[0];

    return res.json({
      success: true,
      customer: {
        id: user.customer_id,
        name: user.name,
        email: user.email,
        status: user.status || 'PENDING_INVITE'
      }
    });
  } catch (error) {
    console.error('verifyInviteToken error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error verifying token.' });
  }
}

// POST /api/auth/set-password
async function setPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const otpRes = await query(
      `SELECT * FROM otps 
       WHERE otp_code = $1 
         AND purpose IN ('INVITE', 'SET_PASSWORD')
         AND is_used = false
         AND expired_at > $2`,
      [token, new Date().toISOString()]
    );

    if (otpRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid or expired invitation token.' });
    }

    const otp = otpRes.rows[0];
    const userRes = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [otp.email]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userRes.rows[0];
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const now = new Date().toISOString();

    // Mark OTP as used
    await query('UPDATE otps SET is_used = true WHERE id = $1', [otp.id]);

    // Update user password and mark verified
    await query(
      'UPDATE users SET password_hash = $1, is_verified = true, updated_at = $2 WHERE id = $3',
      [passwordHash, now, user.id]
    );

    // Update customer status to ACTIVE
    if (user.customer_id) {
      await query('UPDATE customers SET status = $1, updated_at = $2 WHERE id = $3', ['ACTIVE', now, user.customer_id]);
    }

    // Add activity log
    await query(
      'INSERT INTO activity_logs (id, user_id, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), user.id, 'CUSTOMER_PASSWORD_SET', 'Password established and customer activated', req.ip || '127.0.0.1']
    );

    return res.json({
      success: true,
      message: 'Password successfully set! You can now log in with your email and password.',
      customer: {
        id: user.customer_id,
        name: user.name,
        email: user.email,
        status: 'ACTIVE'
      }
    });
  } catch (error) {
    console.error('setPassword error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error setting password.' });
  }
}

// ==========================================
// 2. CUSTOMER MANAGEMENT (MANUFACTURER PANEL)
// ==========================================

// GET /api/customers
async function getAllCustomers(req, res) {
  try {
    const { search = '', status = 'ALL', page, limit } = req.query;

    // Auto-link any customer users who don't yet have a row in customers
    const unlinkedUsers = await query(
      "SELECT id, name, email FROM users WHERE role = 'CUSTOMER' AND (customer_id IS NULL OR customer_id NOT IN (SELECT id FROM customers))"
    );
    for (const unlinked of unlinkedUsers.rows) {
      const newCustId = uuidv4();
      const nowStr = new Date().toISOString();
      await query(
        'INSERT INTO customers (id, phone, company, status, avatar_url, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [newCustId, '', '', 'ACTIVE', null, nowStr, nowStr]
      );
      await query('UPDATE users SET customer_id = $1 WHERE id = $2', [newCustId, unlinked.id]);
    }

    let whereSql = '';
    const params = [];

    if (status && status !== 'ALL') {
      params.push(status);
      whereSql += ` AND c.status = $${params.length}`;
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      whereSql += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR c.company ILIKE $${params.length} OR c.phone ILIKE $${params.length})`;
    }

    let total = null;
    if (page !== undefined) {
      const countSql = `
        SELECT COUNT(DISTINCT c.id) as total 
        FROM customers c 
        LEFT JOIN users u ON u.customer_id = c.id
        WHERE 1=1 ${whereSql}
      `;
      const countRes = await query(countSql, params);
      total = parseInt(countRes.rows[0]?.total || 0, 10);
    }

    let sql = `
      SELECT 
        c.id,
        c.phone,
        c.company,
        c.status,
        c.avatar_url,
        c.created_at,
        c.updated_at,
        COALESCE(u.name, 'Customer Account') as name,
        COALESCE(u.email, '') as email,
        u.id as user_id,
        u.is_verified,
        (SELECT COUNT(*) FROM devices d WHERE d.customer_id = c.id) as assigned_device_count
      FROM customers c
      LEFT JOIN users u ON u.customer_id = c.id
      WHERE 1=1 ${whereSql}
      ORDER BY c.created_at DESC
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

    // Fetch active invites for customers from otps
    const customers = await Promise.all(
      result.rows.map(async (c) => {
        let inviteLink = null;
        if (c.email) {
          const otpRes = await query(
            `SELECT otp_code FROM otps 
             WHERE LOWER(email) = LOWER($1) 
               AND purpose IN ('INVITE', 'SET_PASSWORD') 
               AND is_used = false
               AND expired_at > $2
             ORDER BY created_at DESC LIMIT 1`,
            [c.email, new Date().toISOString()]
          );
          if (otpRes.rows.length > 0) {
            inviteLink = `${FRONTEND_URL}/set-password?token=${otpRes.rows[0].otp_code}`;
          }
        }
        return {
          ...c,
          assigned_device_count: parseInt(c.assigned_device_count || 0),
          invite_link: inviteLink
        };
      })
    );

    return res.json({
      success: true,
      customers,
      pagination: page !== undefined ? {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum))
      } : undefined
    });
  } catch (error) {
    console.error('getAllCustomers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve customers.' });
  }
}

// GET /api/customers/:id
async function getCustomerById(req, res) {
  try {
    const { id } = req.params;
    const custSql = `
      SELECT 
        c.id,
        c.phone,
        c.company,
        c.status,
        c.avatar_url,
        c.created_at,
        c.updated_at,
        COALESCE(u.name, '') as name,
        COALESCE(u.email, '') as email,
        u.id as user_id,
        u.is_verified
      FROM customers c
      LEFT JOIN users u ON u.customer_id = c.id
      WHERE c.id = $1
    `;
    const custRes = await query(custSql, [id]);
    if (custRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const customer = custRes.rows[0];
    const devRes = await query('SELECT * FROM devices WHERE customer_id = $1 ORDER BY created_at DESC', [id]);

    let inviteLink = null;
    if (customer.email) {
      const otpRes = await query(
        `SELECT otp_code FROM otps 
         WHERE LOWER(email) = LOWER($1) 
           AND purpose IN ('INVITE', 'SET_PASSWORD') 
           AND is_used = false
           AND expired_at > $2
         ORDER BY created_at DESC LIMIT 1`,
        [customer.email, new Date().toISOString()]
      );
      if (otpRes.rows.length > 0) {
        inviteLink = `${FRONTEND_URL}/set-password?token=${otpRes.rows[0].otp_code}`;
      }
    }

    return res.json({
      success: true,
      customer: {
        ...customer,
        invite_link: inviteLink,
        assignedDevices: devRes.rows
      }
    });
  } catch (error) {
    console.error('getCustomerById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve customer details.' });
  }
}

// POST /api/customers
async function createCustomer(req, res) {
  try {
    const { name, email, phone = '', company = '', status = 'PENDING_INVITE' } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Customer Name and Email are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // Check duplicate email in users
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [trimmedEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'A user/customer with this email already exists.' });
    }

    const customerId = uuidv4();
    const userId = uuidv4();
    const inviteToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    const now = new Date().toISOString();

    // 1. Insert into customers
    await query(
      `INSERT INTO customers (id, phone, company, status, avatar_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [customerId, phone.trim(), company.trim(), status, null, now, now]
    );

    // 2. Insert into users with temporary empty password (pending invite set-password)
    await query(
      `INSERT INTO users (id, email, password_hash, name, role, customer_id, is_verified, two_factor_enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [userId, trimmedEmail, '', trimmedName, 'CUSTOMER', customerId, false, false, now, now]
    );

    // 3. Insert invite token into otps
    await query(
      `INSERT INTO otps (id, email, otp_code, purpose, expired_at, is_used, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuidv4(), trimmedEmail, inviteToken, 'INVITE', expiresAt, false, now]
    );

    const inviteLink = `${FRONTEND_URL}/set-password?token=${inviteToken}`;

    // Send invitation email
    const emailResult = await sendSetPasswordEmail({
      to: trimmedEmail,
      name: trimmedName,
      inviteLink
    });

    // Log audit
    await query(
      `INSERT INTO activity_logs (id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        uuidv4(),
        req.user ? req.user.id : null,
        'CUSTOMER_CREATED',
        `Created customer ${trimmedName} (${trimmedEmail}) with invitation link. Email dispatched: ${emailResult.success ? 'YES' : 'NO'}`,
        req.ip || '127.0.0.1'
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Customer successfully created and invitation dispatched.',
      customer: {
        id: customerId,
        name: trimmedName,
        email: trimmedEmail,
        phone: phone.trim(),
        company: company.trim(),
        status,
        invite_link: inviteLink,
        assigned_device_count: 0
      },
      emailDelivery: emailResult
    });
  } catch (error) {
    console.error('createCustomer error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create customer.' });
  }
}

// PUT /api/customers/:id
async function updateCustomer(req, res) {
  try {
    const { id } = req.params;
    const { name, phone = '', company = '', status } = req.body;

    const custRes = await query('SELECT * FROM customers WHERE id = $1', [id]);
    if (custRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const now = new Date().toISOString();

    // Update customers table
    await query(
      `UPDATE customers 
       SET phone = $1, company = $2, status = COALESCE($3, status), updated_at = $4 
       WHERE id = $5`,
      [phone.trim(), company.trim(), status || null, now, id]
    );

    // Update linked users record if name provided
    if (name && name.trim()) {
      await query(
        `UPDATE users SET name = $1, updated_at = $2 WHERE customer_id = $3`,
        [name.trim(), now, id]
      );
    }

    // Log audit
    await query(
      `INSERT INTO activity_logs (id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        uuidv4(),
        req.user ? req.user.id : null,
        'CUSTOMER_UPDATED',
        `Updated customer profile for ${id}`,
        req.ip || '127.0.0.1'
      ]
    );

    return res.json({
      success: true,
      message: 'Customer updated successfully.'
    });
  } catch (error) {
    console.error('updateCustomer error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update customer.' });
  }
}

// DELETE /api/customers/:id
async function deleteCustomer(req, res) {
  try {
    const { id } = req.params;
    const check = await query('SELECT * FROM customers WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Unassign assigned devices
    await query(
      `UPDATE devices SET status = 'available', customer_id = NULL, assigned_at = NULL WHERE customer_id = $1`,
      [id]
    );

    // Get linked user
    const uRes = await query('SELECT id FROM users WHERE customer_id = $1', [id]);
    for (const u of uRes.rows) {
      await query('DELETE FROM activity_logs WHERE user_id = $1', [u.id]);
    }

    // Delete users and customer
    await query('DELETE FROM users WHERE customer_id = $1', [id]);
    await query('DELETE FROM customers WHERE id = $1', [id]);

    await query(
      `INSERT INTO activity_logs (id, user_id, action, details, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        uuidv4(),
        req.user ? req.user.id : null,
        'CUSTOMER_DELETED',
        `Deleted customer ${id} and unassigned their devices`,
        req.ip || '127.0.0.1'
      ]
    );

    return res.json({
      success: true,
      message: 'Customer and user account successfully deleted.'
    });
  } catch (error) {
    console.error('deleteCustomer error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete customer.' });
  }
}

// GET /api/customers/:id/devices
async function getCustomerDevices(req, res) {
  try {
    const { id } = req.params;
    const devices = await query('SELECT * FROM devices WHERE customer_id = $1 ORDER BY assigned_at DESC', [id]);
    return res.json({ success: true, devices: devices.rows, data: devices.rows });
  } catch (error) {
    console.error('getCustomerDevices error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve customer devices.' });
  }
}

// POST /api/customers/:id/resend-invite
async function resendInvite(req, res) {
  try {
    const { id } = req.params;
    const userRes = await query(
      `SELECT u.name, u.email FROM users u WHERE u.customer_id = $1 LIMIT 1`,
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer user not found.' });
    }

    const { name, email } = userRes.rows[0];
    const inviteToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Store in otps table
    await query(
      `INSERT INTO otps (id, email, otp_code, purpose, expired_at, is_used)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), email, inviteToken, 'INVITE', expiresAt, false]
    );

    const inviteLink = `${FRONTEND_URL}/set-password?token=${inviteToken}`;
    const emailResult = await sendSetPasswordEmail({ to: email, name, inviteLink });

    return res.json({
      success: true,
      message: 'Invitation resent successfully.',
      invite_link: inviteLink,
      emailDelivery: emailResult
    });
  } catch (error) {
    console.error('resendInvite error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resend invite.' });
  }
}

// POST /api/customers/:id/assign-devices
async function assignDevicesToCustomer(req, res) {
  try {
    const { id } = req.params;
    const { deviceIds } = req.body;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({ success: false, message: 'deviceIds array is required.' });
    }

    const custCheck = await query('SELECT id FROM customers WHERE id = $1', [id]);
    if (custCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const now = new Date().toISOString();
    for (const dId of deviceIds) {
      await query(
        `UPDATE devices SET customer_id = $1, status = 'ASSIGNED', state = 'online', assigned_at = $2, updated_at = $2 WHERE id = $3`,
        [id, now, dId]
      );
    }

    return res.json({
      success: true,
      message: `Successfully assigned ${deviceIds.length} device(s) to customer.`
    });
  } catch (error) {
    console.error('assignDevicesToCustomer error:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign devices.' });
  }
}

// ==========================================
// 3. DEVICE MANAGEMENT (MANUFACTURER PANEL)
// ==========================================

// GET /api/devices/generate-id
function getGeneratedDeviceId(req, res) {
  return res.json({ success: true, unique_id: generateUniqueDeviceId() });
}

// GET /api/devices (Manufacturer: view all inventory)
async function getAllDevices(req, res) {
  try {
    const { search = '', status = 'ALL', model = 'ALL', type = '', customerId = '', page, limit } = req.query;

    let whereSql = '';
    const params = [];

    if (customerId) {
      params.push(customerId);
      whereSql += ` AND d.customer_id = $${params.length}`;
    }

    if (status && status !== 'ALL' && status !== '') {
      const upperStatus = status.toUpperCase();
      if (upperStatus === 'ASSIGNED') {
        whereSql += ` AND (d.customer_id IS NOT NULL OR UPPER(d.status) = 'ASSIGNED')`;
      } else if (upperStatus === 'AVAILABLE') {
        whereSql += ` AND (d.customer_id IS NULL AND (d.status IS NULL OR UPPER(d.status) != 'ASSIGNED'))`;
      } else {
        params.push(status);
        whereSql += ` AND (d.status ILIKE $${params.length} OR d.state ILIKE $${params.length})`;
      }
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
      const searchParamIdx = params.length;
      whereSql += ` AND (
        d.unique_id ILIKE $${searchParamIdx} OR 
        d.serial_number ILIKE $${searchParamIdx} OR 
        d.device_name ILIKE $${searchParamIdx} OR 
        d.device_type ILIKE $${searchParamIdx} OR 
        d.location ILIKE $${searchParamIdx} OR 
        d.model ILIKE $${searchParamIdx} OR 
        d.firmware_version ILIKE $${searchParamIdx} OR
        c.company ILIKE $${searchParamIdx} OR
        EXISTS (
          SELECT 1 FROM users u 
          WHERE (u.customer_id = d.customer_id OR u.id = d.customer_id)
            AND (u.name ILIKE $${searchParamIdx} OR u.email ILIKE $${searchParamIdx})
        )
      )`;
    }

    let total = null;
    if (page !== undefined) {
      const countSql = `
        SELECT COUNT(DISTINCT d.id) as total 
        FROM devices d
        LEFT JOIN customers c ON d.customer_id = c.id
        WHERE 1=1 ${whereSql}
      `;
      const countRes = await query(countSql, [...params]);
      total = parseInt(countRes.rows[0]?.total || 0, 10);
    }

    let sql = `
      SELECT 
        d.*,
        COALESCE(
          (SELECT u.name FROM users u WHERE u.customer_id = d.customer_id OR u.id = d.customer_id LIMIT 1),
          c.company,
          'Customer User'
        ) as customer_name,
        COALESCE(
          (SELECT u.email FROM users u WHERE u.customer_id = d.customer_id OR u.id = d.customer_id LIMIT 1),
          ''
        ) as customer_email,
        c.company as customer_company
      FROM devices d
      LEFT JOIN customers c ON d.customer_id = c.id
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
      const displayStatus = (d.customer_id || d.status === 'ASSIGNED') ? 'ASSIGNED' : 'available';

      return {
        ...d,
        device_unique_id: d.unique_id,
        deviceUniqueId: d.unique_id,
        deviceName: d.model,
        serialNumber: d.serial_number,
        deviceType: d.model,
        status: displayStatus,
        raw_status: d.status
      };
    });

    // Distinct models
    const modelsRes = await query("SELECT DISTINCT model FROM devices WHERE model IS NOT NULL AND model != '' ORDER BY model ASC");
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
    console.error('getAllDevices (Manufacturer) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve devices.' });
  }
}

// GET /api/devices/:id (Manufacturer)
async function getDeviceById(req, res) {
  try {
    const { id } = req.params;
    const sql = `
      SELECT 
        d.*,
        COALESCE(u.name, '') as customer_name,
        COALESCE(u.email, '') as customer_email,
        c.company as customer_company
      FROM devices d
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN users u ON u.customer_id = c.id
      WHERE d.id = $1 OR d.unique_id = $1
    `;
    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    const device = result.rows[0];
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
    console.error('getDeviceById (Manufacturer) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve device.' });
  }
}

// POST /api/devices (Manufacturer creates device in inventory)
async function createDevice(req, res) {
  try {
    let {
      unique_id,
      deviceUniqueId,
      serial_number,
      serialNumber,
      model,
      firmware_version = 'v1.0.0',
      mfg_date,
      status,
      state = 'offline',
      location = '',
      device_type,
      deviceType,
      device_name,
      deviceName,
      customer_id = null
    } = req.body;


    const finalUniqueId = (unique_id || deviceUniqueId || generateUniqueDeviceId()).trim();
    const finalSerial = (serial_number || serialNumber || `PZ-${Date.now().toString().slice(-6)}`).trim();
    const finalModel = (model || deviceType || device_type || 'PiezoPulse Standard').trim();
    const finalDeviceType = (device_type || deviceType || finalModel || 'IoT Sensor').trim();
    const finalDeviceName = (device_name || deviceName || finalModel || 'Piezo Device').trim();
    const finalMfgDate = mfg_date || new Date().toISOString().split('T')[0];

    // Check if device with this unique_id or serial_number already exists
    const checkSql = 'SELECT * FROM devices WHERE LOWER(unique_id) = LOWER($1) OR LOWER(serial_number) = LOWER($2)';
    const check = await query(checkSql, [finalUniqueId, finalSerial]);

    if (check.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'A device with this Unique ID or Serial Number already exists.',
        message: 'A device with this Unique ID or Serial Number already exists.'
      });
    }

    let finalStatus = customer_id ? 'ASSIGNED' : (status && status.toLowerCase() === 'assigned' ? 'ASSIGNED' : 'available');
    let finalState = 'offline';
    // if (customer_id) {
    //   finalState = 'online';
    // }
    // if (status && (status.toLowerCase() === 'offline' || status.toLowerCase() === 'maintenance')) {
    //   finalState = status.toLowerCase();
    // }

    const deviceId = uuidv4();
    const now = new Date().toISOString();
    const assignedAt = customer_id ? now : null;

    await query(
      `INSERT INTO devices (
        id, unique_id, serial_number, model, firmware_version, 
        mfg_date, status, state, location, device_type, device_name, 
        customer_id, assigned_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        deviceId,
        finalUniqueId,
        finalSerial,
        finalModel,
        firmware_version,
        finalMfgDate,
        finalStatus,
        state,
        location,
        finalDeviceType,
        finalDeviceName,
        customer_id,
        assignedAt,
        now,
        now
      ]
    );

    // Seed sample telemetry readings
    const metrics = [
      { metric: 'piezo_voltage', value: (Math.random() * 2 + 2.5).toFixed(2), unit: 'V' },
      { metric: 'pulse_frequency', value: Math.floor(Math.random() * 80 + 80), unit: 'Hz' },
      { metric: 'impact_force', value: (Math.random() * 40 + 60).toFixed(1), unit: 'kPa' },
      { metric: 'temperature', value: (Math.random() * 10 + 22).toFixed(1), unit: '°C' }
    ];

    for (const m of metrics) {
      await query(
        `INSERT INTO telemetry_readings (id, device_id, metric, value, unit) VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), deviceId, m.metric, m.value, m.unit]
      );
    }

    // Log to activity_logs
    await query(
      `INSERT INTO activity_logs (id, user_id, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)`,
      [
        uuidv4(),
        req.user ? req.user.id : null,
        'DEVICE_CREATED',
        `Registered device "${finalDeviceName}" (${finalSerial})`,
        req.ip || '127.0.0.1'
      ]
    );

    const createdDevice = {
      id: deviceId,
      unique_id: finalUniqueId,
      device_unique_id: finalUniqueId,
      deviceUniqueId: finalUniqueId,
      serial_number: finalSerial,
      serialNumber: finalSerial,
      model: finalModel,
      firmware_version,
      mfg_date: finalMfgDate,
      status: finalStatus,
      state: finalState,
      location,
      device_type: finalDeviceType,
      deviceType: finalDeviceType,
      device_name: finalDeviceName,
      deviceName: finalDeviceName,
      customer_id,
      assigned_at: assignedAt,
      created_at: now,
      updated_at: now
    };

    return res.status(201).json({
      success: true,
      message: 'Device successfully created.',
      device: createdDevice,
      data: createdDevice
    });
  } catch (error) {
    console.error('createDevice (Manufacturer) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create device.' });
  }
}

// PUT /api/devices/:id (Manufacturer)
async function updateDevice(req, res) {
  try {
    const { id } = req.params;
    const {
      model,
      firmware_version,
      status,
      state,
      location,
      device_type,
      deviceType,
      device_name,
      deviceName,
      customer_id
    } = req.body;

    const devCheck = await query('SELECT * FROM devices WHERE id = $1', [id]);
    if (devCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    const current = devCheck.rows[0];
    const now = new Date().toISOString();

    const finalName = device_name || deviceName || current.device_name;
    const finalType = device_type || deviceType || current.device_type;
    const finalModel = model || current.model;
    const finalFw = firmware_version || current.firmware_version;
    const finalStatus = status || current.status;
    const finalState = state || current.state;
    const finalLoc = location !== undefined ? location : current.location;
    const finalCust = customer_id !== undefined ? customer_id : current.customer_id;
    const assignedAt = finalCust && !current.customer_id ? now : (finalCust ? current.assigned_at : null);

    await query(
      `UPDATE devices SET 
        model = $1, firmware_version = $2, status = $3, state = $4, 
        location = $5, device_type = $6, device_name = $7, customer_id = $8, 
        assigned_at = $9, updated_at = $10 
       WHERE id = $11`,
      [
        finalModel,
        finalFw,
        finalStatus,
        finalState,
        finalLoc,
        finalType,
        finalName,
        finalCust,
        assignedAt,
        now,
        id
      ]
    );

    await query(
      `INSERT INTO activity_logs (id, user_id, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)`,
      [
        uuidv4(),
        req.user ? req.user.id : null,
        'DEVICE_UPDATED',
        `Updated configuration for device "${finalName}"`,
        req.ip || '127.0.0.1'
      ]
    );

    return res.json({
      success: true,
      message: 'Device updated successfully.'
    });
  } catch (error) {
    console.error('updateDevice (Manufacturer) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update device.' });
  }
}

// DELETE /api/devices/:id (Manufacturer)
async function deleteDevice(req, res) {
  try {
    const { id } = req.params;
    const devCheck = await query('SELECT * FROM devices WHERE id = $1', [id]);
    if (devCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    const dev = devCheck.rows[0];

    // Delete telemetry readings
    await query('DELETE FROM telemetry_readings WHERE device_id = $1', [id]);

    // Delete device
    await query('DELETE FROM devices WHERE id = $1', [id]);

    await query(
      `INSERT INTO activity_logs (id, user_id, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)`,
      [
        uuidv4(),
        req.user ? req.user.id : null,
        'DEVICE_DELETED',
        `Deleted device "${dev.device_name || dev.model}" (${dev.serial_number})`,
        req.ip || '127.0.0.1'
      ]
    );

    return res.json({
      success: true,
      message: 'Device deleted successfully.'
    });
  } catch (error) {
    console.error('deleteDevice (Manufacturer) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete device.' });
  }
}

// POST /api/devices/:id/assign
async function assignDevice(req, res) {
  try {
    const { id } = req.params;
    const { customer_id } = req.body;

    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'customer_id is required.' });
    }

    const devCheck = await query('SELECT * FROM devices WHERE id = $1', [id]);
    if (devCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    let finalCustId = customer_id;
    const custCheck = await query('SELECT id FROM customers WHERE id = $1', [customer_id]);
    if (custCheck.rows.length === 0) {
      const userCheck = await query('SELECT id, customer_id FROM users WHERE id = $1', [customer_id]);
      if (userCheck.rows.length > 0) {
        if (userCheck.rows[0].customer_id) {
          finalCustId = userCheck.rows[0].customer_id;
        } else {
          finalCustId = uuidv4();
          const now = new Date().toISOString();
          await query(
            'INSERT INTO customers (id, phone, company, status, avatar_url, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [finalCustId, '', '', 'ACTIVE', null, now, now]
          );
          await query('UPDATE users SET customer_id = $1 WHERE id = $2', [finalCustId, userCheck.rows[0].id]);
        }
      } else {
        return res.status(404).json({ success: false, message: 'Customer not found.' });
      }
    }

    const now = new Date().toISOString();
    await query(
      `UPDATE devices SET customer_id = $1, status = 'ASSIGNED', state = 'online', assigned_at = $2, updated_at = $2 WHERE id = $3`,
      [finalCustId, now, id]
    );

    await query(
      `INSERT INTO activity_logs (id, user_id, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)`,
      [
        uuidv4(),
        req.user ? req.user.id : null,
        'DEVICE_ASSIGNED',
        `Assigned device ${devCheck.rows[0].unique_id} to customer ${finalCustId}`,
        req.ip || '127.0.0.1'
      ]
    );

    return res.json({
      success: true,
      message: 'Device assigned successfully.'
    });
  } catch (error) {
    console.error('assignDevice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign device.' });
  }
}

// POST /api/devices/:id/unassign
async function unassignDevice(req, res) {
  try {
    const { id } = req.params;
    const devCheck = await query('SELECT * FROM devices WHERE id = $1', [id]);
    if (devCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Device not found.' });
    }

    const now = new Date().toISOString();
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
        `Unassigned device ${devCheck.rows[0].unique_id}`,
        req.ip || '127.0.0.1'
      ]
    );

    return res.json({
      success: true,
      message: 'Device successfully unassigned.'
    });
  } catch (error) {
    console.error('unassignDevice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to unassign device.' });
  }
}

// GET /api/devices/:id/telemetry (Manufacturer)
async function getDeviceTelemetry(req, res) {
  try {
    const { id } = req.params;
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
    console.error('getDeviceTelemetry (Manufacturer) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve telemetry data.' });
  }
}

// ==========================================
// 4. OVERVIEW STATS (MANUFACTURER PANEL)
// ==========================================

// GET /api/stats/overview
async function getOverviewStats(req, res) {
  try {
    const totalDevRes = await query('SELECT COUNT(*) as count FROM devices');
    const availDevRes = await query("SELECT COUNT(*) as count FROM devices WHERE UPPER(status) IN ('AVAILABLE', 'ONLINE') AND customer_id IS NULL");
    const assignedDevRes = await query("SELECT COUNT(*) as count FROM devices WHERE customer_id IS NOT NULL");

    const totalCustRes = await query('SELECT COUNT(*) as count FROM customers');
    const activeCustRes = await query("SELECT COUNT(*) as count FROM customers WHERE UPPER(status) = 'ACTIVE'");
    const pendingCustRes = await query("SELECT COUNT(*) as count FROM customers WHERE UPPER(status) = 'PENDING_INVITE'");

    // Device models distribution
    const modelsRes = await query('SELECT model, COUNT(*) as count FROM devices GROUP BY model');

    // Recent devices
    const recentDevicesRes = await query(
      `SELECT d.*, COALESCE(u.name, 'Customer') as customer_name 
       FROM devices d
       LEFT JOIN customers c ON d.customer_id = c.id
       LEFT JOIN users u ON u.customer_id = c.id
       ORDER BY d.created_at DESC LIMIT 5`
    );

    // Recent activity logs from activity_logs
    const activityRes = await query(
      `SELECT a.id, a.user_id, a.action, a.details, a.ip_address, a.created_at, COALESCE(u.email, 'system') as user_email
       FROM activity_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC LIMIT 8`
    );

    return res.json({
      success: true,
      stats: {
        totalDevices: parseInt(totalDevRes.rows[0]?.count || 0),
        availableDevices: parseInt(availDevRes.rows[0]?.count || 0),
        assignedDevices: parseInt(assignedDevRes.rows[0]?.count || 0),
        totalCustomers: parseInt(totalCustRes.rows[0]?.count || 0),
        activeCustomers: parseInt(activeCustRes.rows[0]?.count || 0),
        pendingCustomers: parseInt(pendingCustRes.rows[0]?.count || 0),
        deviceModels: modelsRes.rows,
        recentDevices: recentDevicesRes.rows,
        recentActivity: activityRes.rows,
        database: getDatabaseStatus(),
        emailService: getEmailServiceStatus()
      }
    });
  } catch (error) {
    console.error('getOverviewStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve overview statistics.' });
  }
}

module.exports = {
  // Auth
  login,
  getMe,
  verifyInviteToken,
  setPassword,

  // Customers
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerDevices,
  getCustomerAssignedDevices: getCustomerDevices,
  resendInvite,
  assignDevicesToCustomer,

  // Devices
  getGeneratedDeviceId,
  getGeneratedId: getGeneratedDeviceId,
  getAllDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  assignDevice,
  unassignDevice,
  getDeviceTelemetry,

  // Stats
  getOverviewStats
};
