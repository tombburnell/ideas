import { ConfigService } from '@nestjs/config';
import { CredentialsCryptoService } from './credentials-crypto.service';

describe('CredentialsCryptoService', () => {
  const key = Buffer.alloc(32, 7).toString('hex');

  function svc(): CredentialsCryptoService {
    const config = {
      get: (k: string) => {
        if (k === 'credentialsEncryptionKeyHex') return key;
        if (k === 'nodeEnv') return 'test';
        return '';
      },
    } as unknown as ConfigService;
    const s = new CredentialsCryptoService(config as never);
    s.onModuleInit();
    return s;
  }

  it('round-trips JSON', () => {
    const s = svc();
    const enc = s.encryptJson({ apiKey: 'secret', storeId: '1' });
    const dec = s.decryptJson(enc);
    expect(dec).toEqual({ apiKey: 'secret', storeId: '1' });
  });
});
