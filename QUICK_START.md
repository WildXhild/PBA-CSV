# PBA CSV Script - Quick Start Guide

## 5-Minute Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Backend Server
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

### Step 3: Open Frontend
Open `frontend/vanilla/index.html` in your browser

### Done! 🎉

---

## Quick Test

### Test 1: Copy a Field
1. Open frontend page
2. Click "Copy" button on any field
3. Verify clipboard notification appears

### Test 2: Copy All
1. Click "📋 Copy All Visible"
2. Verify all fields copied message

### Test 3: Export Encrypted CSV
1. Select fields to include
2. Enter password (min. 8 characters)
3. Click "📥 Export Encrypted CSV"
4. Verify download of `.json` file

### Test 4: Verify Encryption
1. Open exported JSON file in text editor
2. Confirm data is encrypted (not readable)
3. Contains: `salt`, `iv`, `tag`, `ciphertext`

---

## Integration with Your App

### Vanilla JavaScript

```html
<!-- Include in your HTML -->
<link rel="stylesheet" href="path/to/pba/frontend/vanilla/styles.css">
<script src="path/to/pba/frontend/vanilla/pba-script.js"></script>

<!-- Update API URL in pba-script.js -->
const API_BASE_URL = 'https://your-backend.com/api';
```

### React

```jsx
import PBAComponent from './components/PBAComponent';

export default function PaymentPage() {
  return <PBAComponent />;
}
```

### Configure Backend

Edit `backend/server.js`:
```javascript
// Update CORS origins
const allowedOrigins = [
  'https://your-payment-portal.com'
];

// Update mock data to fetch from your database
const mockBillingData = {
  // ... your real data
};
```

---

## Common Issues

### Issue: "Cannot GET /api/billing/address"
**Solution:** Make sure backend server is running
```bash
npm start
```

### Issue: CORS Error
**Solution:** Update `allowedOrigins` in `backend/server.js`
```javascript
const allowedOrigins = ['http://localhost:3000'];
```

### Issue: Copy to clipboard not working
**Solution:** 
1. Use HTTPS (required for Clipboard API)
2. Or use older browser fallback (built in)

### Issue: Decryption fails
**Causes:**
- Wrong password
- Corrupted JSON file

**Solution:** 
- Double-check password
- Re-export with correct password

---

## File Reference

| File | Purpose |
|------|---------|
| `backend/server.js` | Express API server |
| `encryption/encryption.js` | AES-256-GCM encryption module |
| `frontend/vanilla/index.html` | HTML UI |
| `frontend/vanilla/pba-script.js` | Frontend logic |
| `frontend/vanilla/styles.css` | Styling |
| `frontend/react/PBAComponent.tsx` | React component |
| `package.json` | Dependencies |
| `README.md` | Full documentation |
| `API_DOCUMENTATION.md` | API reference |

---

## Development Commands

```bash
# Start server (development)
npm start

# Start with auto-reload
npm run dev

# Run tests
npm test

# Build frontend assets
npm run build:frontend
```

---

## Deployment Checklist

- [ ] Update `.env` with production URLs
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Configure CORS origins
- [ ] Add rate limiting
- [ ] Add authentication
- [ ] Setup database for real data
- [ ] Add audit logging
- [ ] Configure backup strategy
- [ ] Setup monitoring/alerts

---

## Next Steps

1. **Customize UI** - Edit `frontend/vanilla/styles.css`
2. **Add authentication** - Implement JWT in `backend/server.js`
3. **Connect database** - Replace mock data in `server.js`
4. **Add audit logging** - Log all exports/decryptions
5. **Deploy to production** - Use Docker or your platform

---

## Support

- Check [README.md](README.md) for full documentation
- See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for API reference
- Review inline code comments
- Check browser console for errors

---

**Version:** 1.0.0  
**Last Updated:** December 2025
