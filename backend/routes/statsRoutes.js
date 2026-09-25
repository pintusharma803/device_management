const express = require('express');
const router = express.Router();
const manufacturerController = require('../controllers/manufacturerPanelController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/overview', manufacturerController.getOverviewStats);

module.exports = router;
