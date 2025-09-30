const express = require('express');
require('dotenv').config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');
const morgan = require('morgan')
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/users', authRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
