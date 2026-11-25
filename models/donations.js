const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  mealName: { type: String, required: true },
  donorName: { type: String, required: true },
  quantityKg: { type: Number, required: true },
  storageType: { type: String, default: 'Refrigerated' },
  shelfLifeHours: { type: Number, required: true },
  preparedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'Active' },
  targetShelter: { type: String, default: 'Sector-14 Soup Kitchen' }
});

module.exports = mongoose.model('Donation', donationSchema);