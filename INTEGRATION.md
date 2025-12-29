# PBA CSV Script - Integration Guide

Complete step-by-step guide for integrating the PBA CSV Script into existing payment portals and card issuer UIs.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Integration Methods](#integration-methods)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Backend

- **Node.js**: 16.0.0 or higher
- **npm**: 8.0.0 or higher
- **Memory**: Minimum 256MB, recommended 512MB+
- **Disk**: 50MB for dependencies

### Frontend

- **Browser**: Modern ES6+ compatible browser
  - Chrome 90+
  - Firefox 88+
  - Safari 14+
  - Edge 90+
- **HTTPS**: Required for production (Clipboard API)

### Optional

- **Docker**: For containerized deployment
- **Redis**: For distributed rate limiting
- **PostgreSQL/MySQL**: For persistent data storage

---

## Installation

### Step 1: Clone/Extract Repository

```bash
cd pba-csv-script
ls -la
```

Expected structure:
```
pba-csv-script/
├── backend/
├── frontend/
├── encryption/
├── package.json
├── README.md
└── [other files]
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

### Step 4: Start Backend

```bash
npm start
```

Output:
```
PBA CSV Backend running on http://localhost:3000
Available endpoints:
  GET  /api/health
  GET  /api/billing/address
  POST /api/billing/export-encrypted-csv
  POST /api/billing/decrypt-csv
```

---

## Configuration

### Backend Configuration

#### CORS Settings

Edit `backend/server.js`:

```javascript
const allowedOrigins = [
  'https://payment-portal.example.com',
  'https://card-issuer-app.example.com'
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
```

#### Database Integration

Replace mock data:

```javascript
// In backend/server.js
async function getBillingAddress(userId) {
  // Fetch from your database
  const result = await db.query(
    'SELECT * FROM billing_addresses WHERE user_id = $1',
    [userId]
  );
  return formatBillingData(result.rows[0]);
}

app.get('/api/billing/address', authMiddleware, async (req, res) => {
  const data = await getBillingAddress(req.user.id);
  res.json({ success: true, data });
});
```

#### Authentication

Add JWT verification:

```javascript
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/api/billing/address', authMiddleware, (req, res) => {
  // ... authenticated endpoint
});
```

### Frontend Configuration

#### Vanilla JavaScript

Edit `frontend/vanilla/pba-script.js`:

```javascript
// Change API URL
const API_BASE_URL = 'https://your-backend.com/api';

// Add authentication token
async function loadBillingData() {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(`${API_BASE_URL}/billing/address`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  // ...
}
```

#### React Component

Update `frontend/react/PBAComponent.tsx`:

```jsx
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Pass token from parent
interface Props {
  authToken: string;
  userId: string;
}

const PBAComponent: React.FC<Props> = ({ authToken, userId }) => {
  // Use authToken in fetch calls
  const response = await fetch(`${API_BASE_URL}/billing/address`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });
  // ...
};
```

---

## Integration Methods

### Method 1: Standalone Backend + Vanilla Frontend

**Best for:** Existing HTML-based portals

#### Setup

1. **Backend running** on `https://api.your-portal.com`
2. **Frontend hosted** on `https://portal.your-portal.com`

#### Integration Steps

```html
<!-- In your portal HTML -->
<div id="pba-root"></div>

<!-- Link CSS -->
<link rel="stylesheet" href="https://cdn.your-portal.com/pba/styles.css">

<!-- Link JS -->
<script src="https://cdn.your-portal.com/pba/pba-script.js"></script>

<script>
  // Configure
  window.PBA_API_URL = 'https://api.your-portal.com/api';
  window.PBA_AUTH_TOKEN = localStorage.getItem('token');
</script>
```

#### Backend Server

```bash
npm start
# Running on https://api.your-portal.com
```

---

### Method 2: React Integration

**Best for:** React-based payment portals

#### Setup

```bash
npm install react react-dom
```

#### Usage

```jsx
import { PBAComponent } from './components/PBAComponent';

export function PaymentPage() {
  const authToken = useAuth();
  
  return (
    <div>
      <h1>Payment Settings</h1>
      <PBAComponent authToken={authToken} />
    </div>
  );
}
```

#### Configuration

Create `.env.local`:
```
REACT_APP_API_URL=https://api.your-portal.com/api
```

#### Build & Deploy

```bash
npm run build:frontend
# Output in dist/
```

---

### Method 3: Embedded iFrame

**Best for:** Third-party portal integration

#### Setup

Host the vanilla frontend:
```bash
# Serve frontend/vanilla/ as static files
npm install -g serve
serve -s frontend/vanilla -p 8080
```

#### Embed in Parent App

```html
<iframe 
  src="https://pba.your-domain.com"
  width="100%"
  height="800"
  frameborder="0"
  sandbox="allow-same-origin allow-scripts allow-forms"
></iframe>

<script>
  // Pass token via postMessage
  const iframe = document.querySelector('iframe');
  iframe.onload = () => {
    iframe.contentWindow.postMessage({
      type: 'AUTH_TOKEN',
      token: localStorage.getItem('token')
    }, 'https://pba.your-domain.com');
  };
</script>
```

#### Receive in iFrame

```javascript
// In pba-script.js
window.addEventListener('message', (event) => {
  if (event.data.type === 'AUTH_TOKEN') {
    globalAuthToken = event.data.token;
    loadBillingData();
  }
});
```

---

### Method 4: Docker Deployment

#### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
```

#### Build

```bash
docker build -t pba-csv-script .
```

#### Run

```bash
docker run -p 3000:3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  -e ALLOWED_ORIGINS=https://your-portal.com \
  pba-csv-script
```

#### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://user:pass@db:5432/pba
      ALLOWED_ORIGINS: https://your-portal.com
    depends_on:
      - db
  
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: pba
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Run:
```bash
docker-compose up
```

---

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Test API endpoints
curl -X GET http://localhost:3000/api/health

curl -X POST http://localhost:3000/api/billing/export-encrypted-csv \
  -H "Content-Type: application/json" \
  -d '{"password":"test123456","fields":["city","postal_code"]}'
```

### Frontend Tests

1. **Copy field** - Click copy button
2. **Copy all** - Click "Copy All Visible"
3. **Export CSV** - Fill password, select fields, export
4. **Verify encryption** - Open JSON file, confirm encrypted
5. **Decrypt** - Try to decrypt with correct password
6. **Wrong password** - Try with incorrect password (should fail)

### Security Tests

```bash
# Vulnerability scan
npm audit

# Static analysis
npm install -g eslint
eslint .

# Test CORS
curl -X OPTIONS http://localhost:3000/api/billing/address \
  -H "Origin: https://unauthorized.com"
```

---

## Troubleshooting

### Issue: "Cannot GET /api/billing/address"

**Cause:** Backend not running or wrong URL

**Solution:**
```bash
npm start
# Check http://localhost:3000/api/health
```

### Issue: CORS Error in Browser

**Cause:** Origin not in whitelist

**Solution:** Update `allowedOrigins` in `backend/server.js`
```javascript
const allowedOrigins = ['https://your-actual-domain.com'];
```

### Issue: Copy to Clipboard Not Working

**Cause:** Non-HTTPS environment

**Solution:**
- Use HTTPS in production
- Or verify fallback copy method works

### Issue: Decryption Fails

**Possible Causes:**
- Wrong password
- Corrupted JSON file
- Version mismatch

**Solution:**
- Verify password
- Re-export file
- Check browser console for errors

### Issue: Export Button Disabled

**Cause:** Password < 8 characters or no fields selected

**Solution:**
- Enter password with minimum 8 characters
- Select at least one field

### Issue: API Returns "Internal Server Error"

**Cause:** Unhandled exception

**Solution:**
- Check server logs
- Verify database connection (if using)
- Test with mock data

---

## Performance Optimization

### Frontend

```javascript
// Lazy load styles
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'styles.css';
document.head.appendChild(link);
```

### Backend

```javascript
// Caching
const cache = new Map();

app.get('/api/billing/address', (req, res) => {
  const cached = cache.get(req.user.id);
  if (cached && Date.now() - cached.time < 5 * 60 * 1000) {
    return res.json(cached.data);
  }
  // ... fetch and cache
});
```

### Database

```javascript
// Connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

---

## Monitoring & Logging

### Application Logging

```javascript
const logger = require('winston');

logger.info('Export requested', {
  userId: hashedId,
  fields: selectedFields,
  timestamp: new Date()
});
```

### Error Tracking

```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

app.use(Sentry.Handlers.errorHandler());
```

### Health Checks

```bash
curl http://localhost:3000/api/health
```

---

## Updating & Maintenance

### Update Dependencies

```bash
npm outdated
npm update
npm audit fix
```

### Database Migrations

```bash
npm install db-migrate
db-migrate create add_audit_table
db-migrate up
```

---

## Support & Resources

- **Full Documentation**: [README.md](README.md)
- **API Reference**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Security Guide**: [SECURITY.md](SECURITY.md)
- **Quick Start**: [QUICK_START.md](QUICK_START.md)

---

**Version:** 1.0.0  
**Last Updated:** December 2025  
**Support Email:** support@your-company.com
