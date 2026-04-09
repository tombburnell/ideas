import { BillingProvider } from '@prisma/client';
import { LemonBillingAdapter } from './lemon.adapter';

describe('LemonBillingAdapter', () => {
  it('exposes Lemon provider', () => {
    const a = new LemonBillingAdapter({} as never, {} as never);
    expect(a.provider).toBe(BillingProvider.LEMON_SQUEEZY);
  });
});
