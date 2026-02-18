import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createCorsOptions } from './util/corsConfig.js';

dotenv.config();


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS Configuration - Security: Using centralized CORS config with origin whitelist
app.use(cors(createCorsOptions()));

app.use(express.json());


// Health Check Route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// GraphQL Placeholder Endpoint
app.post('/graphql', (req, res) => {
  const { query, variables, operationName } = req.body;
  
  console.log('GraphQL Query:', operationName);
  
  // Send a minimal valid GraphQL response
  res.json({
    data: null,
    errors: [{ message: 'GraphQL endpoint not fully implemented yet' }]
  });
});

app.get('/graphql', (req, res) => {
  res.status(405).json({ 
    errors: [{ message: 'Method Not Allowed. Use POST instead.' }]
  });
});

// API Routes
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to Domits API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
});
