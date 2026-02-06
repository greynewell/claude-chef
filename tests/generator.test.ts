import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { buildSite } from '../src/generator/index';
import { writeCache } from '../src/enrichment/cache';
import { CacheEntry } from '../src/enrichment/types';

const OUTPUT_DIR = path.resolve(__dirname, '../.test-gen-output');
const RECIPES_DIR = path.resolve(__dirname, '../.test-gen-recipes');
const TEST_ENRICHED_RECIPES_DIR = path.resolve(__dirname, '../.test-enriched-recipes');

const TEST_RECIPE = `---
title: Test Recipe
description: A test recipe for generator tests.
author: Test Author
prep_time: PT10M
cook_time: PT20M
servings: 4
calories: 300
recipe_category: Main Course
cuisine: American
keywords:
  - test
recipe_ingredients:
  - Chicken
  - Flour
flavors:
  - Savory
tools:
  - Oven
skill_level: Easy
---

## Ingredients

- 1 cup flour
- 2 eggs
- 1 lb chicken

## Instructions

1. Mix ingredients.
2. Cook in oven.

## Notes

Test notes.
`;

const SECOND_RECIPE = `---
title: Side Dish Recipe
description: A side dish for testing.
author: Another Author
prep_time: PT5M
cook_time: PT15M
servings: 2
calories: 150
recipe_category: Side Dish
cuisine: Italian
keywords:
  - side
recipe_ingredients:
  - Rice
flavors:
  - Mild
tools:
  - Pot
skill_level: Beginner
---

## Ingredients

- 1 cup rice
- 2 cups water

## Instructions

1. Boil water.
2. Add rice.
`;

/** Remove a directory that may contain thousands of files (fs.rmSync struggles on macOS with large dirs). */
function forceRemoveDir(dir: string): void {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true });
    } catch {
      // Fall back to system rm for large directories
      execSync(`find ${JSON.stringify(dir)} -delete 2>/dev/null || rm -rf ${JSON.stringify(dir)}`);
    }
  }
}

describe('Site Generator (integration)', () => {
  beforeAll(() => {
    forceRemoveDir(OUTPUT_DIR);
    forceRemoveDir(RECIPES_DIR);
    fs.mkdirSync(RECIPES_DIR, { recursive: true });
    fs.writeFileSync(path.join(RECIPES_DIR, 'test-recipe.md'), TEST_RECIPE);
    fs.writeFileSync(path.join(RECIPES_DIR, 'side-dish-recipe.md'), SECOND_RECIPE);
  });

  afterAll(() => {
    forceRemoveDir(OUTPUT_DIR);
    forceRemoveDir(RECIPES_DIR);
  });

  it('should generate HTML files for each recipe', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.html'));
    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(files).toContain('test-recipe.html');
  });

  it('should generate an index.html', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'index.html'))).toBe(true);
  });

  it('should generate a sitemap.xml', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const sitemapPath = path.join(OUTPUT_DIR, 'sitemap.xml');
    expect(fs.existsSync(sitemapPath)).toBe(true);
    const content = fs.readFileSync(sitemapPath, 'utf-8');
    expect(content).toContain('<urlset');
  });

  it('should generate a robots.txt', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const robotsPath = path.join(OUTPUT_DIR, 'robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);
    const content = fs.readFileSync(robotsPath, 'utf-8');
    expect(content).toContain('User-agent');
  });

  it('should include JSON-LD in generated recipe pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'test-recipe.html'), 'utf-8');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"Recipe"');
  });

  it('should strip hyperlinks from recipe body content', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'test-recipe.html'), 'utf-8');
    // Extract article body only - the git-meta and nav elements intentionally have links
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
    expect(articleMatch).not.toBeNull();
    expect(articleMatch![1]).not.toMatch(/href="https?:\/\//);
  });

  it('should generate a CNAME file for custom domain', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const cnamePath = path.join(OUTPUT_DIR, 'CNAME');
    expect(fs.existsSync(cnamePath)).toBe(true);
    const content = fs.readFileSync(cnamePath, 'utf-8').trim();
    expect(content).toBe('claudechef.com');
  });

  it('should use claudechef.com domain in sitemap URLs', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const content = fs.readFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), 'utf-8');
    expect(content).toContain('https://claudechef.com/');
    expect(content).not.toContain('github.io');
  });

  it('should include the footer CTA in all pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    // Check root HTML files
    const rootFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.html'));
    for (const file of rootFiles) {
      const html = fs.readFileSync(path.join(OUTPUT_DIR, file), 'utf-8');
      expect(html).toContain('/plugin marketplace add greynewell/claude-chef');
    }
    // Check subdirectory HTML files (only the 6 current taxonomy types)
    for (const dir of ['category', 'cuisine', 'ingredient', 'flavor', 'tool', 'skill_level']) {
      const subDir = path.join(OUTPUT_DIR, dir);
      if (fs.existsSync(subDir)) {
        const subFiles = fs.readdirSync(subDir).filter(f => f.endsWith('.html'));
        for (const file of subFiles) {
          const html = fs.readFileSync(path.join(subDir, file), 'utf-8');
          expect(html).toContain('/plugin marketplace add greynewell/claude-chef');
        }
      }
    }
  });

  it('should create taxonomy subdirectories', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'category'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'cuisine'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'ingredient'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'flavor'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'tool'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'skill_level'))).toBe(true);
  });

  it('should generate hub pages for actual recipe values', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    // Test recipes have category: Main Course, Side Dish and cuisine: American, Italian
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'category', 'main-course.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'category', 'side-dish.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'cuisine', 'american.html'))).toBe(true);
  });

  it('should generate taxonomy index pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'category', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'cuisine', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'ingredient', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'flavor', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'tool', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'skill_level', 'index.html'))).toBe(true);
  });

  it('should generate hub pages for new taxonomy types', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    // Note: ingredient pages require 3+ recipes per ingredient, which we don't have in tests
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'flavor', 'savory.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'tool', 'oven.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'skill_level', 'easy.html'))).toBe(true);
  });

  it('should include hub pages in sitemap', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const content = fs.readFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), 'utf-8');
    expect(content).toContain('category/main-course.html');
    expect(content).toContain('category/index.html');
    expect(content).toContain('cuisine/american.html');
    // Note: ingredient pages require 3+ recipes per ingredient
    expect(content).toContain('ingredient/index.html');
    expect(content).toContain('flavor/savory.html');
    expect(content).toContain('tool/oven.html');
    expect(content).toContain('skill_level/easy.html');
  });

  it('should include CollectionPage JSON-LD in hub pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'category', 'main-course.html'), 'utf-8');
    expect(html).toContain('CollectionPage');
  });

  it('should include Install, About, and Contribute nav links in all HTML pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const recipeHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'test-recipe.html'), 'utf-8');
    expect(recipeHtml).toContain('/install.html');
    expect(recipeHtml).toContain('Install');
    expect(recipeHtml).toContain('/about.html');
    expect(recipeHtml).toContain('/contribute.html');

    const indexHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'index.html'), 'utf-8');
    expect(indexHtml).toContain('/install.html');
    expect(indexHtml).toContain('Install');
  });

  it('should generate an about.html', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'about.html'))).toBe(true);
  });

  it('should include about.html in sitemap', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const content = fs.readFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), 'utf-8');
    expect(content).toContain('about.html');
  });

  it('should include About nav link in generated pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const indexHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'index.html'), 'utf-8');
    expect(indexHtml).toContain('href="/about.html"');
    expect(indexHtml).toContain('About');

    const recipeHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'test-recipe.html'), 'utf-8');
    expect(recipeHtml).toContain('href="/about.html"');

    const aboutHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'about.html'), 'utf-8');
    expect(aboutHtml).toContain('href="/about.html"');
    expect(aboutHtml).toContain('How Claude Chef Works');
  });

  it('should generate a contribute.html', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'contribute.html'))).toBe(true);
  });

  it('should include contribute.html in sitemap', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const content = fs.readFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), 'utf-8');
    expect(content).toContain('contribute.html');
  });

  it('should include Contribute nav link in generated pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const indexHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'index.html'), 'utf-8');
    expect(indexHtml).toContain('href="/contribute.html"');
    expect(indexHtml).toContain('Contribute');

    const recipeHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'test-recipe.html'), 'utf-8');
    expect(recipeHtml).toContain('href="/contribute.html"');

    const contributeHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'contribute.html'), 'utf-8');
    expect(contributeHtml).toContain('Contribute a Recipe');
  });

  it('should generate a favorites.html', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'favorites.html'))).toBe(true);
  });

  it('should include favorites.html in sitemap', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const content = fs.readFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), 'utf-8');
    expect(content).toContain('favorites.html');
  });

  it('should include Install nav link in generated pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const indexHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'index.html'), 'utf-8');
    expect(indexHtml).toContain('href="/install.html"');
    expect(indexHtml).toContain('Install');

    const recipeHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'test-recipe.html'), 'utf-8');
    expect(recipeHtml).toContain('href="/install.html"');
  });

  it('should generate favorites.html with empty state when no favorites match', async () => {
    // The test recipes dir has no favorites.json, so favorites page shows empty state
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const favHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'favorites.html'), 'utf-8');
    expect(favHtml).toContain('No favorites yet');
  });

  it('should silently ignore invalid slugs in favorites.json', async () => {
    const tempRoot = path.resolve(__dirname, '../.test-invalid-fav-root');
    const tempRecipesDir = path.join(tempRoot, 'recipes');
    const tempOutput = path.join(tempRoot, 'output');
    if (fs.existsSync(tempRoot)) fs.rmSync(tempRoot, { recursive: true });
    fs.mkdirSync(tempRecipesDir, { recursive: true });
    fs.writeFileSync(path.join(tempRecipesDir, 'test-recipe.md'), TEST_RECIPE);
    // Write favorites.json with mix of valid and invalid slugs
    fs.writeFileSync(path.join(tempRoot, 'favorites.json'), '["test-recipe", "nonexistent-recipe"]');
    try {
      await buildSite(tempRecipesDir, tempOutput);
      expect(fs.existsSync(path.join(tempOutput, 'favorites.html'))).toBe(true);
      const favHtml = fs.readFileSync(path.join(tempOutput, 'favorites.html'), 'utf-8');
      // Should include the valid recipe but not crash on the invalid one
      expect(favHtml).toContain('Test Recipe');
      expect(favHtml).not.toContain('nonexistent');
    } finally {
      if (fs.existsSync(tempRoot)) fs.rmSync(tempRoot, { recursive: true });
    }
  });

  it('should contain servings slider in generated recipe pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'test-recipe.html'), 'utf-8');
    expect(html).toContain('servings-slider');
  });

  it('should contain ingredient-list class in generated recipe pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'test-recipe.html'), 'utf-8');
    expect(html).toContain('ingredient-list');
  });

  it('should contain data-base-servings in generated recipe pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'test-recipe.html'), 'utf-8');
    expect(html).toContain('data-base-servings');
  });

  it('should include skill badge on generated recipe pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'test-recipe.html'), 'utf-8');
    expect(html).toContain('skill-badge');
    expect(html).toContain('/skill_level/easy.html');
    expect(html).toContain('Easy');
  });

  it('should include linked taxonomy pills on generated recipe pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'test-recipe.html'), 'utf-8');
    expect(html).toContain('class="meta-pill tax-category"');
    expect(html).toContain('/category/main-course.html');
    expect(html).toContain('/cuisine/american.html');
    expect(html).toContain('/flavor/savory.html');
    expect(html).toContain('/tool/oven.html');
  });

  it('should generate ingredient index page with description', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    // Ingredient hub pages require 3+ recipes per ingredient, but the index always exists
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'ingredient', 'index.html'), 'utf-8');
    expect(html).toContain('Find recipes by key ingredient');
  });

  it('should include recipe-byline on generated recipe pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'test-recipe.html'), 'utf-8');
    expect(html).toContain('recipe-byline');
  });

  it('should use Person type in JSON-LD on generated recipe pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'test-recipe.html'), 'utf-8');
    expect(html).toContain('"@type":"Person"');
  });

  it('should use friendly indexDescription in taxonomy index pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'ingredient', 'index.html'), 'utf-8');
    expect(html).toContain('Find recipes by key ingredient');
  });

  it('should generate llms.txt with expected content', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const llmsPath = path.join(OUTPUT_DIR, 'llms.txt');
    expect(fs.existsSync(llmsPath)).toBe(true);
    const content = fs.readFileSync(llmsPath, 'utf-8');
    expect(content).toContain('# Claude Chef');
    expect(content).toContain('## Recipes');
    expect(content).toContain('## Categories');
    expect(content).toContain('## Cuisines');
  });

  it('should generate feed.xml with valid RSS', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const feedPath = path.join(OUTPUT_DIR, 'feed.xml');
    expect(fs.existsSync(feedPath)).toBe(true);
    const content = fs.readFileSync(feedPath, 'utf-8');
    expect(content).toContain('<rss version="2.0"');
    expect(content).toContain('<channel>');
    expect(content).toContain('<item>');
  });

  it('should generate per-category feed.xml files', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const categoryFeedPath = path.join(OUTPUT_DIR, 'category', 'main-course', 'feed.xml');
    expect(fs.existsSync(categoryFeedPath)).toBe(true);
    const content = fs.readFileSync(categoryFeedPath, 'utf-8');
    expect(content).toContain('<rss version="2.0"');
    expect(content).toContain('Main Course');
  });

  it('should include footer links in generated HTML pages', async () => {
    await buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'index.html'), 'utf-8');
    expect(html).toContain('footer-links');
    expect(html).toContain('href="/sitemap.xml"');
    expect(html).toContain('href="/llms.txt"');
    expect(html).toContain('href="/feed.xml"');
  });

  it('should not include enrichment sections when no cache exists', async () => {
    const noCacheRecipesDir = path.resolve(__dirname, '../.test-no-cache-recipes');
    const noCacheOutput = path.resolve(__dirname, '../.test-no-cache-output');
    if (fs.existsSync(noCacheRecipesDir)) fs.rmSync(noCacheRecipesDir, { recursive: true });
    if (fs.existsSync(noCacheOutput)) fs.rmSync(noCacheOutput, { recursive: true });
    fs.mkdirSync(noCacheRecipesDir, { recursive: true });
    // Copy a recipe without any cache
    fs.writeFileSync(path.join(noCacheRecipesDir, 'test-recipe.md'), TEST_RECIPE);
    try {
      await buildSite(noCacheRecipesDir, noCacheOutput);
      const html = fs.readFileSync(path.join(noCacheOutput, 'test-recipe.html'), 'utf-8');
      expect(html).not.toContain('Shop Ingredients');
      expect(html).not.toContain('Cook with AI');
    } finally {
      if (fs.existsSync(noCacheRecipesDir)) fs.rmSync(noCacheRecipesDir, { recursive: true });
      if (fs.existsSync(noCacheOutput)) fs.rmSync(noCacheOutput, { recursive: true });
    }
  });

  it('should include enrichment sections when cache exists', async () => {
    // Set up a temp recipes dir with one recipe and a cache
    const enrichedOutput = path.resolve(__dirname, '../.test-enriched-output');
    if (fs.existsSync(TEST_ENRICHED_RECIPES_DIR)) {
      fs.rmSync(TEST_ENRICHED_RECIPES_DIR, { recursive: true });
    }
    if (fs.existsSync(enrichedOutput)) {
      fs.rmSync(enrichedOutput, { recursive: true });
    }
    fs.mkdirSync(TEST_ENRICHED_RECIPES_DIR, { recursive: true });

    // Write a test recipe
    fs.writeFileSync(path.join(TEST_ENRICHED_RECIPES_DIR, 'test-recipe.md'), TEST_RECIPE);

    // Write a cache entry
    const cacheDir = path.join(TEST_ENRICHED_RECIPES_DIR, '.cache');
    const { computeContentHash } = require('../src/enrichment/cache');
    const hash = computeContentHash(TEST_RECIPE);
    const cacheEntry: CacheEntry = {
      contentHash: hash,
      enrichment: {
        ingredients: [{ ingredient: '1 cup flour', searchTerm: 'all purpose flour', normalizedName: 'Flour' }],
        gear: [{ name: 'Large oven', searchTerm: 'oven' }],
        cookingTips: ['Preheat oven'],
        coachingPrompt: 'Guide me through this recipe.',
      },
      timestamp: new Date().toISOString(),
    };
    writeCache(cacheDir, 'test-recipe', cacheEntry);

    // Set env var for affiliate
    const origTag = process.env.AMAZON_AFFILIATE_TAG;
    process.env.AMAZON_AFFILIATE_TAG = 'test-20';

    try {
      await buildSite(TEST_ENRICHED_RECIPES_DIR, enrichedOutput);
      const html = fs.readFileSync(path.join(enrichedOutput, 'test-recipe.html'), 'utf-8');
      expect(html).toContain('Shop Ingredients');
      expect(html).toContain('Gear');
      expect(html).toContain('Cook with AI');
      expect(html).toContain('amazon.com');
    } finally {
      // Cleanup
      if (origTag !== undefined) {
        process.env.AMAZON_AFFILIATE_TAG = origTag;
      } else {
        delete process.env.AMAZON_AFFILIATE_TAG;
      }
      if (fs.existsSync(TEST_ENRICHED_RECIPES_DIR)) {
        fs.rmSync(TEST_ENRICHED_RECIPES_DIR, { recursive: true });
      }
      if (fs.existsSync(enrichedOutput)) {
        fs.rmSync(enrichedOutput, { recursive: true });
      }
    }
  });
});
