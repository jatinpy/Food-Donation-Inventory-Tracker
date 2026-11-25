require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Donation = require('./models/donations');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

// Donor Schema (stored in MongoDB alongside Donations)
const donorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, required: true },
  organizationType: { type: String, default: 'Commercial Kitchen' },
  createdAt: { type: Date, default: Date.now }
});
const Donor = mongoose.model('Donor', donorSchema);

// Time-Decay & Urgency Calculator
function calculateDecayMetrics(item) {
  const now = Date.now();
  const prepTime = new Date(item.preparedAt).getTime();
  const expiryTime = prepTime + item.shelfLifeHours * 3600000;
  const remainingMs = expiryTime - now;
  const remainingHours = Math.max(0, remainingMs / 3600000);
  const decayRatio = remainingHours / item.shelfLifeHours;

  let urgency = 'FRESH';
  if (remainingHours <= 0) urgency = 'EXPIRED';
  else if (remainingHours <= 2) urgency = 'CRITICAL';
  else if (remainingHours <= 6) urgency = 'URGENT';

  return {
    ...item.toObject(),
    remainingHours: Number(remainingHours.toFixed(2)),
    decayPercent: Math.round((1 - Math.min(1, decayRatio)) * 100),
    urgency
  };
}

// --- DONATIONS & INVENTORY ROUTES ---
app.get('/api/donations', async (req, res) => {
  try {
    const batches = await Donation.find();
    const enriched = batches.map(calculateDecayMetrics);
    enriched.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Active' ? -1 : 1;
      return a.remainingHours - b.remainingHours;
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/donations', async (req, res) => {
  try {
    const newDonation = new Donation({
      ...req.body,
      preparedAt: new Date()
    });
    await newDonation.save();
    res.status(201).json(calculateDecayMetrics(newDonation));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/donations/:id/dispatch', async (req, res) => {
  try {
    const updated = await Donation.findByIdAndUpdate(
      req.params.id,
      { status: 'Dispatched' },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/donations/:id', async (req, res) => {
  try {
    await Donation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- DONOR DIRECTORY ROUTES ---
app.get('/api/donors', async (req, res) => {
  try {
    const donors = await Donor.find().sort({ createdAt: -1 });
    res.json(donors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/donors', async (req, res) => {
  try {
    const donor = new Donor(req.body);
    await donor.save();
    res.status(201).json(donor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/donors/:id', async (req, res) => {
  try {
    await Donor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Donor removed' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));