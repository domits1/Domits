/**
 * CORS Configuration Utility
 * Centralized CORS configuration to ensure security and reduce duplication
 */

/**
 * Creates CORS options with whitelist validation
 * @returns {Object} CORS configuration options
 */
export function createCorsOptions() {
  const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) 
    : ['http://localhost:3000', 'http://localhost:3001'];

  return {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked request from unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400 // 24 hours
  };
}

/**
 * Gets the list of allowed origins for logging/debugging
 * @returns {string[]} Array of allowed origins
 */
export function getAllowedOrigins() {
  return process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) 
    : ['http://localhost:3000', 'http://localhost:3001'];
}
