const Product = require('../models/Product');

// GET /api/products
exports.getProducts = async (req, res, next) => {
  try {
    const { q, category, minPrice, maxPrice, sort, limit } = req.query;

    const filter = {};
    if (q) {
      filter.name = { $regex: q, $options: 'i' };
    }
    if (category) {
      filter.category = category;
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let mongoQuery = Product.find(filter);

    if (sort) {
      if (sort === 'price_asc') mongoQuery = mongoQuery.sort({ price: 1 });
      else if (sort === 'price_desc') mongoQuery = mongoQuery.sort({ price: -1 });
      else if (sort === 'newest') mongoQuery = mongoQuery.sort({ createdAt: -1 });
    }

    const lim = Math.min(Number(limit) || 0, 50) || undefined;
    if (lim) mongoQuery = mongoQuery.limit(lim);

    const products = await mongoQuery.exec();
    res.json(products);
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
};


