# PBA CSV Script - Security Best Practices & Compliance

## Overview

This document outlines security considerations and compliance requirements for deploying the PBA CSV Script in production payment environments.

---

## 🔐 Encryption & Cryptography

### Current Implementation

✅ **AES-256-GCM**
- Industry standard AEAD (Authenticated Encryption with Associated Data)
- Provides confidentiality AND authenticity
- 256-bit keys (32 bytes)
- 128-bit authentication tags

✅ **PBKDF2 with SHA-256**
- 100,000 iterations (configurable)
- Random 256-bit salt per encryption
- Resistance to dictionary/brute-force attacks

✅ **Random IV Generation**
- 128-bit random IV per encryption operation
- Prevents pattern analysis

### Recommendations

1. **Increase PBKDF2 iterations** for higher security:
   ```javascript
   pbkdf2Iterations: 300000 // Increase from 100,000
   ```

2. **Consider Argon2** alternative (more resistant to GPU attacks):
   ```javascript
   // Future: Implement Argon2 option
   const argon2 = require('argon2');
   ```

3. **Key rotation policy**:
   - Rotate master keys every 90 days
   - Archive old keys for decryption of old data

---

## 🛡️ Transport Security

### HTTPS/TLS

**Required in Production:**
```javascript
// Force HTTPS redirect
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && 
      req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  next();
});
```

**Configuration:**
- Use TLS 1.2+
- Strong cipher suites only
- HSTS headers enabled (via Helmet.js)

### Certificate Management

```javascript
// Example with Let's Encrypt (Certbot)
// sudo certbot certonly --standalone -d your-domain.com

const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/your-domain/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/your-domain/fullchain.pem')
};

https.createServer(options, app).listen(443);
```

---

## 🔑 Authentication & Authorization

### Current: No Authentication ⚠️

Implement JWT for production:

```javascript
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Apply to protected routes
app.get('/api/billing/address', authMiddleware, (req, res) => {
  // ... endpoint code
});
```

### OAuth 2.0 Alternative

For federated authentication:
```javascript
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  // Authenticate user
}));
```

---

## 🚫 Input Validation & Sanitization

### Current Validation

Enhance with stricter validation:

```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/billing/export-encrypted-csv', [
  body('password')
    .isLength({ min: 8, max: 128 })
    .matches(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/, {
      message: 'Invalid characters in password'
    }),
  body('fields')
    .isArray({ min: 1, max: 10 })
    .custom(value => {
      const allowed = ['apt_unit', 'address_line_1', 'city', 'state_province', 'postal_code', 'card_number', 'expiry_date'];
      return value.every(field => allowed.includes(field));
    })
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
});
```

### SQL Injection Prevention (if using database)

```javascript
// Use parameterized queries ALWAYS
const result = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId] // Parameter binding
);
```

---

## 🛑 Rate Limiting & Brute Force Protection

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const redisClient = redis.createClient();

// Strict limit on export endpoint (password attacks)
const exportLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'export-limit:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many export requests, try again later'
});

// Moderate limit on read endpoint
const readLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30
});

app.post('/api/billing/export-encrypted-csv', exportLimiter, (req, res) => {
  // ... endpoint
});

app.get('/api/billing/address', readLimiter, (req, res) => {
  // ... endpoint
});
```

---

## 📋 CORS Security

### Current Configuration

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080'
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
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600
}));
```

### Production Setup

```javascript
const productionOrigins = [
  'https://payment-portal.example.com',
  'https://card-issuer.example.com'
];

// Add environment variable for dynamic configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || productionOrigins;
```

---

## 🔍 Logging & Monitoring

### Secure Logging

❌ **Never Log:**
- Passwords
- API keys
- Credit card numbers
- Full PII (names, addresses)
- Decrypted data

✅ **Do Log:**
- Export events with field count
- Decryption attempts (failures)
- User IDs/sessions (masked)
- IP addresses
- Timestamps

```javascript
const logger = require('winston');

logger.info('Export requested', {
  userId: hashedUserId,
  fieldCount: fields.length,
  timestamp: new Date(),
  ip: req.ip
});

logger.warn('Decryption failed', {
  attempt: 'invalid_password',
  timestamp: new Date(),
  ip: req.ip
});
```

### Monitoring Alerts

```javascript
// Alert on suspicious patterns
const decryptionFailures = {};

app.post('/api/billing/decrypt-csv', (req, res, next) => {
  const ip = req.ip;
  
  // Track failures
  if (!decryptionFailures[ip]) {
    decryptionFailures[ip] = { count: 0, firstSeen: Date.now() };
  }
  
  // Alert if 10+ failures in 5 minutes
  const failures = decryptionFailures[ip];
  if (failures.count > 10 && Date.now() - failures.firstSeen < 5 * 60 * 1000) {
    // Alert: Possible brute force attack
    console.error(`ALERT: Possible brute force from ${ip}`);
  }
  
  next();
});
```

---

## 🏪 Secure Data Storage

### What to Store

✅ **Safe to Store:**
- Hashed passwords (bcrypt, Argon2)
- Audit logs
- Encrypted backups
- User settings

❌ **Never Store Plaintext:**
- Card numbers
- CVV codes
- Social security numbers
- Full addresses (unless necessary)

### Database Security

```javascript
// Use connection string from environment
const connectionString = process.env.DATABASE_URL;

// Enable SSL for database connections
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});
```

---

## ✅ Headers Security

Already implemented via **Helmet.js**:

```javascript
const helmet = require('helmet');
app.use(helmet());
```

**Headers Set:**
- Content-Security-Policy
- X-Frame-Options (DENY)
- X-Content-Type-Options (nosniff)
- Strict-Transport-Security
- X-XSS-Protection

---

## 🔐 Session Management

### Implementation

```javascript
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');

const redisClient = createClient();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true, // No JavaScript access
    sameSite: 'strict', // CSRF protection
    maxAge: 30 * 60 * 1000 // 30 minutes
  }
}));
```

---

## 🏛️ Compliance Standards

### PCI-DSS (Payment Card Industry Data Security Standard)

**Key Requirements:**
1. ✅ Install and maintain firewall
2. ✅ Don't rely on vendor security
3. ✅ Protect stored cardholder data
4. ✅ Encrypt transmission
5. ✅ Maintain antivirus
6. ✅ Secure development
7. ✅ Restrict access by business need
8. ✅ Identify and authenticate access
9. ✅ Restrict physical access
10. ✅ Track/monitor access
11. ✅ Test security regularly
12. ✅ Maintain security policy

**PCI-DSS Compliance Checklist:**
- [ ] Use TLS 1.2+ for all data transmission
- [ ] Never store full magnetic stripe data
- [ ] Never store CVV in any form
- [ ] Implement strong authentication
- [ ] Encrypt all cardholder data at rest
- [ ] Maintain audit logs (min 1 year)
- [ ] Annual security assessments
- [ ] Penetration testing

### GDPR (General Data Protection Regulation)

**Key Principles:**
- **Lawfulness**: Have legal basis for processing
- **Purpose limitation**: Use data only as stated
- **Data minimization**: Collect only necessary data
- **Accuracy**: Keep data current
- **Storage limitation**: Don't keep longer than needed
- **Integrity**: Protect data confidentiality
- **Accountability**: Document compliance

**Implementation:**
```javascript
// Privacy policy endpoint
app.get('/api/privacy-policy', (req, res) => {
  res.json({
    dataCollected: ['address', 'card_number'],
    purpose: 'Payment processing',
    retention: '90 days',
    rights: ['access', 'rectification', 'erasure']
  });
});

// Data export (right to portability)
app.get('/api/user/data-export', authMiddleware, async (req, res) => {
  const userData = await getUserData(req.user.id);
  res.json(userData);
});

// Data deletion (right to be forgotten)
app.delete('/api/user/data', authMiddleware, async (req, res) => {
  await deleteUserData(req.user.id);
  res.json({ message: 'Data deleted' });
});
```

### CCPA (California Consumer Privacy Act)

- Right to know
- Right to delete
- Right to opt-out
- Right to non-discrimination

---

## 🧪 Security Testing

### Regular Tests

```bash
# Dependency vulnerability scanning
npm audit

# Static code analysis
npm install -g eslint
eslint .

# Penetration testing (OWASP ZAP)
# Download: https://www.zaproxy.org/
```

### Checklist

- [ ] SQL injection tests
- [ ] XSS vulnerability scan
- [ ] CSRF protection
- [ ] Authentication bypass attempts
- [ ] Rate limiting effectiveness
- [ ] Encryption validation
- [ ] SSL/TLS configuration
- [ ] CORS misconfiguration

---

## 🚨 Incident Response Plan

### Breach Detection

```javascript
// Monitor for potential breaches
const suspiciousActivity = async (event) => {
  if (event.failedAttempts > 50) {
    await notifySecurityTeam({
      level: 'CRITICAL',
      type: 'POSSIBLE_BREACH',
      event
    });
  }
};
```

### Response Steps

1. **Isolate** affected systems
2. **Assess** scope of breach
3. **Notify** affected parties
4. **Remediate** vulnerability
5. **Document** for compliance
6. **Monitor** for recurrence

---

## 📝 Security Checklist

### Before Production Deployment

- [ ] HTTPS/TLS enabled
- [ ] Strong cipher suites configured
- [ ] JWT authentication implemented
- [ ] Rate limiting enabled
- [ ] Input validation comprehensive
- [ ] CORS properly configured
- [ ] Security headers set (Helmet)
- [ ] Logging configured (no sensitive data)
- [ ] Database encryption enabled
- [ ] Backups encrypted
- [ ] Audit logs maintained
- [ ] Regular vulnerability scanning
- [ ] Penetration testing completed
- [ ] Security training completed
- [ ] Incident response plan ready

### Ongoing Security

- [ ] Monthly vulnerability scans
- [ ] Quarterly penetration tests
- [ ] Annual security audits
- [ ] Compliance reviews
- [ ] Dependency updates
- [ ] Log monitoring
- [ ] Access reviews

---

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PCI-DSS Requirements](https://www.pcisecuritystandards.org/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Document Version:** 1.0.0  
**Last Updated:** December 2025  
**Review Frequency:** Quarterly
