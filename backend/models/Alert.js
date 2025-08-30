const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  message: String,
  type: String,
  zone: String,
  status: { type: String, default: 'active' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', alertSchema);
