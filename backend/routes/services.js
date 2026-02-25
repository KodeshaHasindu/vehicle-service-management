const express = require('express');
const router = express.Router();

// GET all services
const Service = require('../models/Service');

// GET all services
router.get('/', async (req, res) => {
    try {
        const services = await Service.find().sort({ date: -1 });
        res.json(services);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error', message: err.message });
    }
});

// POST new service
router.post('/', async (req, res) => {
    const { vehicleName, vehicleNumber, ownerName, customerNumber, serviceType, notes } = req.body;

    try {
        const newService = new Service({
            vehicleName,
            vehicleNumber,
            ownerName,
            customerNumber,
            serviceType,
            notes,
            status: 'Pending'
        });

        const service = await newService.save();
        res.json(service);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error', message: err.message });
    }
});

// PUT update service
router.put('/:id', async (req, res) => {
    const { status, notes, vehicleNumber, customerNumber, vehicleName, ownerName, serviceType, billing } = req.body;

    // Build object with fields to update
    const serviceFields = {};
    if (status) serviceFields.status = status;
    if (notes !== undefined) serviceFields.notes = notes;
    if (vehicleNumber !== undefined) serviceFields.vehicleNumber = vehicleNumber;
    if (customerNumber !== undefined) serviceFields.customerNumber = customerNumber;
    if (vehicleName) serviceFields.vehicleName = vehicleName;
    if (ownerName) serviceFields.ownerName = ownerName;
    if (serviceType) serviceFields.serviceType = serviceType;

    // Handle Billing Updates
    if (billing) {
        // We use dot notation for nested updates in Mongoose to avoid overwriting the whole object
        if (billing.partsCost !== undefined) serviceFields['billing.partsCost'] = billing.partsCost;
        if (billing.laborCost !== undefined) serviceFields['billing.laborCost'] = billing.laborCost;
        if (billing.discount !== undefined) serviceFields['billing.discount'] = billing.discount;
        if (billing.extraServiceCost !== undefined) serviceFields['billing.extraServiceCost'] = billing.extraServiceCost;
        if (billing.extraServiceNotes !== undefined) serviceFields['billing.extraServiceNotes'] = billing.extraServiceNotes;
        if (billing.paymentStatus !== undefined) serviceFields['billing.paymentStatus'] = billing.paymentStatus;
    }

    try {
        let service = await Service.findById(req.params.id);

        if (!service) return res.status(404).json({ msg: 'Service not found' });

        service = await Service.findByIdAndUpdate(
            req.params.id,
            { $set: serviceFields },
            { new: true }
        );

        res.json(service);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error', message: err.message });
    }
});

// DELETE service
router.delete('/:id', async (req, res) => {
    try {
        let service = await Service.findById(req.params.id);

        if (!service) return res.status(404).json({ msg: 'Service not found' });

        await Service.findByIdAndDelete(req.params.id);

        res.json({ msg: 'Service removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error', message: err.message });
    }
});

module.exports = router;
