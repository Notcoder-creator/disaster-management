const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'your-secret-key-change-in-production';

mongoose.connect('mongodb://localhost:27017/disaster_management');

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' }
});

const incidentSchema = new mongoose.Schema({
  type: String,
  location: String,
  description: String,
  status: { type: String, default: 'active' },
  priority: { type: String, default: 'medium' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

const User = mongoose.model('User', userSchema);
const Incident = mongoose.model('Incident', incidentSchema);
const Resource = mongoose.model('Resource', resourceSchema);
const Alert = mongoose.model('Alert', alertSchema);

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Auth routes
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET);
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET);
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected routes
app.get('/api/dashboard', auth, async (req, res) => {
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

app.post('/api/emergency', auth, async (req, res) => {
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

app.get('/api/incidents', auth, async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ timestamp: -1 });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/incidents/:id', auth, async (req, res) => {
  try {
    const incident = await Incident.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initializeData();
});