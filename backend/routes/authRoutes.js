const express = require('express');
const router = express.Router();
const manufacturerController = require('../controllers/manufacturerPanelController');
const customerController = require('../controllers/customerPanelController');
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/db');

// Unified Login (handles both Manufacturer / Admin and Customer)
router.post('/login', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const check = await query('SELECT role FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (check.rows.length > 0 && check.rows[0].role === 'CUSTOMER') {
      return customerController.login(req, res, next);
    }
    return manufacturerController.login(req, res, next);
  } catch (err) {
    return next(err);
  }
});

// Dedicated Login Endpoints
router.post('/manufacturer/login', manufacturerController.login);
router.post('/customer/login', customerController.login);

// Current User Profile
router.get('/me', authenticateToken, (req, res, next) => {
  if (req.user && req.user.role === 'CUSTOMER') {
    return customerController.getMe(req, res, next);
  }
  return manufacturerController.getMe(req, res, next);
});

// Customer Panel Auth Endpoints
router.post('/register', customerController.register);
router.post('/verify-otp', customerController.verifyOtp);
router.post('/resend-otp', customerController.resendOtp);
router.post('/forgot-password', customerController.forgotPassword);
router.post('/reset-password', customerController.resetPassword);

// Manufacturer Panel Invitation Endpoints
router.get('/verify-invite/:token', manufacturerController.verifyInviteToken);
router.post('/set-password', manufacturerController.setPassword);

module.exports = router;
