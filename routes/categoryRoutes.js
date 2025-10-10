const express = require("express");
const router = express.Router();
const { getCategories, getSubcategories } = require("../controllers/categoryController");


router.get("/", getCategories);



router.get("/:categoryId/subcategories", getSubcategories);

module.exports = router;
