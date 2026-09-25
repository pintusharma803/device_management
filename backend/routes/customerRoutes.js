const express = require('express');
const router = express.Router();
const manufacturerController = require('../controllers/manufacturerPanelController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

// Admin-only customer operations (Manufacturer Panel)
router.get('/', requireRole('ADMIN'), manufacturerController.getAllCustomers);
router.post('/', requireRole('ADMIN'), manufacturerController.createCustomer);
router.get('/:id', manufacturerController.getCustomerById);
router.put('/:id', requireRole('ADMIN'), manufacturerController.updateCustomer);
router.delete('/:id', requireRole('ADMIN'), manufacturerController.deleteCustomer);
router.post('/:id/resend-invite', requireRole('ADMIN'), manufacturerController.resendInvite);
router.get('/:id/devices', manufacturerController.getCustomerAssignedDevices);
router.post('/:id/assign-devices', requireRole('ADMIN'), manufacturerController.assignDevicesToCustomer);

module.exports = router;
