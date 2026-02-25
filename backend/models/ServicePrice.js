const mongoose = require('mongoose');

const ServicePriceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    price: {
        type: Number,
        required: true,
        default: 0
    },
    category: {
        type: String,
        enum: ['Service', 'Lubricant'],
        default: 'Service'
    }
});

module.exports = mongoose.model('ServicePrice', ServicePriceSchema);
