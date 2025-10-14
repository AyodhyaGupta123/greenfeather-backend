const Product = require("../models/Product");
const User = require("../models/User");
const Category = require("../models/Category");
const Subcategory = require("../models/Subcategory");
const mongoose = require("mongoose");

// Helper to generate unique SKU
const generateSKU = () => 'SKU-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

// Helper to safely parse JSON strings from FormData
const parseJSON = (data) => {
  if (!data) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
};

// --- CREATE PRODUCT ---
exports.createProduct = async (req, res) => {
  try {
    // 1️⃣ Authorization Check
    const sellerId = req.user?._id;
    if (!sellerId || req.user.role !== "seller") {
      return res.status(403).json({ success: false, message: "Unauthorized or not a seller" });
    }

    // 2️⃣ Parse Form Data
    const mainData = parseJSON(req.body.productData);
    const items = parseJSON(req.body.items);

    if (!mainData || typeof mainData !== 'object') {
      return res.status(400).json({ success: false, message: "Invalid product data format." });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Product must have at least one variant item." });
    }

    const {
      category: categoryId,
      subcategory: subcategoryName,
      productName,
      basicInfo,
      highlights,
      specifications,
      weight,
      warranty,
      returnPolicy,
      delivery,      // ✅ new field
      currency
    } = mainData;

    // Validation
    if (!categoryId || !subcategoryName || !basicInfo?.title) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (Category ID, Subcategory Name, or Basic Info Title)."
      });
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ success: false, message: "Invalid category ID format." });
    }

    // 3️⃣ Fetch Category & Subcategory
    const categoryDoc = await Category.findById(categoryId);
    if (!categoryDoc) {
      return res.status(400).json({ success: false, message: `Category not found with ID: ${categoryId}` });
    }

    const subcategoryDoc = await Subcategory.findOne({
      name: subcategoryName,
      categoryId: categoryDoc._id
    });
    if (!subcategoryDoc) {
      return res.status(400).json({
        success: false,
        message: `Subcategory '${subcategoryName}' not found or not linked to ${categoryDoc.name}.`
      });
    }

    // 4️⃣ Handle Uploaded Images (from Multer)
    const allFilePaths = req.files ? req.files.map(f => f.path || f.filename) : [];
    let fileCursor = 0;

    const parsedItems = items.map(item => {
      const expectedImageCount = item.images?.length || 0;
      const itemImages = allFilePaths
        .slice(fileCursor, fileCursor + expectedImageCount)
        .map(filePath => ({ url: filePath.replace(/\\/g, "/") }));

      fileCursor += expectedImageCount;

      const sizesWithSKU = item.sizes.map(size => ({
        ...size,
      }));

      return { ...item, images: itemImages, sizes: sizesWithSKU };
    });

    // 5️⃣ Create Product Document
    const product = new Product({
      sku: generateSKU(),
      seller: sellerId,
      category: categoryDoc._id,
      subcategory: subcategoryDoc._id,
      productName: productName || basicInfo.title,
      basicInfo,
      currency,
      items: parsedItems,
      highlights,
      specifications,
      weight,
      returnPolicy, // ✅ Added
      warranty,
      delivery, // ✅ Added new field
    });

    // 6️⃣ Save Product
    await product.save();

    res.status(201).json({ success: true, product });

  } catch (error) {
    console.error("Product creation failed:", error);
    const statusCode =
      error.name === "ValidationError" || error.message.includes("Cast to ObjectId failed")
        ? 400
        : 500;
    res.status(statusCode).json({
      success: false,
      message: "Server Error during product creation.",
      details: error.message,
    });
  }
};





exports.getProducts = async (req, res) => {
    try {
        const sellerId = req.user?._id; 
        if (!sellerId || req.user.role !== "seller") {
            return res.status(403).json({ success: false, message: "Unauthorized or not a seller" });
        }
        
        // Fetch all products owned by the current seller
        const products = await Product.find({ seller: sellerId })
            .populate('category', 'name') // Populate category name
            .populate('subcategory', 'name') // Populate subcategory name
            .sort({ createdAt: -1 }); // Show newest first

        if (!products || products.length === 0) {
            return res.status(200).json({ success: true, message: "No products found for this seller.", products: [] });
        }
        
        res.status(200).json({ success: true, count: products.length, products });

    } catch (error) {
        console.error("Fetching products failed:", error);
        res.status(500).json({ success: false, message: "Server Error while fetching products.", details: error.message });
    }
};







exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    // Optional: Add validation logic here before interacting with DB

    try {
        const product = await Product.findByIdAndUpdate(
            id, 
            { 
                ...updateData,
                updatedAt: new Date()
            }, 
            { 
                new: true, // Return the updated document
                runValidators: true 
            }
        ).lean();

        if (!product) {
            return res.status(404).json({ message: `Product not found with ID: ${id}` });
        }

        res.status(200).json(product);
    } catch (error) {
        console.error(`Error updating product ${id}:`, error);
        // Mongoose validation errors often result in a 400 status
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error while updating product.' });
    }
};

// GET PRODUCTS BY CATEGORY WITH PAGINATION


exports.getProductsByCategory = async (req, res) => {
    console.log("Received query:", req.query);
    try {
        const { categoryId, page = 1, limit = 20 } = req.query;
        
        // Validate categoryId
        if (!categoryId) {
            return res.status(400).json({ 
                success: false, 
                message: "Category ID is required" 
            });
        }

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid category ID format" 
            });
        }

        // Parse pagination parameters
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Find products by category with pagination
        const products = await Product.find({ category: categoryId })
            .populate('category', 'name')
            .populate('subcategory', 'name')
            .populate('seller', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        // Get total count for pagination
        const totalProducts = await Product.countDocuments({ category: categoryId });
        const totalPages = Math.ceil(totalProducts / limitNum);

        res.status(200).json({
            success: true,
            products,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalProducts,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1,
                limit: limitNum
            }
        });

    } catch (error) {
        console.error("Error fetching products by category:", error);
        res.status(500).json({ 
            success: false, 
            message: "Server error while fetching products by category",
            details: error.message 
        });
    }
};