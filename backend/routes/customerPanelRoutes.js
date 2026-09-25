const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerPanelController');
const { authenticateToken } = require('../middleware/auth');

// Public auth endpoints
router.post('/login', customerController.login);
router.post('/register', customerController.register);
router.post('/verify-otp', customerController.verifyOtp);
router.post('/resend-otp', customerController.resendOtp);
router.post('/forgot-password', customerController.forgotPassword);
router.post('/reset-password', customerController.resetPassword);

// Protected routes (Customer)
router.use(authenticateToken);

// Profile & Account Settings
router.get('/me', customerController.getMe);
router.put('/profile', customerController.updateProfile);
router.put('/password', customerController.changePassword);
router.put('/two-factor', customerController.toggleTwoFactor);

// Dashboard
router.get('/dashboard/summary', customerController.getDashboardSummary);

// Devices
router.get('/devices', customerController.getAllDevices);
router.post('/devices', customerController.createDevice);
router.get('/devices/:id', customerController.getDeviceById);
router.put('/devices/:id', customerController.updateDevice);
router.delete('/devices/:id', customerController.deleteDevice);
router.get('/devices/:id/telemetry', customerController.getDeviceTelemetry);

module.exports = router;
