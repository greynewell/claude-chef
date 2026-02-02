import * as fs from 'fs';
import * as path from 'path';
import { computeContentHash, readCache, writeCache, isCacheValid } from '../../src/enrichment/cache';
import { CacheEntry, EnrichmentResult } from '../../src/enrichment/types';

const TEST_CACHE_DIR = path.resolve(__dirname, '../../.test-cache');

const mockEnrichment: EnrichmentResult = {
  ingredients: [{ ingredient: 'flour', searchTerm: 'all purpose flour' }],
  gear: [{ name: 'mixing bowl', searchTerm: 'stainless steel mixing bowl' }],
  cookingTips: ['Sift flour for lighter texture'],
  coachingPrompt: 'Follow these steps carefully.',
};

const mockEntry: CacheEntry = {
  contentHash: 'abc1234567890123',
  enrichment: mockEnrichment,
  timestamp: '2024-01-15T00:00:00.000Z',
};

describe('Enrichment Cache', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_CACHE_DIR)) {
      fs.rmSync(TEST_CACHE_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_CACHE_DIR)) {
      fs.rmSync(TEST_CACHE_DIR, { recursive: true });
    }
  });

  it('should compute a deterministic 16-char hex hash', () => {
    const hash = computeContentHash('hello world');
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[a-f0-9]{16}$/);
    // Same input should produce same hash
    expect(computeContentHash('hello world')).toBe(hash);
  });

  it('should produce different hashes for different content', () => {
    const hash1 = computeContentHash('recipe version 1');
    const hash2 = computeContentHash('recipe version 2');
    expect(hash1).not.toBe(hash2);
  });

  it('should return null when cache file does not exist', () => {
    const result = readCache(TEST_CACHE_DIR, 'nonexistent');
    expect(result).toBeNull();
  });

  it('should write and read cache entries', () => {
    writeCache(TEST_CACHE_DIR, 'test-recipe', mockEntry);
    const result = readCache(TEST_CACHE_DIR, 'test-recipe');
    expect(result).toEqual(mockEntry);
  });

  it('should validate cache based on content hash match', () => {
    expect(isCacheValid(null, 'anyhash')).toBe(false);
    expect(isCacheValid(mockEntry, 'abc1234567890123')).toBe(true);
    expect(isCacheValid(mockEntry, 'different_hash__')).toBe(false);
  });
});
