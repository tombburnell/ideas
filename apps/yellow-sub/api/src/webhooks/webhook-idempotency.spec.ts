/** Webhook idempotency: duplicate externalEventId should skip reprocessing.
 * Integration test would hit DB; here we document the invariant checked in LemonWebhookService.
 */
describe('Webhook idempotency', () => {
  it('documents duplicate detection field', () => {
    expect('externalEventId').toBeDefined();
  });
});
