const express = require('express');
const router = express.Router();
const manufacturerController = require('../controllers/manufacturerPanelController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Public auth endpoints
router.post('/login', manufacturerController.login);
router.get('/verify-invite/:token', manufacturerController.verifyInviteToken);
router.post('/set-password', manufacturerController.setPassword);

// Protected routes (Admin / Manufacturer)
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

// Profile
router.get('/me', manufacturerController.getMe);

// Statistics
router.get('/stats/overview', manufacturerController.getOverviewStats);

// Customer Management
router.get('/customers', manufacturerController.getAllCustomers);
router.post('/customers', manufacturerController.createCustomer);
router.get('/customers/:id', manufacturerController.getCustomerById);
router.put('/customers/:id', manufacturerController.updateCustomer);
router.delete('/customers/:id', manufacturerController.deleteCustomer);
router.get('/customers/:id/devices', manufacturerController.getCustomerAssignedDevices);
router.post('/customers/:id/resend-invite', manufacturerController.resendInvite);
router.post('/customers/:id/assign-devices', manufacturerController.assignDevicesToCustomer);

// Device Management
router.get('/devices/generate-id', manufacturerController.getGeneratedDeviceId);
router.get('/devices', manufacturerController.getAllDevices);
router.post('/devices', manufacturerController.createDevice);
router.get('/devices/:id', manufacturerController.getDeviceById);
router.put('/devices/:id', manufacturerController.updateDevice);
router.delete('/devices/:id', manufacturerController.deleteDevice);
router.post('/devices/:id/assign', manufacturerController.assignDevice);
router.post('/devices/:id/unassign', manufacturerController.unassignDevice);
router.get('/devices/:id/telemetry', manufacturerController.getDeviceTelemetry);

module.exports = router;
