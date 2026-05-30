// ============================================
// ENCRYPTION SERVICE TESTS
// ============================================

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { encrypt, decrypt } from '../encryption';

describe('Encryption Service', () => {
  it('should encrypt and decrypt plaintext correctly', () => {
    const plaintext = 'my-secret-api-key-12345';
    const encrypted = encrypt(plaintext);

    assert.ok(encrypted.iv);
    assert.ok(encrypted.salt);
    assert.ok(encrypted.authTag);
    assert.ok(encrypted.ciphertext);
    assert.notStrictEqual(encrypted.ciphertext, plaintext);

    const decrypted = decrypt(encrypted);
    assert.strictEqual(decrypted, plaintext);
  });

  it('should produce different ciphertexts for same plaintext', () => {
    const plaintext = 'same-text';
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);

    assert.notStrictEqual(encrypted1.ciphertext, encrypted2.ciphertext);
    assert.notStrictEqual(encrypted1.iv, encrypted2.iv);
    assert.notStrictEqual(encrypted1.salt, encrypted2.salt);

    assert.strictEqual(decrypt(encrypted1), plaintext);
    assert.strictEqual(decrypt(encrypted2), plaintext);
  });

  it('should handle empty string', () => {
    const encrypted = encrypt('');
    const decrypted = decrypt(encrypted);
    assert.strictEqual(decrypted, '');
  });

  it('should handle unicode characters', () => {
    const plaintext = '🔐 clave secreta español ñ';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    assert.strictEqual(decrypted, plaintext);
  });
});
