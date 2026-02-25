const mongoose = require('mongoose');
const Counter = require('./Counter');

const ServiceSchema = new mongoose.Schema({
    serviceId: {
        type: Number,
        unique: true
    },
    vehicleName: {
        type: String,
        required: true
    },
    vehicleNumber: String,
    ownerName: {
        type: String,
        required: true
    },
    customerNumber: String,
    serviceType: {
        type: [{
            name: { type: String, required: true },
            category: { type: String, default: 'Service' },
            quantity: { type: Number, default: 1 },
            unitPrice: { type: Number, default: 0 }
        }],
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Ready', 'Completed'],
        default: 'Pending'
    },
    date: {
        type: Date,
        default: Date.now
    },
    notes: String,
    // Billing Fields
    billing: {
        partsCost: { type: Number, default: 0 },
        laborCost: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        extraServiceCost: { type: Number, default: 0 },
        extraServiceNotes: { type: String, default: '' },
        paymentStatus: {
            type: String,
            enum: ['Unpaid', 'Paid'],
            default: 'Unpaid'
        }
    }
});

ServiceSchema.pre('save', async function () {
    if (this.isNew) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { id: 'serviceId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.serviceId = counter.seq;
        } catch (error) {
            throw error;
        }
    }
});

module.exports = mongoose.model('Service', ServiceSchema);

