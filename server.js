const express = require('express');
require('dotenv').config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const heroRoutes = require('./routes/heroRoutes');
const cors = require('cors');
const morgan = require('morgan')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
connectDB();

const app = express();
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json());

app.use('/api/users', authRoutes);
app.use('/api/hero', heroRoutes);

// Centralized error handler
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
