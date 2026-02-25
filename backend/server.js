require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Setup
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Routes
const serviceRoutes = require('./routes/services');
const servicePriceRoutes = require('./routes/servicePrices');
app.use('/api/services', serviceRoutes);
app.use('/api/service-prices', servicePriceRoutes);

app.get('/', (req, res) => {
    res.send('Vehicle Service API is running (MongoDB)');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
