# PBA CSV Script - API Documentation

## Base URL

```
http://localhost:3000/api
```

**Production:** Update to your deployed backend URL

## Authentication

Currently uses no authentication. In production, implement:
- JWT Bearer tokens
- OAuth 2.0
- API keys with rate limiting

## Endpoints

### 1. Health Check

**Endpoint:** `GET /api/health`

**Description:** Check if the backend is running

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-26T10:30:00.000Z"
}
```

---

### 2. Get Billing Address

**Endpoint:** `GET /api/billing/address`

**Description:** Retrieve complete billing address and card data

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token} (optional, implement in production)
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "card_number": "4532-1111-2222-3333",
    "expiry_date": "12/25",
    "cvv": "***",
    "address": {
      "apt_unit": "Suite 100",
      "address_line_1": "123 Main Street",
      "address_line_2": "Building A",
      "street": "Main Street",
      "city": "San Francisco",
      "state_province": "CA",
      "country": "United States",
      "postal_code": "94105"
    }
  },
  "timestamp": "2025-12-26T10:30:00.000Z"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/billing/address \
  -H "Content-Type: application/json"
```

---

### 3. Export Encrypted CSV

**Endpoint:** `POST /api/billing/export-encrypted-csv`

**Description:** Encrypt and export selected billing fields as CSV

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "password": "SecurePassword123",
  "fields": [
    "apt_unit",
    "address_line_1",
    "address_line_2",
    "street",
    "city",
    "state_province",
    "country",
    "postal_code",
    "card_number",
    "expiry_date"
  ]
}
```

**Supported Fields:**
- `apt_unit` - Apartment/Unit number
- `address_line_1` - Primary address line
- `address_line_2` - Secondary address line
- `street` - Street name
- `city` - City name
- `state_province` - State or Province
- `country` - Country name
- `postal_code` - Postal/Zip code
- `card_number` - Card number (last 4 or masked)
- `expiry_date` - Card expiry date
- `cvv` - **NOT EXPORTED** for security

**Response (200 OK):**
```json
{
  "success": true,
  "encrypted": "{\"salt\":\"...\",\"iv\":\"...\",\"tag\":\"...\",\"ciphertext\":\"...\",\"algorithm\":\"aes-256-gcm\",\"iterations\":100000}",
  "metadata": {
    "algorithm": "aes-256-gcm",
    "iterations": 100000
  },
  "timestamp": "2025-12-26T10:30:00.000Z",
  "instructions": "Save this payload and provide your password to decrypt"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Password must be at least 8 characters"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "At least one field must be selected for export"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Failed to encrypt CSV data"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/billing/export-encrypted-csv \
  -H "Content-Type: application/json" \
  -d '{
    "password": "SecurePassword123",
    "fields": ["address_line_1", "city", "state_province", "postal_code"]
  }'
```

**JavaScript Example:**
```javascript
const response = await fetch('http://localhost:3000/api/billing/export-encrypted-csv', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    password: 'SecurePassword123',
    fields: ['address_line_1', 'city', 'state_province', 'postal_code']
  })
});

const result = await response.json();
console.log(result);
```

---

### 4. Decrypt CSV

**Endpoint:** `POST /api/billing/decrypt-csv`

**Description:** Decrypt a previously exported encrypted CSV file

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "password": "SecurePassword123",
  "payload": "{\"salt\":\"...\",\"iv\":\"...\",\"tag\":\"...\",\"ciphertext\":\"...\",\"algorithm\":\"aes-256-gcm\",\"iterations\":100000}"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": "apt_unit,address_line_1,address_line_2\nSuite 100,123 Main Street,Building A",
  "timestamp": "2025-12-26T10:30:00.000Z"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Decryption failed - invalid password or corrupted data"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/billing/decrypt-csv \
  -H "Content-Type: application/json" \
  -d '{
    "password": "SecurePassword123",
    "payload": "{...encrypted payload...}"
  }'
```

---

## Encryption Details

### Payload Structure

The encrypted payload is a JSON object containing:

```json
{
  "salt": "base64-encoded-salt",
  "iv": "base64-encoded-initialization-vector",
  "tag": "base64-encoded-authentication-tag",
  "ciphertext": "base64-encoded-encrypted-data",
  "algorithm": "aes-256-gcm",
  "iterations": 100000
}
```

**Field Descriptions:**
- `salt`: Random 32-byte value for PBKDF2 key derivation
- `iv`: Random 16-byte initialization vector for GCM mode
- `tag`: 16-byte authentication tag for integrity verification
- `ciphertext`: Encrypted CSV data
- `algorithm`: Encryption algorithm (aes-256-gcm)
- `iterations`: PBKDF2 iterations for key derivation

### Encryption Process

1. Generate random 32-byte salt
2. Derive 256-bit key from password using PBKDF2 (100,000 iterations, SHA-256)
3. Generate random 16-byte IV
4. Encrypt CSV data using AES-256-GCM
5. Extract authentication tag
6. Base64 encode all components
7. Return as JSON payload

### Decryption Process

1. Parse JSON payload
2. Base64 decode components
3. Derive key from password using stored salt
4. Decrypt ciphertext using AES-256-GCM
5. Verify authentication tag
6. Return decrypted CSV data

---

## Error Handling

All endpoints follow standard HTTP status codes:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid auth) |
| 403 | Forbidden (insufficient permissions) |
| 500 | Internal Server Error |

**Error Response Format:**
```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

---

## Rate Limiting (Recommended)

Implement rate limiting on production:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
});

app.use('/api/', limiter);
```

---

## CORS Configuration

By default, CORS is enabled for localhost. Update `backend/server.js`:

```javascript
const allowedOrigins = [
  'https://your-portal.com',
  'https://card-issuer.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  }
}));
```

---

## Testing with Postman

### Setup

1. Import collection or create requests manually
2. Set base URL: `http://localhost:3000`

### Test Sequence

1. **GET** `/api/health` - Verify server is running
2. **GET** `/api/billing/address` - Get billing data
3. **POST** `/api/billing/export-encrypted-csv` - Export encrypted CSV
4. **POST** `/api/billing/decrypt-csv` - Decrypt and verify

---

## Performance Considerations

- **PBKDF2 Iterations**: 100,000 (takes ~100ms on typical hardware)
- **Encryption**: <5ms for typical CSV data
- **Network**: Add 50-200ms depending on connection
- **Total Request Time**: 150-300ms typical

### Optimization Tips

- Cache billing data if unchanged
- Use compression for large payloads
- Implement CDN for frontend assets
- Use connection pooling for database

---

## Security Best Practices

1. **Always use HTTPS** in production
2. **Validate all input** on server side
3. **Log security events** (exports, errors)
4. **Implement authentication** (JWT recommended)
5. **Use environment variables** for secrets
6. **Rotate encryption keys** periodically
7. **Monitor for abuse** with rate limiting
8. **Audit access** with comprehensive logging

---

## Webhooks (Future)

Future versions may support webhooks for audit logging:

```javascript
// Example: POST to external audit service
const auditWebhook = async (event) => {
  await fetch('https://audit-service.com/log', {
    method: 'POST',
    body: JSON.stringify(event)
  });
};
```

---

**Last Updated:** December 2025  
**Version:** 1.0.0 API
