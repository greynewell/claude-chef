import { buildProviders } from '../../src/affiliates/registry';

describe('buildProviders', () => {
  it('should return empty array when no env vars are set', () => {
    const providers = buildProviders({});
    expect(providers).toHaveLength(0);
  });

  it('should include Amazon provider when AMAZON_AFFILIATE_TAG is set', () => {
    const providers = buildProviders({ AMAZON_AFFILIATE_TAG: 'test-20' });
    expect(providers).toHaveLength(1);
    expect(providers[0].name).toBe('Amazon');
  });

  it('should include both providers when all env vars are set', () => {
    const providers = buildProviders({
      AMAZON_AFFILIATE_TAG: 'test-20',
      WALMART_AFFILIATE_ID: 'impact-123',
    });
    expect(providers).toHaveLength(2);
    const names = providers.map(p => p.name);
    expect(names).toContain('Amazon');
    expect(names).toContain('Walmart');
  });
});
