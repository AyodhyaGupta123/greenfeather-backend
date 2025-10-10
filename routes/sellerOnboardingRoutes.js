const express = require("express");
const router = express.Router();
const sellerController = require("../controllers/sellerOnboardingController");
const { protect } = require("../middleware/authMiddleware");

router.post("/step1/tax", protect, sellerController.submitTaxDetails);
router.post("/step2/store", protect, sellerController.submitStoreName);
router.post("/step3/shipping", protect, sellerController.submitPickupAddress);
router.post("/step4/bank", protect, sellerController.submitBankDetails);

router.get("/profile", protect, sellerController.getProfile);

module.exports = router;
