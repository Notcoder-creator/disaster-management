const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));
// Only serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/disaster_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Schemas
const incidentSchema = new mongoose.Schema({
  type: String,
  location: String,
  description: String,
  status: { type: String, default: 'active' },
  priority: { type: String, default: 'medium' },
  timestamp: { type: Date, default: Date.now }
});

const resourceSchema = new mongoose.Schema({
  type: String,
  available: Number,
  total: Number,
  location: String
});

const alertSchema = new mongoose.Schema({
  message: String,
  type: String,
  zone: String,
  status: { type: String, default: 'active' },
  timestamp: { type: Date, default: Date.now }
});

const Incident = mongoose.model('Incident', incidentSchema);
const Resource = mongoose.model('Resource', resourceSchema);
const Alert = mongoose.model('Alert', alertSchema);

// Initialize default data
const initializeData = async () => {
  const resourceCount = await Resource.countDocuments();
  if (resourceCount === 0) {
    await Resource.insertMany([
      { type: 'ambulance', available: 12, total: 15, location: 'Central Station' },
      { type: 'fire_truck', available: 8, total: 12, location: 'Fire Station 1' },
      { type: 'rescue_team', available: 5, total: 8, location: 'Rescue HQ' },
      { type: 'shelter', available: 6, total: 10, location: 'Various' }
    ]);
  }

  const alertCount = await Alert.countDocuments();
  if (alertCount === 0) {
    await Alert.create({
      message: 'Flood Warning - Zone 3',
      type: 'flood',
      zone: 'Zone 3',
      status: 'active'
    });
  }
};

// Routes
app.get('/api/dashboard', async (req, res) => {
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

app.post('/api/emergency', async (req, res) => {
  try {
    const { type, location, description, priority } = req.body;
    const incident = new Incident({ type, location, description, priority });
    await incident.save();
    res.json({ success: true, incidentId: incident._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/incidents', async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ timestamp: -1 });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/incidents/:id', async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Only serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeData();
});