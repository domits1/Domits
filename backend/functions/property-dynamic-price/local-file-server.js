import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Data file path
const DATA_FILE = path.join(__dirname, 'calendar-data.json');

// Initialize data file if it doesn't exist
function initDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
    console.log('Created calendar-data.json');
  }
}

// Read data from file
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

// Write data to file
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json());

// GET - Load calendar data for a property
app.get('/api/calendar-data/:propertyId', (req, res) => {
  const { propertyId } = req.params;
  console.log(`\n📥 GET calendar data for property: ${propertyId}`);

  const allData = readData();
  const propertyData = allData[propertyId] || {
    blocked: [],
    maintenance: [],
    pricing: {}
  };

  console.log('📤 Returning:', propertyData);
  res.json(propertyData);
});

// GET - Load calendar data (query param version)
app.get('/api/calendar-data', (req, res) => {
  const propertyId = req.query.property;
  console.log(`\n📥 GET calendar data for property: ${propertyId}`);

  if (!propertyId) {
    return res.status(400).json({ message: 'Property ID required' });
  }

  const allData = readData();
  const propertyData = allData[propertyId] || {
    blocked: [],
    maintenance: [],
    pricing: {}
  };

  console.log('📤 Returning:', propertyData);
  res.json(propertyData);
});

// POST - Save calendar data
app.post('/api/calendar-data', (req, res) => {
  const { propertyId, availability, pricing } = req.body;
  console.log(`\n📥 POST save calendar data for property: ${propertyId}`);
  console.log('Body:', JSON.stringify(req.body, null, 2));

  if (!propertyId) {
    return res.status(400).json({ message: 'Property ID required' });
  }

  const allData = readData();

  // Initialize property data if not exists
  if (!allData[propertyId]) {
    allData[propertyId] = {
      blocked: [],
      maintenance: [],
      pricing: {}
    };
  }

  // Update availability if provided
  if (availability) {
    allData[propertyId].blocked = availability.blocked || [];
    allData[propertyId].maintenance = availability.maintenance || [];
  }

  // Update pricing if provided
  if (pricing) {
    allData[propertyId].pricing = pricing;
  }

  // Save to file
  writeData(allData);

  console.log('✅ Saved successfully!');
  console.log('📤 Response:', allData[propertyId]);

  res.json({
    message: 'Calendar data saved successfully',
    availability: {
      success: true,
      blockedCount: allData[propertyId].blocked.length,
      maintenanceCount: allData[propertyId].maintenance.length
    },
    pricing: {
      success: true,
      priceCount: Object.keys(allData[propertyId].pricing).length
    }
  });
});

// PATCH - Update calendar data (same as POST)
app.patch('/api/calendar-data', (req, res) => {
  const { propertyId, availability, pricing } = req.body;
  console.log(`\n📥 PATCH update calendar data for property: ${propertyId}`);

  if (!propertyId) {
    return res.status(400).json({ message: 'Property ID required' });
  }

  const allData = readData();

  if (!allData[propertyId]) {
    allData[propertyId] = {
      blocked: [],
      maintenance: [],
      pricing: {}
    };
  }

  if (availability) {
    allData[propertyId].blocked = availability.blocked || [];
    allData[propertyId].maintenance = availability.maintenance || [];
  }

  if (pricing) {
    allData[propertyId].pricing = pricing;
  }

  writeData(allData);

  console.log('✅ Updated successfully!');

  res.json({
    message: 'Calendar data updated successfully',
    data: allData[propertyId]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Local file server is running',
    dataFile: DATA_FILE,
    timestamp: new Date().toISOString()
  });
});

// View all data (for debugging)
app.get('/api/all-data', (req, res) => {
  const allData = readData();
  res.json(allData);
});

// Initialize and start server
initDataFile();

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 LOCAL FILE SERVER STARTED');
  console.log('='.repeat(60));
  console.log(`\n📍 Server: http://localhost:${PORT}`);
  console.log(`📍 Data saved to: ${DATA_FILE}`);
  console.log('\n📝 Endpoints:');
  console.log(`   GET  /api/calendar-data?property=ID  - Load data`);
  console.log(`   POST /api/calendar-data              - Save data`);
  console.log(`   GET  /api/all-data                   - View all data`);
  console.log(`   GET  /health                         - Health check`);
  console.log('\n' + '='.repeat(60));
  console.log('✅ Ready! Data will be saved to calendar-data.json');
  console.log('='.repeat(60) + '\n');
});
