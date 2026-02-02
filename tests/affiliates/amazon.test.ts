import { AmazonProvider } from '../../src/affiliates/amazon';

describe('AmazonProvider', () => {
  it('should have the name "Amazon"', () => {
    const provider = new AmazonProvider('test-20');
    expect(provider.name).toBe('Amazon');
  });

  it('should generate a search URL with the affiliate tag', () => {
    const provider = new AmazonProvider('test-20');
    const url = provider.generateLink('cast iron skillet');
    expect(url).toBe('https://www.amazon.com/s?k=cast+iron+skillet&tag=test-20');
  });

  it('should encode special characters in the search term', () => {
    const provider = new AmazonProvider('tag-21');
    const url = provider.generateLink('flour & sugar');
    expect(url).toContain('flour+%26+sugar');
    expect(url).toContain('tag=tag-21');
  });
});
