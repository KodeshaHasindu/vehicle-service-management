const express = require('express');
const router = express.Router();
const ServicePrice = require('../models/ServicePrice');

// GET all service prices
router.get('/', async (req, res) => {
    try {
        const prices = await ServicePrice.find();
        res.json(prices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST new service price
router.post('/', async (req, res) => {
    const { name, price, category } = req.body;
    try {
        const newPrice = new ServicePrice({ name, price, category });
        await newPrice.save();
        res.status(201).json(newPrice);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE service price
router.delete('/:id', async (req, res) => {
    try {
        await ServicePrice.findByIdAndDelete(req.params.id);
        res.json({ message: 'Service price deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
