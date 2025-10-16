import crypto from 'node:crypto';

const ENCRYPTION_VERSION = 'OC_ENCRYPTED_V1';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes for GCM

/**
 * Checks if content is encrypted by looking for the version header
 */
export function isEncrypted(content: string): boolean {
  return content.startsWith(`${ENCRYPTION_VERSION}:`);
}

/**
 * Encrypts content using AES-256-GCM
 * Returns format: OC_ENCRYPTED_V1:{iv_base64}:{authTag_base64}:{encryptedData_base64}
 */
export function encrypt(content: string, key: string): string {
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);

  // Encrypt the content
  let encrypted = cipher.update(content, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Combine into our format
  return `${ENCRYPTION_VERSION}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts content that was encrypted with the encrypt function
 * Expects format: OC_ENCRYPTED_V1:{iv_base64}:{authTag_base64}:{encryptedData_base64}
 */
export function decrypt(content: string, key: string): string {
  // Check for encrypted header
  if (!isEncrypted(content)) {
    throw new Error('Content is not encrypted or uses an unknown format');
  }

  // Parse the encrypted content
  const parts = content.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted content format');
  }

  const [version, ivBase64, authTagBase64, encryptedData] = parts;

  if (version !== ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  // Decode components
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

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
}
