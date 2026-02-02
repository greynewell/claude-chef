import * as fs from 'fs';
import * as path from 'path';
import { buildSite } from '../src/generator/index';
import { writeCache } from '../src/enrichment/cache';
import { CacheEntry } from '../src/enrichment/types';

const OUTPUT_DIR = path.resolve(__dirname, '../.test-output');
const RECIPES_DIR = path.resolve(__dirname, '../recipes');
const TEST_ENRICHED_RECIPES_DIR = path.resolve(__dirname, '../.test-enriched-recipes');

describe('Site Generator (integration)', () => {
  beforeAll(() => {
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(OUTPUT_DIR)) {
      fs.rmSync(OUTPUT_DIR, { recursive: true });
    }
  });

  it('should generate HTML files for each recipe', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.html'));
    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(files).toContain('teriyaki-and-sesame-seed-chicken.html');
  });

  it('should generate an index.html', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'index.html'))).toBe(true);
  });

  it('should generate a sitemap.xml', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const sitemapPath = path.join(OUTPUT_DIR, 'sitemap.xml');
    expect(fs.existsSync(sitemapPath)).toBe(true);
    const content = fs.readFileSync(sitemapPath, 'utf-8');
    expect(content).toContain('<urlset');
  });

  it('should generate a robots.txt', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const robotsPath = path.join(OUTPUT_DIR, 'robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);
    const content = fs.readFileSync(robotsPath, 'utf-8');
    expect(content).toContain('User-agent');
  });

  it('should include JSON-LD in generated recipe pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'teriyaki-and-sesame-seed-chicken.html'), 'utf-8');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"Recipe"');
  });

  it('should strip hyperlinks from recipe body content', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'teriyaki-and-sesame-seed-chicken.html'), 'utf-8');
    // Extract article body only - the git-meta and nav elements intentionally have links
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
    expect(articleMatch).not.toBeNull();
    expect(articleMatch![1]).not.toMatch(/href="https?:\/\//);
  });

  it('should generate a CNAME file for custom domain', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const cnamePath = path.join(OUTPUT_DIR, 'CNAME');
    expect(fs.existsSync(cnamePath)).toBe(true);
    const content = fs.readFileSync(cnamePath, 'utf-8').trim();
    expect(content).toBe('claudechef.com');
  });

  it('should use claudechef.com domain in sitemap URLs', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const content = fs.readFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), 'utf-8');
    expect(content).toContain('https://claudechef.com/');
    expect(content).not.toContain('github.io');
  });

  it('should include the footer CTA in all pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    // Check root HTML files
    const rootFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.html'));
    for (const file of rootFiles) {
      const html = fs.readFileSync(path.join(OUTPUT_DIR, file), 'utf-8');
      expect(html).toContain('claude plugin install claude-chef');
    }
    // Check subdirectory HTML files
    for (const dir of ['category', 'cuisine', 'ingredient', 'allergy', 'flavor', 'sauce', 'tool', 'skill_level', 'author']) {
      const subDir = path.join(OUTPUT_DIR, dir);
      if (fs.existsSync(subDir)) {
        const subFiles = fs.readdirSync(subDir).filter(f => f.endsWith('.html'));
        for (const file of subFiles) {
          const html = fs.readFileSync(path.join(subDir, file), 'utf-8');
          expect(html).toContain('claude plugin install claude-chef');
        }
      }
    }
  });

  it('should create taxonomy subdirectories', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'category'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'cuisine'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'ingredient'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'allergy'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'flavor'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'sauce'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'tool'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'skill_level'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'author'))).toBe(true);
  });

  it('should generate hub pages for actual recipe values', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    // Recipes have category: Main Course, Side Dish and cuisine: Japanese-American
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'category', 'main-course.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'category', 'side-dish.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'cuisine', 'japanese-american.html'))).toBe(true);
  });

  it('should generate taxonomy index pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'category', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'cuisine', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'ingredient', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'allergy', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'flavor', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'sauce', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'tool', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'skill_level', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'author', 'index.html'))).toBe(true);
  });

  it('should generate hub pages for new taxonomy types', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'ingredient', 'chicken.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'allergy', 'soy.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'flavor', 'umami.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'sauce', 'teriyaki.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'tool', 'skillet.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'skill_level', 'easy.html'))).toBe(true);
  });

  it('should include hub pages in sitemap', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const content = fs.readFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), 'utf-8');
    expect(content).toContain('category/main-course.html');
    expect(content).toContain('category/index.html');
    expect(content).toContain('cuisine/japanese-american.html');
    expect(content).toContain('ingredient/chicken.html');
    expect(content).toContain('allergy/soy.html');
    expect(content).toContain('flavor/umami.html');
    expect(content).toContain('sauce/teriyaki.html');
    expect(content).toContain('tool/skillet.html');
    expect(content).toContain('skill_level/easy.html');
    expect(content).toContain('author/grey-newell.html');
  });

  it('should include CollectionPage JSON-LD in hub pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'category', 'main-course.html'), 'utf-8');
    expect(html).toContain('CollectionPage');
  });

  it('should include Install, About, and Contribute nav links in all HTML pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const recipeHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'teriyaki-and-sesame-seed-chicken.html'), 'utf-8');
    expect(recipeHtml).toContain('/install.html');
    expect(recipeHtml).toContain('Install');
    expect(recipeHtml).toContain('/about.html');
    expect(recipeHtml).toContain('/contribute.html');

    const indexHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'index.html'), 'utf-8');
    expect(indexHtml).toContain('/install.html');
    expect(indexHtml).toContain('Install');
  });

  it('should generate an about.html', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'about.html'))).toBe(true);
  });

  it('should include about.html in sitemap', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const content = fs.readFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), 'utf-8');
    expect(content).toContain('about.html');
  });

  it('should include About nav link in generated pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const indexHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'index.html'), 'utf-8');
    expect(indexHtml).toContain('href="/about.html"');
    expect(indexHtml).toContain('About');

    const recipeHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'teriyaki-and-sesame-seed-chicken.html'), 'utf-8');
    expect(recipeHtml).toContain('href="/about.html"');

    const aboutHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'about.html'), 'utf-8');
    expect(aboutHtml).toContain('href="/about.html"');
    expect(aboutHtml).toContain('How Claude Chef Works');
  });

  it('should generate a contribute.html', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'contribute.html'))).toBe(true);
  });

  it('should include contribute.html in sitemap', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const content = fs.readFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), 'utf-8');
    expect(content).toContain('contribute.html');
  });

  it('should include Contribute nav link in generated pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const indexHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'index.html'), 'utf-8');
    expect(indexHtml).toContain('href="/contribute.html"');
    expect(indexHtml).toContain('Contribute');

    const recipeHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'teriyaki-and-sesame-seed-chicken.html'), 'utf-8');
    expect(recipeHtml).toContain('href="/contribute.html"');

    const contributeHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'contribute.html'), 'utf-8');
    expect(contributeHtml).toContain('Contribute a Recipe');
  });

  it('should generate a favorites.html', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'favorites.html'))).toBe(true);
  });

  it('should include favorites.html in sitemap', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const content = fs.readFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), 'utf-8');
    expect(content).toContain('favorites.html');
  });

  it('should include Install nav link in generated pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const indexHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'index.html'), 'utf-8');
    expect(indexHtml).toContain('href="/install.html"');
    expect(indexHtml).toContain('Install');

    const recipeHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'teriyaki-and-sesame-seed-chicken.html'), 'utf-8');
    expect(recipeHtml).toContain('href="/install.html"');
  });

  it('should add .favorite class to recipe cards on index page when favorites.json exists', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const indexHtml = fs.readFileSync(path.join(OUTPUT_DIR, 'index.html'), 'utf-8');
    expect(indexHtml).toContain('recipe-card favorite');
  });

  it('should generate favorites.html with empty state when favorites.json is missing', () => {
    const tempRoot = path.resolve(__dirname, '../.test-no-fav-root');
    const tempRecipesDir = path.join(tempRoot, 'recipes');
    const tempOutput = path.join(tempRoot, 'output');
    if (fs.existsSync(tempRoot)) fs.rmSync(tempRoot, { recursive: true });
    fs.mkdirSync(tempRecipesDir, { recursive: true });
    fs.copyFileSync(
      path.join(RECIPES_DIR, 'teriyaki-and-sesame-seed-chicken.md'),
      path.join(tempRecipesDir, 'teriyaki-and-sesame-seed-chicken.md')
    );
    try {
      buildSite(tempRecipesDir, tempOutput);
      const favHtml = fs.readFileSync(path.join(tempOutput, 'favorites.html'), 'utf-8');
      expect(favHtml).toContain('No favorites yet');
    } finally {
      if (fs.existsSync(tempRoot)) fs.rmSync(tempRoot, { recursive: true });
    }
  });

  it('should silently ignore invalid slugs in favorites.json', () => {
    const tempRoot = path.resolve(__dirname, '../.test-invalid-fav-root');
    const tempRecipesDir = path.join(tempRoot, 'recipes');
    const tempOutput = path.join(tempRoot, 'output');
    if (fs.existsSync(tempRoot)) fs.rmSync(tempRoot, { recursive: true });
    fs.mkdirSync(tempRecipesDir, { recursive: true });
    fs.copyFileSync(
      path.join(RECIPES_DIR, 'teriyaki-and-sesame-seed-chicken.md'),
      path.join(tempRecipesDir, 'teriyaki-and-sesame-seed-chicken.md')
    );
    // Write favorites.json with mix of valid and invalid slugs
    fs.writeFileSync(path.join(tempRoot, 'favorites.json'), '["teriyaki-and-sesame-seed-chicken", "nonexistent-recipe"]');
    try {
      buildSite(tempRecipesDir, tempOutput);
      expect(fs.existsSync(path.join(tempOutput, 'favorites.html'))).toBe(true);
      const favHtml = fs.readFileSync(path.join(tempOutput, 'favorites.html'), 'utf-8');
      // Should include the valid recipe but not crash on the invalid one
      expect(favHtml).toContain('Teriyaki');
      expect(favHtml).not.toContain('nonexistent');
    } finally {
      if (fs.existsSync(tempRoot)) fs.rmSync(tempRoot, { recursive: true });
    }
  });

  it('should contain servings slider in generated recipe pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'teriyaki-and-sesame-seed-chicken.html'), 'utf-8');
    expect(html).toContain('servings-slider');
  });

  it('should contain ingredient-list class in generated recipe pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'teriyaki-and-sesame-seed-chicken.html'), 'utf-8');
    expect(html).toContain('ingredient-list');
  });

  it('should contain data-base-servings in generated recipe pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'teriyaki-and-sesame-seed-chicken.html'), 'utf-8');
    expect(html).toContain('data-base-servings');
  });

  it('should include skill badge on generated recipe pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'teriyaki-and-sesame-seed-chicken.html'), 'utf-8');
    expect(html).toContain('skill-badge');
    expect(html).toContain('/skill_level/easy.html');
    expect(html).toContain('Easy');
  });

  it('should include linked taxonomy pills on generated recipe pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'teriyaki-and-sesame-seed-chicken.html'), 'utf-8');
    expect(html).toContain('class="meta-pill tax-category"');
    expect(html).toContain('/category/main-course.html');
    expect(html).toContain('/cuisine/japanese-american.html');
    expect(html).toContain('/ingredient/chicken.html');
    expect(html).toContain('/allergy/soy.html');
    expect(html).toContain('/flavor/sweet.html');
    expect(html).toContain('/sauce/teriyaki.html');
    expect(html).toContain('/tool/skillet.html');
  });

  it('should use friendly descriptions in ingredient hub pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'ingredient', 'chicken.html'), 'utf-8');
    expect(html).toContain('Recipes with Chicken');
  });

  it('should use inverted allergy hub page titles', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'allergy', 'soy.html'), 'utf-8');
    expect(html).toContain('No Soy Recipes');
  });

  it('should generate author hub pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'author', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(OUTPUT_DIR, 'author', 'grey-newell.html'))).toBe(true);
  });

  it('should include recipe-byline on generated recipe pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'teriyaki-and-sesame-seed-chicken.html'), 'utf-8');
    expect(html).toContain('recipe-byline');
    expect(html).toContain('/author/grey-newell.html');
  });

  it('should use Person type in JSON-LD on generated recipe pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'teriyaki-and-sesame-seed-chicken.html'), 'utf-8');
    expect(html).toContain('"@type":"Person"');
  });

  it('should use friendly indexDescription in taxonomy index pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'ingredient', 'index.html'), 'utf-8');
    expect(html).toContain('Find recipes by key ingredient');
  });

  it('should include teriyaki-roasted-broccoli in favorites page', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'favorites.html'), 'utf-8');
    expect(html).toContain('teriyaki-roasted-broccoli');
  });

  it('should generate llms.txt with expected content', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const llmsPath = path.join(OUTPUT_DIR, 'llms.txt');
    expect(fs.existsSync(llmsPath)).toBe(true);
    const content = fs.readFileSync(llmsPath, 'utf-8');
    expect(content).toContain('# Claude Chef');
    expect(content).toContain('## Recipes');
    expect(content).toContain('## Categories');
    expect(content).toContain('## Cuisines');
  });

  it('should generate feed.xml with valid RSS', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const feedPath = path.join(OUTPUT_DIR, 'feed.xml');
    expect(fs.existsSync(feedPath)).toBe(true);
    const content = fs.readFileSync(feedPath, 'utf-8');
    expect(content).toContain('<rss version="2.0"');
    expect(content).toContain('<channel>');
    expect(content).toContain('<item>');
  });

  it('should generate per-category feed.xml files', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const categoryFeedPath = path.join(OUTPUT_DIR, 'category', 'main-course', 'feed.xml');
    expect(fs.existsSync(categoryFeedPath)).toBe(true);
    const content = fs.readFileSync(categoryFeedPath, 'utf-8');
    expect(content).toContain('<rss version="2.0"');
    expect(content).toContain('Main Course');
  });

  it('should include footer links in generated HTML pages', () => {
    buildSite(RECIPES_DIR, OUTPUT_DIR);
    const html = fs.readFileSync(path.join(OUTPUT_DIR, 'index.html'), 'utf-8');
    expect(html).toContain('footer-links');
    expect(html).toContain('href="/sitemap.xml"');
    expect(html).toContain('href="/llms.txt"');
    expect(html).toContain('href="/feed.xml"');
  });

  it('should not include enrichment sections when no cache exists', () => {
    const noCacheRecipesDir = path.resolve(__dirname, '../.test-no-cache-recipes');
    const noCacheOutput = path.resolve(__dirname, '../.test-no-cache-output');
    if (fs.existsSync(noCacheRecipesDir)) fs.rmSync(noCacheRecipesDir, { recursive: true });
    if (fs.existsSync(noCacheOutput)) fs.rmSync(noCacheOutput, { recursive: true });
    fs.mkdirSync(noCacheRecipesDir, { recursive: true });
    // Copy a recipe without any cache
    fs.copyFileSync(
      path.join(RECIPES_DIR, 'teriyaki-and-sesame-seed-chicken.md'),
      path.join(noCacheRecipesDir, 'teriyaki-and-sesame-seed-chicken.md')
    );
    try {
      buildSite(noCacheRecipesDir, noCacheOutput);
      const html = fs.readFileSync(path.join(noCacheOutput, 'teriyaki-and-sesame-seed-chicken.html'), 'utf-8');
      expect(html).not.toContain('Shop Ingredients');
      expect(html).not.toContain('Cook with AI');
    } finally {
      if (fs.existsSync(noCacheRecipesDir)) fs.rmSync(noCacheRecipesDir, { recursive: true });
      if (fs.existsSync(noCacheOutput)) fs.rmSync(noCacheOutput, { recursive: true });
    }
  });

  it('should include enrichment sections when cache exists', () => {
    // Set up a temp recipes dir with one recipe and a cache
    const enrichedOutput = path.resolve(__dirname, '../.test-enriched-output');
    if (fs.existsSync(TEST_ENRICHED_RECIPES_DIR)) {
      fs.rmSync(TEST_ENRICHED_RECIPES_DIR, { recursive: true });
    }
    if (fs.existsSync(enrichedOutput)) {
      fs.rmSync(enrichedOutput, { recursive: true });
    }
    fs.mkdirSync(TEST_ENRICHED_RECIPES_DIR, { recursive: true });

    // Copy a real recipe
    const recipeContent = fs.readFileSync(path.join(RECIPES_DIR, 'teriyaki-and-sesame-seed-chicken.md'), 'utf-8');
    fs.writeFileSync(path.join(TEST_ENRICHED_RECIPES_DIR, 'teriyaki-and-sesame-seed-chicken.md'), recipeContent);

    // Write a cache entry
    const cacheDir = path.join(TEST_ENRICHED_RECIPES_DIR, '.cache');
    const { computeContentHash } = require('../src/enrichment/cache');
    const hash = computeContentHash(recipeContent);
    const cacheEntry: CacheEntry = {
      contentHash: hash,
      enrichment: {
        ingredients: [{ ingredient: '1 cup teriyaki sauce', searchTerm: 'teriyaki sauce' }],
        gear: [{ name: 'Large skillet', searchTerm: 'skillet' }],
        cookingTips: ['Pat chicken dry'],
        coachingPrompt: 'Guide me through teriyaki chicken.',
      },
      timestamp: new Date().toISOString(),
    };
    writeCache(cacheDir, 'teriyaki-and-sesame-seed-chicken', cacheEntry);

    // Set env var for affiliate
    const origTag = process.env.AMAZON_AFFILIATE_TAG;
    process.env.AMAZON_AFFILIATE_TAG = 'test-20';

    try {
      buildSite(TEST_ENRICHED_RECIPES_DIR, enrichedOutput);
      const html = fs.readFileSync(path.join(enrichedOutput, 'teriyaki-and-sesame-seed-chicken.html'), 'utf-8');
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
