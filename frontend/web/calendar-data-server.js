/**
 * Local Development Server for Calendar Data Persistence
 *
 * This server provides REST endpoints to save and load calendar data (pricing, blocked dates, maintenance)
 * to/from JSON files. This allows data to persist across sessions and be shared via Git.
 *
 * Run: node calendar-data-server.js
 *
 * Endpoints:
 * - GET /api/calendar-data/:propertyId - Load calendar data for a property
 * - POST /api/calendar-data/:propertyId - Save calendar data for a property
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'calendar-data');

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log(`✅ Created data directory: ${DATA_DIR}`);
  }
}

// Helper function to get file path for property
function getFilePath(propertyId) {
  return path.join(DATA_DIR, `${propertyId}.json`);
}

// GET /api/calendar-data/:propertyId
// Load calendar data for a property
app.get('/api/calendar-data/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const filePath = getFilePath(propertyId);

    console.log(`📖 Loading calendar data for property: ${propertyId}`);

    try {
      const data = await fs.readFile(filePath, 'utf8');
      const calendarData = JSON.parse(data);

      console.log(`✅ Successfully loaded data for property: ${propertyId}`);

      res.json({
        success: true,
        data: calendarData,
        propertyId
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet, return empty data
        console.log(`ℹ️  No saved data found for property: ${propertyId}`);
        res.json({
          success: true,
          data: {
            blocked: [],
            maintenance: [],
            prices: {}
          },
          propertyId
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Error loading calendar data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/calendar-data/:propertyId
// Save calendar data for a property
app.post('/api/calendar-data/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { blocked, maintenance, prices } = req.body;

    if (!blocked && !maintenance && !prices) {
      return res.status(400).json({
        success: false,
        error: 'No data provided. Please provide blocked, maintenance, or prices.'
      });
    }

    const filePath = getFilePath(propertyId);

    console.log(`💾 Saving calendar data for property: ${propertyId}`);
    console.log(`   - Blocked dates: ${blocked?.length || 0}`);
    console.log(`   - Maintenance entries: ${maintenance?.length || 0}`);
    console.log(`   - Pricing entries: ${Object.keys(prices || {}).length}`);

    // Load existing data
    let existingData = {
      blocked: [],
      maintenance: [],
      prices: {}
    };

    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      existingData = JSON.parse(fileContent);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('⚠️  Error reading existing file, starting fresh:', error.message);
      }
    }

    // Merge with existing data
    const updatedData = {
      blocked: blocked || existingData.blocked,
      maintenance: maintenance || existingData.maintenance,
      prices: prices ? { ...existingData.prices, ...prices } : existingData.prices,
      lastUpdated: new Date().toISOString(),
      propertyId
    };

    // Save to file
    await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2), 'utf8');

    console.log(`✅ Successfully saved calendar data for property: ${propertyId}`);
    console.log(`   File: ${filePath}`);

    res.json({
      success: true,
      message: 'Calendar data saved successfully',
      data: updatedData,
      propertyId
    });
  } catch (error) {
    console.error('❌ Error saving calendar data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/calendar-data/:propertyId
// Clear calendar data for a property
app.delete('/api/calendar-data/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    const filePath = getFilePath(propertyId);

    console.log(`🗑️  Deleting calendar data for property: ${propertyId}`);

    await fs.unlink(filePath);

    console.log(`✅ Successfully deleted data for property: ${propertyId}`);

    res.json({
      success: true,
      message: 'Calendar data deleted successfully',
      propertyId
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({
        success: true,
        message: 'No data to delete',
        propertyId: req.params.propertyId
      });
    } else {
      console.error('❌ Error deleting calendar data:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

// GET /api/calendar-data
// List all properties with saved calendar data
app.get('/api/calendar-data', async (req, res) => {
  try {
    console.log(`📋 Listing all saved calendar data`);

    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const properties = jsonFiles.map(f => f.replace('.json', ''));

    console.log(`✅ Found ${properties.length} properties with saved data`);

    res.json({
      success: true,
      properties,
      count: properties.length
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({
        success: true,
        properties: [],
        count: 0
      });
    } else {
      console.error('❌ Error listing calendar data:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  await ensureDataDir();

  app.listen(PORT, () => {
    console.log('\n🚀 Calendar Data Server Started!');
    console.log(`📍 Server running on: http://localhost:${PORT}`);
    console.log(`📁 Data directory: ${DATA_DIR}`);
    console.log('\n📚 Available endpoints:');
    console.log(`   GET    http://localhost:${PORT}/api/calendar-data/:propertyId`);
    console.log(`   POST   http://localhost:${PORT}/api/calendar-data/:propertyId`);
    console.log(`   DELETE http://localhost:${PORT}/api/calendar-data/:propertyId`);
    console.log(`   GET    http://localhost:${PORT}/api/calendar-data (list all)`);
    console.log(`   GET    http://localhost:${PORT}/health (health check)`);
    console.log('\n✨ Ready to save calendar data!\n');
  });
}

startServer().catch(console.error);
