const express = require('express');
const User = require('../models/User');
const Incident = require('../models/Incident');
const Resource = require('../models/Resource');
const Alert = require('../models/Alert');

const router = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalIncidents = await Incident.countDocuments();
    const activeIncidents = await Incident.countDocuments({ status: 'active' });
    const resolvedIncidents = await Incident.countDocuments({ status: 'resolved' });
    const totalResources = await Resource.countDocuments();
    const totalAlerts = await Alert.countDocuments({ status: 'active' });

    res.json({
      stats: {
        totalUsers,
        totalIncidents,
        activeIncidents,
        resolvedIncidents,
        totalResources,
        totalAlerts
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/incidents', async (req, res) => {
  try {
    const incidents = await Incident.find()
      .populate('reportedBy', 'name email')
      .sort({ timestamp: -1 });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
