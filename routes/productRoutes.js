const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const upload = require("../middleware/upload"); // Your configured Multer instance
const { protect } = require("../middleware/authMiddleware"); // Your authentication middleware


router.post("/",protect,upload.array("images"), productController.createProduct);


router.put('/:id',productController.updateProduct);


router.get("/", protect, productController.getProducts);

// Public route for getting products by category (no auth required)
router.get("/category", productController.getProductsByCategory);




module.exports = router;