const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({});
    console.log(categories);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};




// Get subcategories by categoryId
exports.getSubcategories = async (req, res) => {
  try {
    const { categoryId } = req.params;
    console.log(req.params);
    console.log(categoryId);
    const subcategories = await Subcategory.find({ categoryId });
    res.json(subcategories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
