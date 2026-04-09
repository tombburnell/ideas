import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import type { AppConfiguration } from '../../config/configuration';

const PREFIX = 'v1';
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

@Injectable()
export class CredentialsCryptoService implements OnModuleInit {
  private key: Buffer | null = null;

  constructor(private readonly config: ConfigService<AppConfiguration, true>) {}

  onModuleInit(): void {
    const hex = this.config.get('credentialsEncryptionKeyHex', { infer: true });
    if (!hex) {
      if (this.config.get('nodeEnv', { infer: true }) === 'production') {
        throw new Error('CREDENTIALS_ENCRYPTION_KEY is required in production');
      }
      return;
    }
    const buf = Buffer.from(hex, 'hex');
    if (buf.length !== KEY_LEN) {
      throw new Error(`CREDENTIALS_ENCRYPTION_KEY must be ${KEY_LEN} bytes (${KEY_LEN * 2} hex chars)`);
    }
    this.key = buf;
  }

  encryptJson(obj: Record<string, unknown>): string {
    const key = this.requireKey();
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
    const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    const out = Buffer.concat([iv, tag, enc]);
    return `${PREFIX}:${out.toString('base64')}`;
  }

  decryptJson<T extends Record<string, unknown>>(ciphertext: string): T {
    const key = this.requireKey();
    if (!ciphertext.startsWith(`${PREFIX}:`)) {
      throw new Error('Invalid encrypted payload prefix');
    }
    const raw = Buffer.from(ciphertext.slice(PREFIX.length + 1), 'base64');
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const data = raw.subarray(IV_LEN + TAG_LEN);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(dec.toString('utf8')) as T;
  }

  private requireKey(): Buffer {
    if (!this.key) {
      throw new Error('CREDENTIALS_ENCRYPTION_KEY is not configured');
    }
    return this.key;
  }
}
