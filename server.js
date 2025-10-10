const express = require('express');
require('dotenv').config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const heroRoutes = require('./routes/heroRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const sellerAuthRoutes = require("./routes/sellerAuthRoutes");
const sellerOnboardingRoutes = require("./routes/sellerOnboardingRoutes");
const productRoutes = require("./routes/productRoutes"); 
const categoryRoutes = require("./routes/categoryRoutes"); 
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/users', authRoutes);
app.use('/api/hero', heroRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use("/api/seller/auth", sellerAuthRoutes);
app.use("/api/seller/onbording", sellerOnboardingRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);

// Centralized error handler
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
