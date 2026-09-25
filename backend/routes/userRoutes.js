const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerPanelController');
const { authenticateToken } = require('../middleware/auth');

router.put('/profile', authenticateToken, customerController.updateProfile);
router.put('/password', authenticateToken, customerController.changePassword);
router.put('/two-factor', authenticateToken, customerController.toggleTwoFactor);

module.exports = router;
