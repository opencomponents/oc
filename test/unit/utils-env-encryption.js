const expect = require('chai').expect;
const injectr = require('injectr');

describe('utils : env-encryption', () => {
  let envEncryption;

  beforeEach(() => {
    envEncryption = injectr(
      '../../dist/utils/env-encryption.js',
      {
        'node:crypto': require('crypto')
      },
      {
        __dirname: __dirname,
        Buffer: Buffer
      }
    );
  });

  describe('when validating encryption key', () => {
    it('should accept a valid 64-character hex key', () => {
      const validKey =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const content = 'API_KEY=secret123\nDB_PASSWORD=password456';

      expect(() => envEncryption.encrypt(content, validKey)).to.not.throw();
    });

    it('should reject an invalid key (too short)', () => {
      const invalidKey = '0123456789abcdef';
      const content = 'API_KEY=secret123';

      expect(() => envEncryption.encrypt(content, invalidKey)).to.throw(
        'Encryption key must be 64 hexadecimal characters (32 bytes)'
      );
    });

    it('should reject an invalid key (non-hex characters)', () => {
      const invalidKey =
        'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';
      const content = 'API_KEY=secret123';

      expect(() => envEncryption.encrypt(content, invalidKey)).to.throw(
        'Encryption key must be 64 hexadecimal characters (32 bytes)'
      );
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted content', () => {
      const encryptedContent =
        'OC_ENCRYPTED_V1:0:dGVzdGl2MTI=:dGVzdGF1dGh0YWcxMjM0NTY=:ZGF0YQ==';

      expect(envEncryption.isEncrypted(encryptedContent)).to.be.true;
    });

    it('should return false for plaintext content', () => {
      const plaintextContent = 'API_KEY=secret123\nDB_PASSWORD=password456';

      expect(envEncryption.isEncrypted(plaintextContent)).to.be.false;
    });
  });

  describe('encrypt and decrypt', () => {
    const validKey =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    it('should encrypt and decrypt content successfully', () => {
      const originalContent = 'API_KEY=secret123\nDB_PASSWORD=password456';

      const encrypted = envEncryption.encrypt(originalContent, validKey);
      const decrypted = envEncryption.decrypt(encrypted, validKey);

      expect(decrypted).to.equal(originalContent);
    });

    it('should produce different ciphertext for same content (due to random IV)', () => {
      const content = 'API_KEY=secret123';

      const encrypted1 = envEncryption.encrypt(content, validKey);
      const encrypted2 = envEncryption.encrypt(content, validKey);

      expect(encrypted1).to.not.equal(encrypted2);
    });

    it('should prepend OC_ENCRYPTED_V1 header to encrypted content', () => {
      const content = 'API_KEY=secret123';

      const encrypted = envEncryption.encrypt(content, validKey);

      expect(encrypted).to.match(/^OC_ENCRYPTED_V1:/);
    });

    it('should throw error when trying to decrypt with wrong key', () => {
      const content = 'API_KEY=secret123';
      const key1 =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const key2 =
        'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

      const encrypted = envEncryption.encrypt(content, key1);

      expect(() => envEncryption.decrypt(encrypted, key2)).to.throw();
    });

    it('should throw error when trying to decrypt plaintext', () => {
      const plaintext = 'API_KEY=secret123';

      expect(() => envEncryption.decrypt(plaintext, validKey)).to.throw(
        'Content is not encrypted or uses an unknown format'
      );
    });

    it('should include key index in encrypted format', () => {
      const content = 'API_KEY=secret123';

      const encrypted = envEncryption.encrypt(content, validKey);
      const parts = encrypted.split(':');

      expect(parts.length).to.equal(5);
      expect(parts[0]).to.equal('OC_ENCRYPTED_V1');
      expect(parts[1]).to.equal('0'); // Single key has index 0
    });
  });

  describe('key rotation with indexed keys', () => {
    const key1 =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const key2 =
      'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    const key3 =
      'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

    it('should encrypt with last key when array provided', () => {
      const content = 'API_KEY=secret123';
      const keys = [key1, key2];

      const encrypted = envEncryption.encrypt(content, keys);
      const parts = encrypted.split(':');

      expect(parts[1]).to.equal('1'); // Index 1 (last key)

      // Should decrypt with just the last key
      const decrypted = envEncryption.decrypt(encrypted, key2);
      expect(decrypted).to.equal(content);
    });

    it('should decrypt using stored key index', () => {
      const content = 'API_KEY=secret123';
      const keys = [key1, key2, key3];

      // Encrypt with key3 (last in array, index 2)
      const encrypted = envEncryption.encrypt(content, keys);

      // Should decrypt successfully using key at stored index
      const decrypted = envEncryption.decrypt(encrypted, keys);
      expect(decrypted).to.equal(content);
    });

    it('should fallback to last key if stored index not in array', () => {
      const content = 'API_KEY=secret123';

      // Encrypt with key2 (last in 2-element array, index 1)
      const encrypted = envEncryption.encrypt(content, [key1, key2]);

      // Now decrypt with just key2 as single key (stored index 1 doesn't exist)
      // Should fallback to trying the only available key
      const decrypted = envEncryption.decrypt(encrypted, key2);
      expect(decrypted).to.equal(content);
    });

    it('should try remaining keys if stored index key fails', () => {
      const content = 'API_KEY=secret123';

      // Encrypt with key2 (index 1 in array)
      const encrypted = envEncryption.encrypt(content, [key1, key2]);

      // Try to decrypt with different keys where stored index has wrong key
      // Should fallback and try key2 (which is last in new array)
      const decrypted = envEncryption.decrypt(encrypted, [key3, key2]);
      expect(decrypted).to.equal(content);
    });

    it('should respect MAX_KEY_ATTEMPTS limit', () => {
      const content = 'API_KEY=secret123';
      const manyKeys = [key1, key2, key3, key1, key2, key3, key1, key2];

      // Encrypt with last key
      const encrypted = envEncryption.encrypt(content, manyKeys);

      // Should successfully decrypt even with many keys
      const decrypted = envEncryption.decrypt(encrypted, manyKeys);
      expect(decrypted).to.equal(content);
    });

    it('should throw error if no keys work', () => {
      const content = 'API_KEY=secret123';

      // Encrypt with key1
      const encrypted = envEncryption.encrypt(content, key1);

      // Try to decrypt with different keys
      expect(() => envEncryption.decrypt(encrypted, [key2, key3])).to.throw(
        'Failed to decrypt'
      );
    });

    it('should handle key rotation workflow', () => {
      const content = 'API_KEY=secret123';

      // Step 1: Start with single key
      const encrypted1 = envEncryption.encrypt(content, key1);

      // Step 2: Rotate to new key (add at end)
      const keys = [key1, key2];
      const encrypted2 = envEncryption.encrypt(content, keys);

      // Step 3: Both should decrypt with key array
      const decrypted1 = envEncryption.decrypt(encrypted1, keys);
      const decrypted2 = envEncryption.decrypt(encrypted2, keys);

      expect(decrypted1).to.equal(content);
      expect(decrypted2).to.equal(content);
    });

    it('should use key index for efficient decryption', () => {
      const content = 'API_KEY=secret123';

      // Encrypt with middle key in array
      const keys = [key1, key2, key3];
      const encrypted = envEncryption.encrypt(content, keys);

      // The stored index should be 2 (last key)
      const parts = encrypted.split(':');
      expect(parts[1]).to.equal('2');

      // Should decrypt successfully
      const decrypted = envEncryption.decrypt(encrypted, keys);
      expect(decrypted).to.equal(content);
    });
  });
});

