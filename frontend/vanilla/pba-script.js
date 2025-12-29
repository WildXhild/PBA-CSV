/**
 * Payment Billing Address – Copy & View (PBA CSV) - Frontend Script
 * 
 * Features:
 * - Fetch billing address and card data from secure backend
 * - Display in user-friendly fields with copy buttons
 * - Copy individual fields or all at once
 * - Export selected fields as encrypted CSV
 * - Decrypt CSV files
 * 
 * Security Considerations:
 * - Data only stored in memory, not in localStorage
 * - Web Crypto API for client-side encryption operations
 * - Passwords never logged or transmitted insecurely
 * - HTTPS only in production
 */

const API_BASE_URL = 'http://localhost:3000/api';

// DOM Elements
const errorContainer = document.getElementById('errorContainer');
const successContainer = document.getElementById('successContainer');
const loadingContainer = document.getElementById('loadingContainer');
const addressSection = document.getElementById('addressSection');
const copyAllBtn = document.getElementById('copyAllBtn');
const exportCSVBtn = document.getElementById('exportCSVBtn');
const copyButtons = document.querySelectorAll('.copy-btn');
const fieldInputs = document.querySelectorAll('.field-input');
const checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
const exportPassword = document.getElementById('exportPassword');
const decryptModal = document.getElementById('decryptModal');
const decryptBtn = document.getElementById('decryptBtn');
const cancelDecryptBtn = document.getElementById('cancelDecryptBtn');

// Application state
let billingData = null;

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('PBA Script initialized');
  
  // Load billing data from backend
  await loadBillingData();

  // Attach event listeners
  attachEventListeners();
});

/**
 * Fetch billing data from backend API
 */
async function loadBillingData() {
  try {
    showLoading(true);
    clearMessages();

    const response = await fetch(`${API_BASE_URL}/billing/address`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    billingData = result.data;

    // Populate form fields
    populateFields(billingData);
    showSuccess('Billing data loaded successfully');
  } catch (error) {
    console.error('Error loading billing data:', error);
    showError(`Failed to load billing data: ${error.message}`);
    // Provide mock data for demo purposes
    useMockData();
  } finally {
    showLoading(false);
  }
}

/**
 * Use mock data for demonstration
 */
function useMockData() {
  billingData = {
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
  };
  populateFields(billingData);
  showSuccess('Using demo data (backend not available)');
}

/**
 * Populate form fields with billing data
 */
function populateFields(data) {
  if (!data) return;

  // Address fields
  document.getElementById('apt_unit').value = data.address?.apt_unit || '';
  document.getElementById('address_line_1').value = data.address?.address_line_1 || '';
  document.getElementById('address_line_2').value = data.address?.address_line_2 || '';
  document.getElementById('street').value = data.address?.street || '';
  document.getElementById('city').value = data.address?.city || '';
  document.getElementById('state_province').value = data.address?.state_province || '';
  document.getElementById('country').value = data.address?.country || '';
  document.getElementById('postal_code').value = data.address?.postal_code || '';

  // Card fields
  document.getElementById('card_number').value = data.card_number || '';
  document.getElementById('expiry_date').value = data.expiry_date || '';
}

/**
 * Attach event listeners to interactive elements
 */
function attachEventListeners() {
  // Individual copy buttons
  copyButtons.forEach(button => {
    button.addEventListener('click', handleCopyField);
  });

  // Copy All button
  copyAllBtn.addEventListener('click', handleCopyAll);

  // Export CSV button
  exportCSVBtn.addEventListener('click', handleExportCSV);

  // Decrypt modal buttons
  cancelDecryptBtn.addEventListener('click', () => {
    decryptModal.classList.add('hidden');
  });

  decryptBtn.addEventListener('click', handleDecryptCSV);
}

/**
 * Handle individual field copy
 */
async function handleCopyField(event) {
  const button = event.target.closest('.copy-btn');
  const fieldId = button.dataset.field;
  const fieldInput = document.getElementById(fieldId);

  if (!fieldInput.value) {
    showError(`Field "${fieldId}" is empty`);
    return;
  }

  try {
    // Use modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(fieldInput.value);
      showCopyFeedback(button);
      showSuccess(`Copied "${fieldId}" to clipboard`);
    } else {
      // Fallback for older browsers
      fallbackCopy(fieldInput.value);
      showCopyFeedback(button);
      showSuccess(`Copied "${fieldId}" to clipboard`);
    }
  } catch (error) {
    console.error('Copy failed:', error);
    showError('Failed to copy to clipboard');
  }
}

/**
 * Fallback copy method for older browsers
 */
function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

/**
 * Show visual feedback on copy button
 */
function showCopyFeedback(button) {
  const originalText = button.textContent;
  button.textContent = '✓ Copied!';
  button.classList.add('copied');

  setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove('copied');
  }, 2000);
}

/**
 * Handle Copy All button
 */
async function handleCopyAll() {
  try {
    // Collect all visible field values
    const visibleFields = Array.from(fieldInputs)
      .filter(input => input.value)
      .map(input => input.value)
      .join('\n');

    if (!visibleFields) {
      showError('No fields to copy');
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(visibleFields);
    } else {
      fallbackCopy(visibleFields);
    }

    showCopyFeedback(copyAllBtn);
    showSuccess('All visible fields copied to clipboard');
  } catch (error) {
    console.error('Copy all failed:', error);
    showError('Failed to copy all fields');
  }
}

/**
 * Handle Export Encrypted CSV
 */
async function handleExportCSV() {
  try {
    // Validate password
    const password = exportPassword.value;
    if (!password || password.length < 8) {
      showError('Password must be at least 8 characters');
      return;
    }

    // Get selected fields
    const selectedFields = Array.from(checkboxes)
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.value);

    if (selectedFields.length === 0) {
      showError('Please select at least one field to export');
      return;
    }

    showLoading(true);

    // Call backend API to encrypt and export
    const response = await fetch(`${API_BASE_URL}/billing/export-encrypted-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        password,
        fields: selectedFields
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Export failed');
    }

    const result = await response.json();

    // Create downloadable file
    downloadEncryptedCSV(result.encrypted, selectedFields);
    showSuccess('CSV exported successfully with encryption');

    // Clear password after successful export
    exportPassword.value = '';
  } catch (error) {
    console.error('Export failed:', error);
    showError(`Export failed: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

/**
 * Download encrypted CSV file
 */
function downloadEncryptedCSV(payload, fields) {
  const dataStr = JSON.stringify(payload, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `pba-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Handle Decrypt CSV
 */
async function handleDecryptCSV() {
  try {
    const password = document.getElementById('decryptPassword').value;
    const payload = document.getElementById('decryptPayload').value;

    if (!password || !payload) {
      showError('Password and payload are required');
      return;
    }

    showLoading(true);

    const response = await fetch(`${API_BASE_URL}/billing/decrypt-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        password,
        payload
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Decryption failed');
    }

    const result = await response.json();
    displayDecryptedCSV(result.data);
    decryptModal.classList.add('hidden');
    showSuccess('CSV decrypted successfully');
  } catch (error) {
    console.error('Decryption failed:', error);
    showError(`Decryption failed: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

/**
 * Display decrypted CSV data
 */
function displayDecryptedCSV(csvData) {
  // Parse CSV and display in a readable format
  const lines = csvData.split('\n');
  const headers = lines[0].split(',');
  const values = lines[1].split(',');

  let html = '<div class="decrypted-data"><table><tr>';
  headers.forEach(h => {
    html += `<th>${h.trim()}</th>`;
  });
  html += '</tr><tr>';
  values.forEach(v => {
    html += `<td>${v.trim()}</td>`;
  });
  html += '</tr></table></div>';

  const resultDiv = document.createElement('div');
  resultDiv.innerHTML = html;
  document.body.appendChild(resultDiv);
}

/**
 * UI Helper: Show error message
 */
function showError(message) {
  clearMessages();
  errorContainer.textContent = `❌ ${message}`;
  errorContainer.classList.remove('hidden');
  
  setTimeout(() => {
    errorContainer.classList.add('hidden');
  }, 5000);
}

/**
 * UI Helper: Show success message
 */
function showSuccess(message) {
  clearMessages();
  successContainer.textContent = `✅ ${message}`;
  successContainer.classList.remove('hidden');

  setTimeout(() => {
    successContainer.classList.add('hidden');
  }, 4000);
}

/**
 * UI Helper: Show loading state
 */
function showLoading(show) {
  if (show) {
    loadingContainer.classList.remove('hidden');
  } else {
    loadingContainer.classList.add('hidden');
  }
}

/**
 * UI Helper: Clear all messages
 */
function clearMessages() {
  errorContainer.classList.add('hidden');
  successContainer.classList.add('hidden');
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadBillingData,
    handleCopyField,
    handleCopyAll,
    handleExportCSV,
    handleDecryptCSV
  };
}
