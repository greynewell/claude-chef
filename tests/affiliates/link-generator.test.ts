import { generateAffiliateLinks } from '../../src/affiliates/link-generator';
import { AffiliateProvider } from '../../src/affiliates/types';
import { EnrichmentResult } from '../../src/enrichment/types';

const mockEnrichment: EnrichmentResult = {
  ingredients: [
    { ingredient: '200g spaghetti', searchTerm: 'spaghetti pasta', normalizedName: 'Spaghetti' },
    { ingredient: '150g guanciale', searchTerm: 'guanciale Italian pork', normalizedName: 'Guanciale' },
  ],
  gear: [
    { name: 'Large pot', searchTerm: 'large stock pot' },
  ],
  cookingTips: ['Tip'],
  coachingPrompt: 'Guide',
};

const mockProvider: AffiliateProvider = {
  name: 'TestStore',
  generateLink: (term: string) => `https://test.com/s?q=${encodeURIComponent(term)}`,
};

describe('generateAffiliateLinks', () => {
  it('should generate links for all ingredients and gear', () => {
    const links = generateAffiliateLinks(mockEnrichment, [mockProvider]);
    // 2 ingredients + 1 gear = 3 links
    expect(links).toHaveLength(3);
  });

  it('should include provider name in each link', () => {
    const links = generateAffiliateLinks(mockEnrichment, [mockProvider]);
    for (const link of links) {
      expect(link.provider).toBe('TestStore');
    }
  });

  it('should generate links from multiple providers', () => {
    const secondProvider: AffiliateProvider = {
      name: 'OtherStore',
      generateLink: (term: string) => `https://other.com/s?q=${encodeURIComponent(term)}`,
    };
    const links = generateAffiliateLinks(mockEnrichment, [mockProvider, secondProvider]);
    // (2 ingredients + 1 gear) * 2 providers = 6 links
    expect(links).toHaveLength(6);
    const providers = new Set(links.map(l => l.provider));
    expect(providers.size).toBe(2);
  });
});
