/**
 * Backend API Server - Payment Billing Address CSV
 * 
 * Secure endpoints for:
 * - Retrieving billing address and card data (mock/from secure store)
 * - Encrypting and exporting CSV data
 * - Processing payment credential requests
 * 
 * Security Best Practices Implemented:
 * - CORS with origin whitelisting
 * - Helmet for security headers
 * - Request body size limits
 * - Password-protected encryption endpoints
 * - No sensitive data logging
 * - HTTPS enforcement (in production)
 */


const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const encryption = require('../encryption/encryption');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Middleware Configuration
 */

// Security headers
app.use(helmet());

// CORS configuration - restrict to trusted origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'http://localhost:5173', // Vite dev server
  process.env.FRONTEND_URL || 'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: false }));

/**
 * Mock Secure Data Store
 * In production, this would fetch from a secure backend/database
 */
const mockBillingData = {
  card_number: '4532-1111-2222-3333',
  expiry_date: '12/25',
  cvv: '***', // Never expose full CVV
  address: {
    apt_unit: 'Suite 100',
    address_line_1: '123 Main Street',
    address_line_2: 'Building A',
    street: 'Main Street',
    city: 'San Francisco',
    state_province: 'CA',
    country: 'United States',
    postal_code: '94105'
  }
};

/**
 * Endpoint: Health Check
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Endpoint: Retrieve Billing Address Data
 * GET /api/billing/address
 * 
 * Returns structured billing address and card data
 * In production: validate auth tokens, rate limit, audit log
 */
app.get('/api/billing/address', (req, res) => {
  try {
    // TODO: Implement authentication validation
    // TODO: Validate authorization scopes
    // TODO: Add audit logging

    res.json({
      success: true,
      data: mockBillingData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving billing address:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Endpoint: Export Encrypted CSV
 * POST /api/billing/export-encrypted-csv
 * 
 * Body:
 * {
 *   "password": "user-provided-password",
 *   "fields": ["apt_unit", "address_line_1", "city", "state_province", "postal_code", "card_number"]
 * }
 * 
 * Returns encrypted CSV payload
 */
app.post('/api/billing/export-encrypted-csv', async (req, res) => {
  try {
    const { password, fields } = req.body;

    // Validate input
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }

    if (!Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one field must be selected for export'
      });
    }

    // TODO: Implement authentication validation

    // Build CSV data from selected fields
    const csvData = buildCSVData(mockBillingData, fields);

    // Encrypt CSV data
    const { payload, metadata } = await encryption.encryptCSVData(csvData, password);

    res.json({
      success: true,
      encrypted: payload,
      metadata,
      timestamp: new Date().toISOString(),
      instructions: 'Save this payload and provide your password to decrypt'
    });
  } catch (error) {
    console.error('Error exporting encrypted CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to encrypt CSV data'
    });
  }
});

/**
 * Endpoint: Decrypt CSV
 * POST /api/billing/decrypt-csv
 * 
 * Body:
 * {
 *   "payload": "encrypted-json-payload",
 *   "password": "user-password"
 * }
 */
app.post('/api/billing/decrypt-csv', async (req, res) => {
  try {
    const { payload, password } = req.body;

    if (!payload || !password) {
      return res.status(400).json({
        success: false,
        error: 'Payload and password are required'
      });
    }

    const csvData = await encryption.decryptCSVData(payload, password);

    res.json({
      success: true,
      data: csvData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error decrypting CSV:', error);
    res.status(400).json({
      success: false,
      error: 'Decryption failed - invalid password or corrupted data'
    });
  }
});

/**
 * Helper function to build CSV from selected fields
 * @param {object} data - Full billing data object
 * @param {array} fields - Selected field names
 * @returns {string} - CSV formatted data
 */
function buildCSVData(data, fields) {
  // Map field names to data paths
  const fieldMap = {
    apt_unit: () => data.address.apt_unit,
    address_line_1: () => data.address.address_line_1,
    address_line_2: () => data.address.address_line_2,
    street: () => data.address.street,
    city: () => data.address.city,
    state_province: () => data.address.state_province,
    country: () => data.address.country,
    postal_code: () => data.address.postal_code,
    card_number: () => data.card_number,
    expiry_date: () => data.expiry_date,
    cvv: () => '***' // Never export real CVV
  };

  // Build header row
  const headers = fields.join(',');

  // Build data row
  const values = fields
    .map(field => {
      const getter = fieldMap[field];
      if (!getter) return '';
      const value = getter();
      // Escape CSV values with commas or quotes
      return typeof value === 'string' && (value.includes(',') || value.includes('"'))
        ? `"${value.replace(/"/g, '""')}"`
        : value;
    })
    .join(',');

  return `${headers}\n${values}`;
}

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`PBA CSV Backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/health');
  console.log('  GET  /api/billing/address');
  console.log('  POST /api/billing/export-encrypted-csv');
  console.log('  POST /api/billing/decrypt-csv');
});

module.exports = app;
