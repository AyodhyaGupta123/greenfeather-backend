const Product = require("../models/Product");
const User = require("../models/User"); // Assuming you have this model
const Category = require("../models/Category"); // Assuming you have this model
const Subcategory = require("../models/Subcategory"); // Assuming you have this model
const mongoose = require("mongoose");

// Helper to generate a unique SKU
const generateSKU = () => 'SKU-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

// Helper to safely parse JSON strings from FormData
const parseJSON = (data) => {
    if (!data) return null;
    if (typeof data === "string") {
        try {
            return JSON.parse(data);
        } catch {
            return data; // Return original data if JSON parsing fails
        }
    }
    return data;
};

// CREATE PRODUCT
exports.createProduct = async (req, res) => {
    try {
        // --- 1. Authorization Check ---
        // req.user is populated by your authentication middleware (e.g., JWT)
        const sellerId = req.user?._id; 
        if (!sellerId || req.user.role !== "seller") {
            return res.status(403).json({ success: false, message: "Unauthorized or not a seller" });
        }

        // --- 2. Parse FormData ---
        const mainData = parseJSON(req.body.productData); // Contains all non-variant fields
        let items = parseJSON(req.body.items); // Contains variant data and image placeholders
        
        // Basic data validation
        if (!mainData || typeof mainData !== 'object') {
             return res.status(400).json({ success: false, message: "Invalid product data format." });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: "Product must have at least one variant item." });
        }
        
        // Destructure fields, treating the incoming 'category' as 'categoryId'
        const { 
            category: categoryId, // ✅ Incoming field is ID
            subcategory: subcategoryName, // Incoming field is Name
            productName, 
            basicInfo, 
            highlights, 
            specifications, 
            weight, 
            warranty, 
            returnPolicy, 
            currency 
        } = mainData;

        // Stronger Validation check for essential fields
        if (!categoryId || !subcategoryName || !basicInfo?.title) {
            return res.status(400).json({ success: false, message: "Missing required fields (Category ID, Subcategory Name, or Basic Info Title)." });
        }

        // Ensure categoryId is a valid ObjectId format before query
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
             return res.status(400).json({ success: false, message: "Invalid category ID format." });
        }

        // --- 3. Fetch Category & Subcategory IDs ---
        
        // 1. Find Category by ID
        const categoryDoc = await Category.findById(categoryId); 
        
        if (!categoryDoc) {
            return res.status(400).json({ success: false, message: `Category not found with ID: ${categoryId}` });
        }

        // 2. Find Subcategory by Name and Category ID
        const subcategoryDoc = await Subcategory.findOne({ 
            name: subcategoryName, 
            categoryId: categoryDoc._id // Ensures proper linkage
        });
        
        if (!subcategoryDoc) {
            // Use categoryDoc.name for the error message (Fixes the 'categoryName is not defined' error)
            return res.status(400).json({ 
                success: false, 
                message: `Subcategory '${subcategoryName}' not found or not linked to ${categoryDoc.name}.`
            });
        }

        // --- 4. Attach Uploaded Images to Items ---
        // 'req.files' comes from multer and holds the actual uploaded image file info.
        const allFilePaths = req.files ? req.files.map(f => f.path || f.filename) : [];
        let fileCursor = 0;
        
        const parsedItems = items.map(item => {
            // item.images holds the COUNT of files expected for this item (sent by the frontend)
            const expectedImageCount = item.images?.length || 0; 
            
            // Slice the uploaded file paths based on the expected count for THIS item
            const itemImages = allFilePaths
                .slice(fileCursor, fileCursor + expectedImageCount)
                .map(filePath => ({ url: filePath.replace(/\\/g, "/") })); // Normalize path separators
            
            fileCursor += expectedImageCount;

            // Generate temporary SKUs for size variants if the 'info' field is empty
            const sizesWithSKU = item.sizes.map(size => ({
                ...size,
                // You might use size.info as the SKU, but if not, ensure all required fields are present
            }));

            return { ...item, images: itemImages, sizes: sizesWithSKU };
        });
        
        // --- 5. Create & Save Product ---
        const product = new Product({
            sku: generateSKU(), 
            seller: sellerId,
            category: categoryDoc._id,
            subcategory: subcategoryDoc._id,
            
            // Use the provided productName or fallback to basicInfo.title
            productName: productName || basicInfo.title, 
            
            basicInfo,
            currency,
            items: parsedItems,
            highlights,
            specifications,
            weight,
            returnPolicy,
            warranty,
        });

        await product.save();

        res.status(201).json({ success: true, product });

    } catch (error) {
        console.error("Product creation failed:", error);
        // Determine status code based on error type
        const statusCode = error.name === 'ValidationError' || error.message.includes('Cast to ObjectId failed') ? 400 : 500;
        res.status(statusCode).json({ 
            success: false, 
            message: "Server Error during product creation.",
            // IMPORTANT: Exposing error.message helps during development but should be removed in production
            details: error.message 
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
