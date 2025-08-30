const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const { MONGODB_URI, PORT } = require('./config');
const auth = require('./middleware/auth');
const adminAuth = require('./middleware/admin');

const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const resourceRoutes = require('./routes/resources');
const alertRoutes = require('./routes/alerts');
const adminRoutes = require('./routes/admin');

const User = require('./models/user');
const Resource = require('./models/Resource');
const Alert = require('./models/Alert');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api', authRoutes);
app.use('/api', auth, incidentRoutes);
app.use('/api/admin/resources', auth, adminAuth, resourceRoutes);
app.use('/api/admin/alerts', auth, adminAuth, alertRoutes);
app.use('/api/admin', auth, adminAuth, adminRoutes);

// Initialize default data
const initializeData = async () => {
  try {
    const resourceCount = await Resource.countDocuments();
    if (resourceCount === 0) {
      await Resource.insertMany([
        { type: 'ambulance', available: 12, total: 15, location: 'Central Station' },
        { type: 'fire_truck', available: 8, total: 12, location: 'Fire Station 1' },
        { type: 'rescue_team', available: 5, total: 8, location: 'Rescue HQ' },
        { type: 'shelter', available: 6, total: 10, location: 'Various' }
      ]);
      console.log('🚑 Default resources added');
    }

    const alertCount = await Alert.countDocuments();
    if (alertCount === 0) {
      await Alert.create({
        message: 'Flood Warning - Zone 3',
        type: 'flood',
        zone: 'Zone 3',
        status: 'active'
      });
      console.log('⚠️ Default alert created');
    }

    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Admin User',
        email: 'admin@disaster.com',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('👤 Default admin created: admin@disaster.com / admin123');
    }
  } catch (error) {
    console.error('❌ Error initializing data:', error.message);
  }
};

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await initializeData();
});
