import * as crypto from 'crypto';

const DEFAULT_SECRET = 'dore-user-fallback-secret';

function getKey(): Buffer {
  const rawKey = process.env.USER_DATA_ENCRYPTION_KEY || DEFAULT_SECRET;
  // AES-256 requires 32 byte key. We derive one deterministically from the raw key.
  return crypto.createHash('sha256').update(rawKey).digest();
}

function getIv(): Buffer {
  return crypto.randomBytes(16);
}

export function encryptText(plainText: string): string {
  if (!plainText) {
    return plainText;
  }

  const iv = getIv();
  const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);

  return `${iv.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptText(cipherText: string): string {
  if (!cipherText) {
    return cipherText;
  }

  const [ivBase64, payloadBase64] = cipherText.split(':');

  if (!ivBase64 || !payloadBase64) {
    throw new Error('Invalid cipher text format');
  }

  const iv = Buffer.from(ivBase64, 'base64');
  const encrypted = Buffer.from(payloadBase64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
