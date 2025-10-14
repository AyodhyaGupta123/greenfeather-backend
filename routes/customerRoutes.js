const express = require("express");
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {getCustomerMetrics , getCustomerTableData } = require('../controllers/coustomerController');


router.get("/metrics", protect, getCustomerMetrics);


router.get("/customers", protect , getCustomerTableData);


module.exports = router;