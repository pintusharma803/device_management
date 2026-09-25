const express = require('express');
const router = express.Router();
const manufacturerController = require('../controllers/manufacturerPanelController');
const customerController = require('../controllers/customerPanelController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// Device ID generation helper (Manufacturer)
router.get('/generate-id', manufacturerController.getGeneratedDeviceId);

// Device CRUD & Operations (dispatches cleanly to customer or manufacturer controller)
router.get('/', (req, res, next) => {
  if (req.user && req.user.role === 'CUSTOMER') {
    return customerController.getAllDevices(req, res, next);
  }
  return manufacturerController.getAllDevices(req, res, next);
});

router.post('/', (req, res, next) => {
  if (req.user && req.user.role === 'CUSTOMER') {
    return customerController.createDevice(req, res, next);
  }
  return manufacturerController.createDevice(req, res, next);
});

router.get('/:id', (req, res, next) => {
  if (req.user && req.user.role === 'CUSTOMER') {
    return customerController.getDeviceById(req, res, next);
  }
  return manufacturerController.getDeviceById(req, res, next);
});

router.put('/:id', (req, res, next) => {
  if (req.user && req.user.role === 'CUSTOMER') {
    return customerController.updateDevice(req, res, next);
  }
  return manufacturerController.updateDevice(req, res, next);
});

router.delete('/:id', (req, res, next) => {
  if (req.user && req.user.role === 'CUSTOMER') {
    return customerController.deleteDevice(req, res, next);
  }
  return manufacturerController.deleteDevice(req, res, next);
});

// Assignment routes (Admin-only / Manufacturer)
router.post('/:id/assign', requireRole('ADMIN'), manufacturerController.assignDevice);
router.post('/:id/unassign', requireRole('ADMIN'), manufacturerController.unassignDevice);

// Telemetry
router.get('/:id/telemetry', (req, res, next) => {
  if (req.user && req.user.role === 'CUSTOMER') {
    return customerController.getDeviceTelemetry(req, res, next);
  }
  return manufacturerController.getDeviceTelemetry(req, res, next);
});

module.exports = router;
