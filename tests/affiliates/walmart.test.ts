import { WalmartProvider } from '../../src/affiliates/walmart';

describe('WalmartProvider', () => {
  it('should have the name "Walmart"', () => {
    const provider = new WalmartProvider();
    expect(provider.name).toBe('Walmart');
  });

  it('should generate a search URL', () => {
    const provider = new WalmartProvider();
    const url = provider.generateLink('spaghetti pasta');
    expect(url).toBe('https://www.walmart.com/search?q=spaghetti+pasta');
  });

  it('should include affiliate ID when provided', () => {
    const provider = new WalmartProvider('impact-123');
    const url = provider.generateLink('eggs');
    expect(url).toContain('q=eggs');
    expect(url).toContain('affiliateId=impact-123');
  });
});
