import * as fs from 'fs';
import * as path from 'path';
import { enrichRecipe } from '../../src/enrichment/enricher';
import { LlmClient, EnrichmentResult } from '../../src/enrichment/types';
import { ParsedRecipe } from '../../src/types';

const TEST_CACHE_DIR = path.resolve(__dirname, '../../.test-enricher-cache');

const mockEnrichment: EnrichmentResult = {
  ingredients: [{ ingredient: 'flour', searchTerm: 'all purpose flour' }],
  gear: [{ name: 'bowl', searchTerm: 'mixing bowl' }],
  cookingTips: ['Tip 1'],
  coachingPrompt: 'Step by step guide.',
};

const mockLlmResponse = JSON.stringify(mockEnrichment);

const mockClient: LlmClient = {
  complete: jest.fn().mockResolvedValue(mockLlmResponse),
};

const mockRecipe: ParsedRecipe = {
  frontmatter: {
    title: 'Test Recipe',
    description: 'Test desc.',
    author: 'Test',
    prep_time: 'PT5M',
    cook_time: 'PT10M',
    servings: 1,
    calories: 200,
    keywords: ['test'],
  },
  ingredients: ['flour'],
  instructions: ['Mix.'],
  body: '## Ingredients\n\n- flour\n\n## Instructions\n\n1. Mix.',
  slug: 'test-recipe',
  sourceFile: 'test-recipe.md',
};

const recipeContent = '---\ntitle: Test\n---\n## Ingredients\n- flour';

describe('enrichRecipe', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_CACHE_DIR)) {
      fs.rmSync(TEST_CACHE_DIR, { recursive: true });
    }
    (mockClient.complete as jest.Mock).mockClear();
  });

  afterAll(() => {
    if (fs.existsSync(TEST_CACHE_DIR)) {
      fs.rmSync(TEST_CACHE_DIR, { recursive: true });
    }
  });

  it('should call LLM and cache the result when no cache exists', async () => {
    const result = await enrichRecipe(mockRecipe, recipeContent, mockClient, TEST_CACHE_DIR);
    expect(mockClient.complete).toHaveBeenCalledTimes(1);
    expect(result.ingredients).toHaveLength(1);
    expect(result.ingredients[0].searchTerm).toBe('all purpose flour');
    // Cache file should exist
    const cacheFile = path.join(TEST_CACHE_DIR, 'test-recipe.json');
    expect(fs.existsSync(cacheFile)).toBe(true);
  });

  it('should return cached result without calling LLM when cache is valid', async () => {
    // First call populates cache
    await enrichRecipe(mockRecipe, recipeContent, mockClient, TEST_CACHE_DIR);
    (mockClient.complete as jest.Mock).mockClear();

    // Second call should use cache
    const result = await enrichRecipe(mockRecipe, recipeContent, mockClient, TEST_CACHE_DIR);
    expect(mockClient.complete).not.toHaveBeenCalled();
    expect(result.ingredients).toHaveLength(1);
  });

  it('should re-enrich when content has changed', async () => {
    // First call
    await enrichRecipe(mockRecipe, recipeContent, mockClient, TEST_CACHE_DIR);
    (mockClient.complete as jest.Mock).mockClear();

    // Call with different content
    const changedContent = recipeContent + '\n- sugar';
    const result = await enrichRecipe(mockRecipe, changedContent, mockClient, TEST_CACHE_DIR);
    expect(mockClient.complete).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it('should propagate LLM errors', async () => {
    const failingClient: LlmClient = {
      complete: jest.fn().mockRejectedValue(new Error('API error')),
    };
    await expect(
      enrichRecipe(mockRecipe, recipeContent, failingClient, TEST_CACHE_DIR)
    ).rejects.toThrow('API error');
  });
});
