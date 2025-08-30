const express = require('express');
const Incident = require('../models/Incident');
const Resource = require('../models/Resource');
const Alert = require('../models/Alert');

const router = express.Router();

// Dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const alerts = await Alert.find({ status: 'active' });
    const resources = await Resource.find();
    const activeIncidents = await Incident.countDocuments({ status: 'active' });
    const recentIncidents = await Incident.find().sort({ timestamp: -1 }).limit(5);

    const zones = [
      { id: 1, name: 'Zone 1', status: 'safe' },
      { id: 2, name: 'Zone 2', status: 'watch' },
      { id: 3, name: 'Zone 3', status: 'evacuate' }
    ];

    res.json({
      alerts,
      zones,
      resources: {
        ambulances: resources.find(r => r.type === 'ambulance') || { available: 0, total: 0 },
        fireTrucks: resources.find(r => r.type === 'fire_truck') || { available: 0, total: 0 },
        rescueTeams: resources.find(r => r.type === 'rescue_team') || { available: 0, total: 0 },
        shelters: resources.find(r => r.type === 'shelter') || { available: 0, total: 0 }
      },
      activeIncidents,
      recentUpdates: recentIncidents.map(i => ({
        id: i._id,
        message: `${i.type} reported at ${i.location}`,
        timestamp: i.timestamp
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report an emergency
router.post('/emergency', async (req, res) => {
  try {
    const { type, location, description, priority } = req.body;
    const incident = new Incident({
      type,
      location,
      description,
      priority,
      reportedBy: req.user.userId
    });
    await incident.save();
    res.json({ success: true, incidentId: incident._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get incidents
router.get('/incidents', async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { reportedBy: req.user.userId };
    const incidents = await Incident.find(query).sort({ timestamp: -1 });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update incident
router.put('/incidents/:id', async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
