const express = require('express');
const Resource = require('../models/Resource');

const router = express.Router();

// GET all resources
router.get('/', async (req, res) => {
  try {
    const resources = await Resource.find();
    res.json({ success: true, data: resources });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE a resource
router.post('/', async (req, res) => {
  try {
    const { type, available, total } = req.body;
    if (!type || total == null) {
      return res.status(400).json({ error: "Type and total are required" });
    }

    const resource = new Resource({ type, available, total });
    await resource.save();
    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE a resource
router.put('/:id', async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    res.json({ success: true, data: resource });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a resource
router.delete('/:id', async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    res.json({ success: true, message: 'Resource deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
