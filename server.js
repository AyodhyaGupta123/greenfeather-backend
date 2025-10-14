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
const adminRoutes = require('./routes/adminRoutes');
const unifiedAuthRoutes = require('./routes/unifiedAuthRoutes');
const adminManagementRoutes = require('./routes/adminManagementRoutes'); 
const customerRoutes = require('./routes/customerRoutes');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

connectDB();

const app = express();

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',') : 
      [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175'
      ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};


// Middleware
app.use(cors(corsOptions));
app.use(helmet());
app.use(compression());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
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
app.use('/api/admin', adminRoutes);
app.use('/api/auth', unifiedAuthRoutes);
app.use('/api/coustomer', customerRoutes);
app.use('/api/admin-management', adminManagementRoutes);

// Centralized error handler
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
