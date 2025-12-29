# Payment Billing Address – Copy & View (PBA CSV) Script

A secure, modular JavaScript/TypeScript solution for retrieving, displaying, and exporting payment billing address and card details with **AES-256-GCM encryption** and **PBKDF2 key derivation**.

## 🔐 Security Features

- **AES-256-GCM Authenticated Encryption**: Industry-standard AEAD cipher
- **PBKDF2 Key Derivation**: 100,000 iterations with SHA-256
- **Web Crypto API**: Uses native browser encryption where possible
- **Node.js Crypto Module**: Server-side encryption/decryption
- **Zero Storage of Plaintext**: Sensitive data only in memory
- **HTTPS Enforced**: In production environments
- **CORS Protection**: Whitelist trusted origins
- **Security Headers**: Helmet.js middleware
- **Rate Limiting Ready**: Template for implementation

## 📁 Project Structure

```
pba-csv-script/
├── backend/
│   └── server.js                 # Express API server
├── frontend/
│   ├── vanilla/
│   │   ├── index.html           # HTML UI
│   │   ├── pba-script.js        # Frontend logic
│   │   └── styles.css           # Stylesheet
│   └── react/                    # React component (coming soon)
├── encryption/
│   └── encryption.js            # Encryption module (AES-256-GCM + PBKDF2)
├── package.json                 # Dependencies
└── README.md                     # This file
```

## 🚀 Installation

### Prerequisites

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0

### Setup

1. **Clone/Extract the project**
   ```bash
   cd pba-csv-script
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file** (optional)
   ```bash
   cat > .env << EOF
   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   EOF
   ```

## 💻 Usage

### Start Backend Server

```bash
npm start
```

The server runs on `http://localhost:3000`

**Available Endpoints:**
- `GET  /api/health` - Health check
- `GET  /api/billing/address` - Retrieve billing address data
- `POST /api/billing/export-encrypted-csv` - Encrypt and export CSV
- `POST /api/billing/decrypt-csv` - Decrypt CSV file

### Run Frontend (Vanilla JS)

1. Open `frontend/vanilla/index.html` in a modern browser
2. The UI automatically loads billing data from the backend
3. Copy fields individually or export as encrypted CSV

**Features:**
- ✅ Copy individual fields to clipboard
- ✅ Copy all visible fields at once
- ✅ Select fields for export
- ✅ Password-protected CSV export
- ✅ AES-256-GCM encryption
- ✅ Decrypt previously exported files

### Development Mode (with auto-reload)

```bash
npm run dev
```

Requires `nodemon` (installed via `npm install`)

## 🔒 Security Considerations

### 1. **Password Strength**

- Minimum 8 characters recommended
- Use strong, randomly generated passwords
- Store encryption passwords securely (not in code)

### 2. **HTTPS in Production**

Always use HTTPS in production:
```javascript
// In production, enforce HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
});
```

### 3. **Environment Variables**

Never commit sensitive data:
```bash
# .gitignore
.env
.env.local
node_modules/
```

### 4. **CORS Configuration**

Update allowed origins in `backend/server.js`:
```javascript
const allowedOrigins = [
  'https://your-payment-portal.com',
  'https://card-issuer.com'
];
```

### 5. **Rate Limiting**

Implement rate limiting to prevent brute force attacks:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 6. **Data Validation**

Always validate and sanitize user input:
```javascript
// Example validation
if (!fields || !Array.isArray(fields) || fields.length === 0) {
  return res.status(400).json({ error: 'Invalid fields' });
}
```

### 7. **Audit Logging**

Log security-relevant events:
```javascript
console.log({
  timestamp: new Date(),
  event: 'export',
  fields: selectedFields,
  ip: req.ip
});
```

### 8. **Key Derivation Parameters**

Current PBKDF2 settings (100,000 iterations) provide strong security. Increase iterations for higher security (at cost of performance):
```javascript
const ENCRYPTION_CONFIG = {
  pbkdf2Iterations: 300000, // Increase for higher security
  // ... other config
};
```

## 🔐 Encryption Details

### AES-256-GCM

- **Key Size**: 256 bits (32 bytes)
- **Nonce/IV Size**: 128 bits (16 bytes)
- **Tag Size**: 128 bits (16 bytes)
- **Mode**: Galois/Counter Mode (GCM) - provides authenticated encryption

### PBKDF2 Key Derivation

- **Hash Algorithm**: SHA-256
- **Iterations**: 100,000
- **Salt Size**: 256 bits (32 bytes)
- **Derived Key Size**: 256 bits (32 bytes)

### Encryption Flow

```
User Password
      ↓
    PBKDF2 (100,000 iterations, SHA-256)
      ↓
  256-bit Key
      ↓
  AES-256-GCM Encryption (with random IV)
      ↓
  Ciphertext + IV + Auth Tag
      ↓
  Base64 Encoded JSON
      ↓
  Download as file
```

## 📋 API Endpoints

### 1. Get Billing Address

```bash
curl -X GET http://localhost:3000/api/billing/address
```

**Response:**
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
      "city": "San Francisco",
      "state_province": "CA",
      "country": "United States",
      "postal_code": "94105"
    }
  }
}
```

### 2. Export Encrypted CSV

```bash
curl -X POST http://localhost:3000/api/billing/export-encrypted-csv \
  -H "Content-Type: application/json" \
  -d '{
    "password": "SecurePassword123",
    "fields": ["address_line_1", "city", "state_province", "postal_code"]
  }'
```

**Response:**
```json
{
  "success": true,
  "encrypted": "{\"salt\":\"...\",\"iv\":\"...\",\"tag\":\"...\",\"ciphertext\":\"...\"}",
  "metadata": {
    "algorithm": "aes-256-gcm",
    "iterations": 100000
  }
}
```

### 3. Decrypt CSV

```bash
curl -X POST http://localhost:3000/api/billing/decrypt-csv \
  -H "Content-Type: application/json" \
  -d '{
    "password": "SecurePassword123",
    "payload": "{...encrypted payload...}"
  }'
```

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Manual Testing

1. **Copy Field**: Click "Copy" on any field, verify clipboard content
2. **Copy All**: Click "Copy All Visible", check all fields copied
3. **Export CSV**: 
   - Select fields
   - Enter password
   - Click "Export Encrypted CSV"
   - Verify download
4. **Decrypt**: 
   - Upload encrypted file
   - Enter password
   - Verify CSV is readable

## 🔌 Integration with Payment Portals

### Embedding in Existing UIs

1. **Include as Module**
   ```html
   <link rel="stylesheet" href="pba/frontend/vanilla/styles.css">
   <script src="pba/frontend/vanilla/pba-script.js"></script>
   ```

2. **Configure API Base URL**
   ```javascript
   // In pba-script.js
   const API_BASE_URL = 'https://your-backend.com/api';
   ```

3. **Update CORS in Backend**
   ```javascript
   const allowedOrigins = [
     'https://payment-portal.example.com'
   ];
   ```

### React Integration

```jsx
import PBAComponent from './components/PBAComponent';

export default function PaymentPage() {
  return <PBAComponent apiUrl="https://your-api.com" />;
}
```

## 🚀 Production Deployment

### Prerequisites

- Node.js 16+ on server
- HTTPS certificate (Let's Encrypt recommended)
- Environment variables configured

### Environment Setup

```bash
# .env.production
PORT=443
NODE_ENV=production
FRONTEND_URL=https://payment-portal.example.com
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t pba-csv-script .
docker run -p 3000:3000 -e NODE_ENV=production pba-csv-script
```

## 🛠️ Troubleshooting

### CORS Error

**Problem:** "Access to XMLHttpRequest blocked by CORS policy"

**Solution:** Update `allowedOrigins` in `backend/server.js`

### Decryption Fails

**Problem:** "Decryption failed - invalid password or corrupted data"

**Causes:**
- Wrong password entered
- Corrupted JSON payload
- Mismatched encryption/decryption versions

**Solution:** Verify password and payload integrity

### Clipboard Not Working

**Problem:** Copy button doesn't work

**Causes:**
- HTTPS not used (required for Clipboard API)
- Browser doesn't support Clipboard API

**Solution:** Fallback to older approach in `pba-script.js`

## 📝 License

MIT License - See LICENSE file

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 📞 Support

For issues or questions:
1. Check existing issues
2. Create new issue with:
   - Browser/Node.js version
   - Error message
   - Steps to reproduce

## 🔄 Roadmap

- [ ] React component version
- [ ] Vue.js component version
- [ ] Rate limiting middleware
- [ ] JWT authentication
- [ ] Database integration
- [ ] Audit logging system
- [ ] Admin dashboard
- [ ] Multi-user support
- [ ] Argon2 key derivation option

## ⚠️ Disclaimer

This script handles sensitive payment data. Ensure compliance with:
- **PCI-DSS** (Payment Card Industry Data Security Standard)
- **GDPR** (General Data Protection Regulation)
- **CCPA** (California Consumer Privacy Act)
- Your local data protection regulations

Always perform security audits before production deployment.

---

## 📜 License

This project is released under a **Dual License Model**:

### Free License
✅ **Free for research and non-commercial use** - Educational projects, personal research, non-profit organizations

### Commercial License
💼 **Commercial use requires explicit permission** - Contact the project owner for commercial licensing terms

For full license details, see [LICENSE.md](LICENSE.md).

---

**Last Updated:** December 2025  
**Version:** 1.0.0
