import { generateCookModePrompt } from '../src/generator/cook-mode';
import { EnrichmentResult } from '../src/enrichment/types';
import { AffiliateLink } from '../src/affiliates/types';
import { ParsedRecipe } from '../src/types';

const mockRecipe: ParsedRecipe = {
  frontmatter: {
    title: 'Test Carbonara',
    description: 'High-protein carbonara.',
    author: 'Claude Chef Community',
    prep_time: 'PT10M',
    cook_time: 'PT20M',
    servings: 2,
    calories: 680,
    keywords: ['pasta'],
  },
  ingredients: ['200g spaghetti', '150g guanciale'],
  instructions: ['Boil pasta.', 'Render guanciale.'],
  body: '',
  slug: 'test-carbonara',
  sourceFile: 'test-carbonara.md',
};

const mockEnrichment: EnrichmentResult = {
  ingredients: [
    { ingredient: '200g spaghetti', searchTerm: 'spaghetti pasta' },
    { ingredient: '150g guanciale', searchTerm: 'guanciale' },
  ],
  gear: [{ name: 'Large pot', searchTerm: 'stock pot' }],
  cookingTips: ['Work off-heat.', 'Reserve pasta water.'],
  coachingPrompt: 'Guide me through making carbonara step by step with timing and technique tips.',
};

const mockAffiliateLinks: AffiliateLink[] = [
  { provider: 'Amazon', term: 'spaghetti pasta', url: 'https://amazon.com/s?k=spaghetti+pasta&tag=test-20' },
  { provider: 'Amazon', term: 'guanciale', url: 'https://amazon.com/s?k=guanciale&tag=test-20' },
];

describe('generateCookModePrompt', () => {
  it('should include the recipe title and coaching prompt', () => {
    const prompt = generateCookModePrompt(mockEnrichment, mockAffiliateLinks, mockRecipe);
    expect(prompt).toContain('Test Carbonara');
    expect(prompt).toContain('carbonara step by step');
  });

  it('should include affiliate shopping links', () => {
    const prompt = generateCookModePrompt(mockEnrichment, mockAffiliateLinks, mockRecipe);
    expect(prompt).toContain('amazon.com');
    expect(prompt).toContain('spaghetti+pasta');
  });

  it('should include cooking tips', () => {
    const prompt = generateCookModePrompt(mockEnrichment, mockAffiliateLinks, mockRecipe);
    expect(prompt).toContain('Work off-heat.');
    expect(prompt).toContain('Reserve pasta water.');
  });
});
