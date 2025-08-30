const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  type: String,
  available: Number,
  total: Number,
  location: String
});

module.exports = mongoose.model('Resource', resourceSchema);
