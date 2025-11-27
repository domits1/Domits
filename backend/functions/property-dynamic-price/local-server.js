import express from 'express';
import cors from 'cors';
import { handler } from './index.js';

const app = express();
const PORT = 3001;

// Enable CORS for frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Convert Express request to Lambda event format
app.all('/api/calendar-data', async (req, res) => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log(`📥 ${req.method} Request Received`);
    console.log('='.repeat(60));
    console.log('Query:', req.query);
    console.log('Body:', req.body);
    console.log('Headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      contentType: req.headers['content-type']
    });

    // Convert Express request to Lambda event
    const event = {
      httpMethod: req.method,
      headers: {
        Authorization: req.headers.authorization || '',
        'Content-Type': req.headers['content-type'] || 'application/json'
      },
      queryStringParameters: req.query || {},
      body: req.method !== 'GET' ? JSON.stringify(req.body) : null
    };

    // Call Lambda handler
    const response = await handler(event);

    console.log('\n📤 Lambda Response:');
    console.log('Status:', response.statusCode);
    console.log('Body:', response.body);
    console.log('='.repeat(60) + '\n');

    // Parse response body if it's a string
    const responseBody = typeof response.body === 'string'
      ? JSON.parse(response.body)
      : response.body;

    // Send response
    res.status(response.statusCode).json(responseBody);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    console.error('='.repeat(60) + '\n');

    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Local Lambda server is running',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log('\n' + '🚀'.repeat(30));
  console.log(`Local Lambda Server Started`);
  console.log('🚀'.repeat(30));
  console.log(`\n📍 Server: http://localhost:${PORT}`);
  console.log(`📍 Endpoint: http://localhost:${PORT}/api/calendar-data`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log('\n📝 Test Commands:');
  console.log('\nGET (Load calendar data):');
  console.log(`curl "http://localhost:${PORT}/api/calendar-data?property=YOUR_PROPERTY_ID"`);
  console.log('\nPOST (Save pricing):');
  console.log(`curl -X POST http://localhost:${PORT}/api/calendar-data \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"propertyId":"YOUR_ID","pricing":{"2025-01-25":150}}'`);
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('Waiting for requests...\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});
