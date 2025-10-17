import crypto from 'node:crypto';

const ENCRYPTION_VERSION = 'OC_ENCRYPTED_V1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTE_LENGTH = 12; // 12 bytes for GCM
const MAX_KEY_ATTEMPTS = 5; // Maximum number of keys to try during decryption

/**
 * Validates that the encryption key is properly formatted (32 bytes / 64 hex chars)
 */
export function validateEncryptionKey(key: string): boolean {
  const cleanKey = key.trim();

  return /^[0-9a-fA-F]{64}$/.test(cleanKey);
}

/**
 * Checks if content is encrypted by looking for the version header
 */
export function isEncrypted(content: string): boolean {
  return content.startsWith(`${ENCRYPTION_VERSION}:`);
}

/**
 * Encrypts content using AES-256-GCM
 * If array of keys provided, uses the LAST key (most recent) and stores its index
 * Returns format: OC_ENCRYPTED_V1:{keyIndex}:{iv_base64}:{authTag_base64}:{encryptedData_base64}
 */
export function encrypt(content: string, keys: string | string[]): string {
  // Use last key if array (most recent), otherwise use the single key
  const keyList = Array.isArray(keys) ? keys : [keys];
  const keyIndex = keyList.length - 1;
  const primaryKey = keyList[keyIndex];

  if (!validateEncryptionKey(primaryKey)) {
    throw new Error('Invalid encryption key');
  }

  // Generate random IV
  const iv = crypto.randomBytes(IV_BYTE_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(primaryKey, 'hex'),
    iv
  );

  // Encrypt the content
  let encrypted = cipher.update(content, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Combine into our format with key index
  return `${ENCRYPTION_VERSION}:${keyIndex}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts content that was encrypted with the encrypt function
 * Tries keys intelligently based on stored key index, with fallback to other keys
 * Expects format: OC_ENCRYPTED_V1:{keyIndex}:{iv_base64}:{authTag_base64}:{encryptedData_base64}
 */
export function decrypt(content: string, keys: string | string[]): string {
  // Check for encrypted header
  if (!isEncrypted(content)) {
    throw new Error('Content is not encrypted or uses an unknown format');
  }

  // Parse the encrypted content
  const parts = content.split(':');
  if (parts.length !== 5) {
    throw new Error('Invalid encrypted content format');
  }

  const [version, storedKeyIndex, ivBase64, authTagBase64, encryptedData] =
    parts;

  if (version !== ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  // Decode components
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const keyIndex = parseInt(storedKeyIndex, 10);

  // Convert to array for consistent handling
  const keyList = Array.isArray(keys) ? keys : [keys];

  // Build smart key attempt order
  const keysToTry: string[] = [];
  const triedIndices = new Set<number>();

  // 1. Try the key at stored index first (most likely to work)
  if (keyIndex >= 0 && keyIndex < keyList.length) {
    keysToTry.push(keyList[keyIndex]);
    triedIndices.add(keyIndex);
  }

  // 2. Try the last key (current/most recent) if not already tried
  const lastIndex = keyList.length - 1;
  if (!triedIndices.has(lastIndex)) {
    keysToTry.push(keyList[lastIndex]);
    triedIndices.add(lastIndex);
  }

  // 3. Try remaining keys (newest to oldest), respecting MAX_KEY_ATTEMPTS limit
  for (
    let i = keyList.length - 1;
    i >= 0 && keysToTry.length < MAX_KEY_ATTEMPTS;
    i--
  ) {
    if (!triedIndices.has(i)) {
      keysToTry.push(keyList[i]);
      triedIndices.add(i);
    }
  }

  // Try each key
  let lastError: Error | null = null;

  for (const key of keysToTry) {
    try {
      // Create decipher
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(key, 'hex'),
        iv
      );

      // Set auth tag
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (err) {
      // This key didn't work, try next one
      lastError = err as Error;
    }
  }

  // None of the keys worked
  throw new Error(
    `Failed to decrypt: tried ${keysToTry.length} key(s). ${lastError?.message || 'Unknown error'}`
  );
}
