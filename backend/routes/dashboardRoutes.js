const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerPanelController');
const { authenticateToken } = require('../middleware/auth');

router.get('/summary', authenticateToken, customerController.getDashboardSummary);

module.exports = router;
