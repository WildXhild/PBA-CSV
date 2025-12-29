/**
 * Encryption Module - AES-256-GCM with PBKDF2 Key Derivation
 * 
 * This module provides secure encryption/decryption of sensitive payment data
 * using industry-standard algorithms and practices.
 * 
 * Security Considerations:
 * - Uses Web Crypto API (browser) or Node.js crypto module
 * - AES-256-GCM for authenticated encryption
 * - PBKDF2 with SHA-256 for key derivation
 * - Random IV/nonce generation for each encryption
 * - Constant-time comparison where applicable
 */

const crypto = require('crypto');

/**
 * Configuration for encryption operations
 */
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32, // 256 bits
  ivLength: 16, // 128 bits (GCM nonce)
  tagLength: 16, // 128 bits
  saltLength: 32, // 256 bits
  pbkdf2Iterations: 100000,
  pbkdf2Digest: 'sha256'
};

/**
 * Derives an encryption key from a password using PBKDF2
 * @param {string} password - User-provided password
 * @param {Buffer} salt - Random salt (if not provided, generated)
 * @returns {Promise<{key: Buffer, salt: Buffer}>} - Derived key and salt
 */
async function deriveKeyFromPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);
  }

  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      ENCRYPTION_CONFIG.pbkdf2Iterations,
      ENCRYPTION_CONFIG.keyLength,
      ENCRYPTION_CONFIG.pbkdf2Digest,
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve({ key: derivedKey, salt });
      }
    );
  });
}

/**
 * Encrypts data using AES-256-GCM
 * @param {string|Buffer} data - Data to encrypt
 * @param {Buffer} key - Encryption key (32 bytes)
 * @param {Buffer} iv - Optional IV (if not provided, randomly generated)
 * @returns {{ciphertext: Buffer, iv: Buffer, tag: Buffer, algorithm: string}}
 */
function encryptData(data, key, iv = null) {
  // Validate inputs
  if (!key || key.length !== ENCRYPTION_CONFIG.keyLength) {
    throw new Error(`Key must be ${ENCRYPTION_CONFIG.keyLength} bytes`);
  }

  // Generate random IV if not provided
  if (!iv) {
    iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
  }

  // Create cipher
  const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);

  // Encrypt data
  const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
  let ciphertext = cipher.update(dataBuffer);
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);

  // Get authentication tag
  const tag = cipher.getAuthTag();

  return {
    ciphertext,
    iv,
    tag,
    algorithm: ENCRYPTION_CONFIG.algorithm
  };
}

/**
 * Decrypts data encrypted with AES-256-GCM
 * @param {Buffer} ciphertext - Encrypted data
 * @param {Buffer} key - Decryption key (32 bytes)
 * @param {Buffer} iv - IV used during encryption
 * @param {Buffer} tag - Authentication tag
 * @returns {string} - Decrypted plaintext
 */
function decryptData(ciphertext, key, iv, tag) {
  // Validate inputs
  if (!key || key.length !== ENCRYPTION_CONFIG.keyLength) {
    throw new Error(`Key must be ${ENCRYPTION_CONFIG.keyLength} bytes`);
  }

  if (!iv || iv.length !== ENCRYPTION_CONFIG.ivLength) {
    throw new Error(`IV must be ${ENCRYPTION_CONFIG.ivLength} bytes`);
  }

  if (!tag || tag.length !== ENCRYPTION_CONFIG.tagLength) {
    throw new Error(`Tag must be ${ENCRYPTION_CONFIG.tagLength} bytes`);
  }

  // Create decipher
  const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
  decipher.setAuthTag(tag);

  // Decrypt data
  let plaintext = decipher.update(ciphertext);
  plaintext = Buffer.concat([plaintext, decipher.final()]);

  return plaintext.toString('utf-8');
}

/**
 * Complete encryption workflow: password -> key derivation -> encryption
 * @param {string|Buffer} data - Data to encrypt
 * @param {string} password - User password for key derivation
 * @returns {Promise<{encrypted: Buffer, iv: Buffer, tag: Buffer, salt: Buffer}>}
 */
async function encryptWithPassword(data, password) {
  try {
    // Derive key from password
    const { key, salt } = await deriveKeyFromPassword(password);

    // Encrypt data
    const { ciphertext, iv, tag } = encryptData(data, key);

    return {
      encrypted: ciphertext,
      iv,
      tag,
      salt,
      algorithm: ENCRYPTION_CONFIG.algorithm
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Complete decryption workflow: password -> key derivation -> decryption
 * @param {Buffer} ciphertext - Encrypted data
 * @param {string} password - User password
 * @param {Buffer} salt - Salt used in key derivation
 * @param {Buffer} iv - IV used during encryption
 * @param {Buffer} tag - Authentication tag
 * @returns {Promise<string>} - Decrypted plaintext
 */
async function decryptWithPassword(ciphertext, password, salt, iv, tag) {
  try {
    // Derive key from password using same salt
    const { key } = await deriveKeyFromPassword(password, salt);

    // Decrypt data
    const plaintext = decryptData(ciphertext, key, iv, tag);

    return plaintext;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Encrypts CSV data and returns as downloadable blob payload
 * @param {string} csvData - CSV formatted string
 * @param {string} password - Encryption password
 * @returns {Promise<{payload: string, metadata: {algorithm: string, iterations: number}}>}
 */
async function encryptCSVData(csvData, password) {
  try {
    const { encrypted, iv, tag, salt } = await encryptWithPassword(csvData, password);

    // Create a combined payload: salt|iv|tag|ciphertext (all base64 encoded for transport)
    const payload = JSON.stringify({
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ciphertext: encrypted.toString('base64'),
      algorithm: ENCRYPTION_CONFIG.algorithm,
      iterations: ENCRYPTION_CONFIG.pbkdf2Iterations
    });

    return {
      payload,
      metadata: {
        algorithm: ENCRYPTION_CONFIG.algorithm,
        iterations: ENCRYPTION_CONFIG.pbkdf2Iterations
      }
    };
  } catch (error) {
    throw new Error(`CSV encryption failed: ${error.message}`);
  }
}

/**
 * Decrypts CSV payload
 * @param {string} payload - JSON payload containing encrypted data
 * @param {string} password - Decryption password
 * @returns {Promise<string>} - Decrypted CSV data
 */
async function decryptCSVData(payload, password) {
  try {
    const data = JSON.parse(payload);

    const ciphertext = Buffer.from(data.ciphertext, 'base64');
    const salt = Buffer.from(data.salt, 'base64');
    const iv = Buffer.from(data.iv, 'base64');
    const tag = Buffer.from(data.tag, 'base64');

    const csvData = await decryptWithPassword(ciphertext, password, salt, iv, tag);

    return csvData;
  } catch (error) {
    throw new Error(`CSV decryption failed: ${error.message}`);
  }
}

/**
 * Generates a secure random password for internal use
 * @param {number} length - Password length (default: 32)
 * @returns {string} - Random password
 */
function generateSecurePassword(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

module.exports = {
  deriveKeyFromPassword,
  encryptData,
  decryptData,
  encryptWithPassword,
  decryptWithPassword,
  encryptCSVData,
  decryptCSVData,
  generateSecurePassword,
  ENCRYPTION_CONFIG
};
