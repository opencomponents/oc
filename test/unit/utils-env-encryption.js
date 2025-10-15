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
        'OC_ENCRYPTED_V1:dGVzdGl2MTI=:dGVzdGF1dGh0YWcxMjM0NTY=:ZGF0YQ==';

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
  });
});

