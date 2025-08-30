const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  type: String,
  location: String,
  description: String,
  status: { type: String, default: 'active' },
  priority: { type: String, default: 'medium' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Incident', incidentSchema);
