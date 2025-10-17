
const express = require('express');
const { getSellerDashboardData } = require('../controllers/sellerDashbordController');

const { protect} = require('../middleware/authMiddleware'); 

const router = express.Router();

router.get('/seller',protect, getSellerDashboardData);

module.exports = router;