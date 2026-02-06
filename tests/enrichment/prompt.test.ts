import { buildEnrichmentPrompt, parseEnrichmentResponse } from '../../src/enrichment/prompt';
import { ParsedRecipe } from '../../src/types';

const mockRecipe: ParsedRecipe = {
  frontmatter: {
    title: 'Test Carbonara',
    description: 'A high-protein carbonara.',
    author: 'Claude Chef Community',
    prep_time: 'PT10M',
    cook_time: 'PT20M',
    servings: 2,
    calories: 680,
    keywords: ['pasta', 'Italian'],
  },
  ingredients: ['200g spaghetti', '150g guanciale', '4 egg yolks', '80g Pecorino Romano'],
  instructions: ['Boil pasta.', 'Render guanciale.', 'Mix eggs and cheese.', 'Combine off heat.'],
  body: '## Ingredients\n\n- 200g spaghetti\n- 150g guanciale\n\n## Instructions\n\n1. Boil pasta.',
  faqs: [],
  slug: 'test-carbonara',
  sourceFile: 'test-carbonara.md',
};

const validLlmResponse = JSON.stringify({
  ingredients: [
    { ingredient: '200g spaghetti', searchTerm: 'spaghetti pasta', normalizedName: 'Spaghetti' },
    { ingredient: '150g guanciale', searchTerm: 'guanciale Italian cured pork', normalizedName: 'Guanciale' },
  ],
  gear: [
    { name: 'Large pot', searchTerm: 'large stock pot' },
    { name: 'Heavy skillet', searchTerm: 'cast iron skillet' },
  ],
  cookingTips: [
    'Work off-heat when adding egg mixture.',
    'Reserve pasta water for sauce consistency.',
  ],
  coachingPrompt: 'Guide me through making carbonara step by step.',
});

describe('Enrichment Prompt', () => {
  it('should build a prompt containing the recipe title and ingredients', () => {
    const prompt = buildEnrichmentPrompt(mockRecipe);
    expect(prompt).toContain('Test Carbonara');
    expect(prompt).toContain('200g spaghetti');
    expect(prompt).toContain('150g guanciale');
    expect(prompt).toContain('JSON');
  });

  it('should include instructions in the prompt', () => {
    const prompt = buildEnrichmentPrompt(mockRecipe);
    expect(prompt).toContain('Boil pasta');
    expect(prompt).toContain('Render guanciale');
  });

  it('should parse a valid JSON LLM response', () => {
    const result = parseEnrichmentResponse(validLlmResponse);
    expect(result.ingredients).toHaveLength(2);
    expect(result.gear).toHaveLength(2);
    expect(result.cookingTips).toHaveLength(2);
    expect(result.coachingPrompt).toContain('carbonara');
    expect(result.ingredients[0].searchTerm).toBe('spaghetti pasta');
  });

  it('should throw on invalid JSON response', () => {
    expect(() => parseEnrichmentResponse('not json')).toThrow();
    expect(() => parseEnrichmentResponse('{}')).toThrow();
  });
});
