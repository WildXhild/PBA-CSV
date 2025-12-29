/**
 * PBA CSV Script - React Component
 * 
 * A React-based version of the Payment Billing Address component
 * with full TypeScript support and modern React patterns
 * 
 * NOTE: This component requires React, react-dom, @types/react, and @types/react-dom
 * Install in your React project with: npm install react react-dom @types/react @types/react-dom
 */

// @ts-ignore - React types handled by host project
import React, { useState, useEffect } from 'react';
import './PBAComponent.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

interface BillingData {
  card_number: string;
  expiry_date: string;
  cvv: string;
  address: {
    apt_unit: string;
    address_line_1: string;
    address_line_2: string;
    street: string;
    city: string;
    state_province: string;
    country: string;
    postal_code: string;
  };
}

interface Message {
  type: 'error' | 'success';
  text: string;
}

const PBAComponent: React.FC = () => {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'address_line_1',
    'city',
    'state_province',
    'postal_code'
  ]);
  const [exportPassword, setExportPassword] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch billing data on component mount
  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/billing/address`);

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const result = await response.json();
      setBillingData(result.data);
      showMessage('success', 'Billing data loaded successfully');
    } catch (err: unknown) {
      console.error('Error loading billing data:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      showMessage('error', `Failed to load billing data: ${errorMsg}`);
      // Use mock data for demo
      useMockData();
    } finally {
      setLoading(false);
    }
  };

  const useMockData = () => {
    setBillingData({
      card_number: '4532-1111-2222-3333',
      expiry_date: '12/25',
      cvv: '***',
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
    });
    showMessage('success', 'Using demo data (backend not available)');
  };

  const showMessage = (type: 'error' | 'success', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const copyToClipboard = async (value: string, fieldId: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = value;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopiedField(fieldId);
      showMessage('success', `Copied "${fieldId}" to clipboard`);

      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      showMessage('error', 'Failed to copy to clipboard');
    }
  };

  const handleCopyAll = async () => {
    if (!billingData) return;

    const values = [
      billingData.address.apt_unit,
      billingData.address.address_line_1,
      billingData.address.address_line_2,
      billingData.address.street,
      billingData.address.city,
      billingData.address.state_province,
      billingData.address.country,
      billingData.address.postal_code,
      billingData.card_number,
      billingData.expiry_date
    ].filter(v => v);

    const text = values.join('\n');
    await copyToClipboard(text, 'all-fields');
  };

  const handleExportCSV = async () => {
    if (!exportPassword || exportPassword.length < 8) {
      showMessage('error', 'Password must be at least 8 characters');
      return;
    }

    if (selectedFields.length === 0) {
      showMessage('error', 'Please select at least one field to export');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/billing/export-encrypted-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: exportPassword,
          fields: selectedFields
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      const result = await response.json();
      downloadFile(result.encrypted, 'pba-export.json');
      showMessage('success', 'CSV exported successfully with encryption');
      setExportPassword('');
      const errorMsg = error instanceof Error ? error.message : String(error);
      showMessage('error', `Export failed: ${errorMsg}`);
      showMessage('error', `Export failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleFieldSelection = (field: string) => {
    setSelectedFields((prev: string[]) =>
      prev.includes(field)
        ? prev.filter((f: string) => f !== field)
        : [...prev, field]
    );
  };

  if (loading && !billingData) {
    return (
      <div className="pba-loading">
        <div className="spinner"></div>
        <p>Loading billing data...</p>
      </div>
    );
  }

  return (
    <div className="pba-container">
      <header className="pba-header">
        <h1>Payment Billing Address & Details</h1>
        <p className="subtitle">Secure copy & export utility</p>
      </header>

      {message && (
        <div className={`message ${message.type}`}>
          {message.type === 'error' ? '❌' : '✅'} {message.text}
        </div>
      )}

      <main className="pba-main">
        {billingData && (
          <>
            {/* Address Section */}
            <section className="pba-section">
              <h2>Billing Address</h2>
              <div className="fields-grid">
                {[
                  { id: 'apt_unit', label: 'Apartment/Unit', value: billingData.address.apt_unit },
                  { id: 'address_line_1', label: 'Address Line 1', value: billingData.address.address_line_1 },
                  { id: 'address_line_2', label: 'Address Line 2', value: billingData.address.address_line_2 },
                  { id: 'street', label: 'Street', value: billingData.address.street },
                  { id: 'city', label: 'City', value: billingData.address.city },
                  { id: 'state_province', label: 'State/Province', value: billingData.address.state_province },
                  { id: 'country', label: 'Country', value: billingData.address.country },
                  { id: 'postal_code', label: 'Postal Code', value: billingData.address.postal_code }
                ].map(field => (
                  <div key={field.id} className="field-group">
                    <label>{field.label}</label>
                    <div className="field-wrapper">
                      <input type="text" value={field.value} readOnly className="field-input" />
                      <button
                        className={`copy-btn ${copiedField === field.id ? 'copied' : ''}`}
                        onClick={() => copyToClipboard(field.value, field.id)}
                      >
                        {copiedField === field.id ? '✓ Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Card Details Section */}
            <section className="pba-section">
              <h2>Card Details</h2>
              <div className="fields-grid">
                <div className="field-group">
                  <label>Card Number</label>
                  <div className="field-wrapper">
                    <input type="text" value={billingData.card_number} readOnly className="field-input" />
                    <button
                      className={`copy-btn ${copiedField === 'card_number' ? 'copied' : ''}`}
                      onClick={() => copyToClipboard(billingData.card_number, 'card_number')}
                    >
                      {copiedField === 'card_number' ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="field-group">
                  <label>Expiry Date</label>
                  <div className="field-wrapper">
                    <input type="text" value={billingData.expiry_date} readOnly className="field-input" />
                    <button
                      className={`copy-btn ${copiedField === 'expiry_date' ? 'copied' : ''}`}
                      onClick={() => copyToClipboard(billingData.expiry_date, 'expiry_date')}
                    >
                      {copiedField === 'expiry_date' ? '✓ Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="field-group">
                  <label>CVV (Not Exported)</label>
                  <div className="field-wrapper">
                    <input type="password" value="•••" readOnly className="field-input" disabled />
                    <button className="copy-btn" disabled title="CVV cannot be copied">N/A</button>
                  </div>
                </div>
              </div>
            </section>

            {/* Export Section */}
            <section className="pba-section export-section">
              <h2>Export Data</h2>

              <div className="field-selection">
                <p>Select fields to include in encrypted CSV export:</p>
                <div className="checkbox-group">
                  {[
                    'apt_unit', 'address_line_1', 'address_line_2', 'street',
                    'city', 'state_province', 'country', 'postal_code',
                    'card_number', 'expiry_date'
                  ].map(field => (
                    <label key={field}>
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field)}
                        onChange={() => toggleFieldSelection(field)}
                      />
                      {field.split('_').join(' / ')}
                    </label>
                  ))}
                </div>
              </div>

              <div className="password-group">
                <label htmlFor="exportPassword">Encryption Password (min. 8 characters)</label>
                <input
                  id="exportPassword"
                  type="password"
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  placeholder="Enter strong password"
                  minLength={8}
                />
                <p className="hint">🔒 This password will be required to decrypt the CSV file</p>
              </div>

              <div className="button-group">
                <button className="btn btn-primary" onClick={handleCopyAll}>
                  📋 Copy All Visible
                </button>
                <button className="btn btn-success" onClick={handleExportCSV} disabled={loading}>
                  {loading ? '⏳ Processing...' : '📥 Export Encrypted CSV'}
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="pba-footer">
        <p>🔐 All data is encrypted before export. Your password is never stored.</p>
      </footer>
    </div>
  );
};

export default PBAComponent;
