import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { parseRecipeFile } from './parser';
import { generateJsonLd, generateBreadcrumbJsonLd, generateWebSiteJsonLd, generateItemListJsonLd, generateCollectionPageJsonLd, generateTaxonomyIndexJsonLd, generateHubBreadcrumbJsonLd } from './structured-data';
import { renderRecipePage, renderIndexPage, renderHubPage, renderTaxonomyIndexPage, renderAboutPage, renderContributePage, renderFavoritesPage, renderInstallPage, RECIPES_PER_PAGE, computePagination, generateManifestJson } from './template';
import { buildAllTaxonomies, toSlug } from './taxonomy';
import { generateSitemap } from './sitemap';
import { generateRobotsTxt } from './robots';
import { generateLlmsTxt } from './llms-txt';
import { generateAllRssFeeds } from './rss';
import { generateCookModePrompt } from './cook-mode';
import { renderDocsPage, renderChangelogPage } from './docs-pages';
import { ParsedRecipe, SitemapEntry } from '../types';
import { readCache } from '../enrichment/cache';
import { EnrichmentResult } from '../enrichment/types';
import { buildProviders } from '../affiliates/registry';
import { generateAffiliateLinks } from '../affiliates/link-generator';
import { AffiliateLink } from '../affiliates/types';

const BASE_URL = 'https://claudechef.com';

function getCommitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function getCommitDate(): string {
  try {
    return execSync('git log -1 --format=%Y-%m-%d', { encoding: 'utf-8' }).trim();
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Build the full static site from a recipes directory into an output directory.
 */
export function buildSite(recipesDir: string, outputDir: string): void {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Find all .md files in recipes directory
  const files = fs.readdirSync(recipesDir).filter(f => f.endsWith('.md'));

  const commitHash = getCommitHash();
  const commitDate = getCommitDate();
  const sitemapEntries: SitemapEntry[] = [];
  const allRecipes: ParsedRecipe[] = [];

  // Load affiliate providers from env
  const providers = buildProviders(process.env as Record<string, string | undefined>);

  // Cache directory lives alongside recipes
  const cacheDir = path.join(recipesDir, '.cache');

  // First pass: parse all recipes
  for (const file of files) {
    const filePath = path.join(recipesDir, file);
    allRecipes.push(parseRecipeFile(filePath));
  }

  // Build slug lookup map for pairing resolution
  const recipeBySlug = new Map<string, ParsedRecipe>();
  for (const recipe of allRecipes) {
    recipeBySlug.set(recipe.slug, recipe);
  }

  // Read favorites.json from project root
  let favoriteSlugs: string[] = [];
  try {
    const favoritesPath = path.resolve(recipesDir, '..', 'favorites.json');
    const favoritesRaw = fs.readFileSync(favoritesPath, 'utf-8');
    const parsed = JSON.parse(favoritesRaw);
    if (Array.isArray(parsed)) {
      favoriteSlugs = parsed.filter(s => typeof s === 'string' && recipeBySlug.has(s));
    }
  } catch {
    // Missing file or bad JSON — treat as empty
  }

  // Build taxonomies
  const taxonomies = buildAllTaxonomies(allRecipes);

  // Second pass: render each recipe with resolved pairings
  for (const recipe of allRecipes) {
    // Resolve pairings slugs to actual recipes
    const pairings: ParsedRecipe[] = [];
    if (recipe.frontmatter.pairings) {
      for (const slug of recipe.frontmatter.pairings) {
        const paired = recipeBySlug.get(slug);
        if (paired) {
          pairings.push(paired);
        }
      }
    }

    // Generate JSON-LD with baseUrl for canonical URL and category/cuisine
    const jsonLd = generateJsonLd(recipe, commitDate, BASE_URL, pairings.length > 0 ? pairings : undefined);

    // Compute category breadcrumb for recipe
    const categoryBreadcrumb = recipe.frontmatter.recipe_category
      ? { name: recipe.frontmatter.recipe_category, slug: toSlug(recipe.frontmatter.recipe_category) }
      : undefined;

    // Generate BreadcrumbList JSON-LD
    const breadcrumbJsonLd = generateBreadcrumbJsonLd(recipe, BASE_URL, categoryBreadcrumb);

    // Load enrichment from cache (build never calls LLM)
    let enrichment: EnrichmentResult | null = null;
    let affiliateLinks: AffiliateLink[] | null = null;
    let cookModePrompt: string | null = null;

    const cached = readCache(cacheDir, recipe.slug);
    if (cached) {
      enrichment = cached.enrichment;

      if (providers.length > 0) {
        affiliateLinks = generateAffiliateLinks(enrichment, providers);
      }

      cookModePrompt = generateCookModePrompt(enrichment, affiliateLinks || [], recipe);
    }

    // Render HTML
    const html = renderRecipePage(recipe, jsonLd, commitHash, {
      enrichment,
      affiliateLinks,
      cookModePrompt,
      breadcrumbJsonLd,
      pairings: pairings.length > 0 ? pairings : null,
      categoryBreadcrumb: categoryBreadcrumb || null,
    });

    // Write to output
    const outputFile = path.join(outputDir, `${recipe.slug}.html`);
    fs.writeFileSync(outputFile, html, 'utf-8');

    // Add sitemap entry
    sitemapEntries.push({
      loc: `${BASE_URL}/${recipe.slug}.html`,
      lastmod: commitDate,
      priority: '0.8',
      changefreq: 'weekly',
    });
  }

  // Generate taxonomy hub pages and index pages
  for (const taxonomy of taxonomies) {
    const typeDir = path.join(outputDir, taxonomy.type);
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }

    // Generate individual hub pages (with pagination)
    for (const entry of taxonomy.entries) {
      const totalRecipes = entry.recipes.length;
      const totalPages = Math.max(1, Math.ceil(totalRecipes / RECIPES_PER_PAGE));

      for (let page = 1; page <= totalPages; page++) {
        const pagination = computePagination(totalRecipes, page, taxonomy.type, entry.slug);
        const pageRecipes = entry.recipes.slice(pagination.startIndex, pagination.endIndex);
        const pageEntry = { ...entry, recipes: pageRecipes };

        const collectionPageJsonLd = generateCollectionPageJsonLd(
          taxonomy.type, pageEntry, BASE_URL, taxonomy.descriptions, totalRecipes
        );
        const hubBreadcrumbJsonLd = generateHubBreadcrumbJsonLd(taxonomy.type, taxonomy.label, entry.name, BASE_URL);
        const hubHtml = renderHubPage(taxonomy.type, taxonomy.labelSingular, entry, {
          collectionPageJsonLd,
          breadcrumbJsonLd: hubBreadcrumbJsonLd,
          favoriteSlugs,
          pagination: totalPages > 1 ? pagination : null,
          descriptions: taxonomy.descriptions,
        }, taxonomy.label);

        const fileName = page === 1 ? `${entry.slug}.html` : `${entry.slug}-page-${page}.html`;
        fs.writeFileSync(path.join(typeDir, fileName), hubHtml, 'utf-8');

        sitemapEntries.push({
          loc: `${BASE_URL}/${taxonomy.type}/${fileName}`,
          lastmod: commitDate,
          priority: page === 1 ? '0.6' : '0.4',
          changefreq: 'weekly',
        });
      }
    }

    // Generate taxonomy index page
    const taxIndexJsonLd = generateTaxonomyIndexJsonLd(taxonomy, BASE_URL);
    const taxBreadcrumbJsonLd = generateHubBreadcrumbJsonLd(taxonomy.type, taxonomy.label, null, BASE_URL);
    const taxIndexHtml = renderTaxonomyIndexPage(taxonomy, {
      itemListJsonLd: taxIndexJsonLd,
      breadcrumbJsonLd: taxBreadcrumbJsonLd,
    });
    fs.writeFileSync(path.join(typeDir, 'index.html'), taxIndexHtml, 'utf-8');

    sitemapEntries.push({
      loc: `${BASE_URL}/${taxonomy.type}/index.html`,
      lastmod: commitDate,
      priority: '0.7',
      changefreq: 'weekly',
    });
  }

  // Generate index page with structured data
  const webSiteJsonLd = generateWebSiteJsonLd(BASE_URL);
  const itemListJsonLd = generateItemListJsonLd(allRecipes, BASE_URL);
  const indexHtml = renderIndexPage(allRecipes, { webSiteJsonLd, itemListJsonLd, taxonomies, favoriteSlugs });
  fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml, 'utf-8');

  // Generate about page
  const aboutHtml = renderAboutPage();
  fs.writeFileSync(path.join(outputDir, 'about.html'), aboutHtml, 'utf-8');

  sitemapEntries.push({
    loc: `${BASE_URL}/about.html`,
    lastmod: commitDate,
    priority: '0.5',
    changefreq: 'monthly',
  });

  // Generate contribute page
  const contributeHtml = renderContributePage();
  fs.writeFileSync(path.join(outputDir, 'contribute.html'), contributeHtml, 'utf-8');

  sitemapEntries.push({
    loc: `${BASE_URL}/contribute.html`,
    lastmod: commitDate,
    priority: '0.5',
    changefreq: 'monthly',
  });

  // Generate install page
  const installHtml = renderInstallPage();
  fs.writeFileSync(path.join(outputDir, 'install.html'), installHtml, 'utf-8');

  sitemapEntries.push({
    loc: `${BASE_URL}/install.html`,
    lastmod: commitDate,
    priority: '0.5',
    changefreq: 'monthly',
  });

  // Generate favorites page
  const favoriteRecipes = favoriteSlugs.map(s => recipeBySlug.get(s)!).filter(Boolean);
  const favoritesItemListJsonLd = favoriteRecipes.length > 0 ? generateItemListJsonLd(favoriteRecipes, BASE_URL) : null;
  const favoritesBreadcrumbJsonLd = {
    '@context': 'https://schema.org' as const,
    '@type': 'BreadcrumbList' as const,
    itemListElement: [
      { '@type': 'ListItem' as const, position: 1, name: 'Home', item: `${BASE_URL}/index.html` },
      { '@type': 'ListItem' as const, position: 2, name: 'Favorites' },
    ],
  };
  const favoritesHtml = renderFavoritesPage(favoriteRecipes, {
    itemListJsonLd: favoritesItemListJsonLd,
    breadcrumbJsonLd: favoritesBreadcrumbJsonLd,
  });
  fs.writeFileSync(path.join(outputDir, 'favorites.html'), favoritesHtml, 'utf-8');

  sitemapEntries.push({
    loc: `${BASE_URL}/favorites.html`,
    lastmod: commitDate,
    priority: '0.7',
    changefreq: 'weekly',
  });

  // Generate developer docs page
  const docsHtml = renderDocsPage();
  fs.writeFileSync(path.join(outputDir, 'docs.html'), docsHtml, 'utf-8');

  sitemapEntries.push({
    loc: `${BASE_URL}/docs.html`,
    lastmod: commitDate,
    priority: '0.4',
    changefreq: 'monthly',
  });

  // Generate changelog page
  const changelogHtml = renderChangelogPage();
  fs.writeFileSync(path.join(outputDir, 'changelog.html'), changelogHtml, 'utf-8');

  sitemapEntries.push({
    loc: `${BASE_URL}/changelog.html`,
    lastmod: commitDate,
    priority: '0.3',
    changefreq: 'monthly',
  });

  // Add index to sitemap with highest priority
  sitemapEntries.unshift({
    loc: `${BASE_URL}/index.html`,
    lastmod: commitDate,
    priority: '1.0',
    changefreq: 'daily',
  });

  // Generate sitemap.xml
  const sitemap = generateSitemap(sitemapEntries);
  fs.writeFileSync(path.join(outputDir, 'sitemap.xml'), sitemap, 'utf-8');

  // Generate robots.txt
  const robots = generateRobotsTxt(`${BASE_URL}/sitemap.xml`);
  fs.writeFileSync(path.join(outputDir, 'robots.txt'), robots, 'utf-8');

  // Generate llms.txt
  const llmsTxt = generateLlmsTxt(allRecipes, taxonomies, BASE_URL);
  fs.writeFileSync(path.join(outputDir, 'llms.txt'), llmsTxt, 'utf-8');

  // Generate RSS feeds (main + per-category)
  const rssFeeds = generateAllRssFeeds(allRecipes, taxonomies, BASE_URL, commitDate);
  for (const feed of rssFeeds) {
    const feedPath = path.join(outputDir, feed.relativePath);
    const feedDir = path.dirname(feedPath);
    if (!fs.existsSync(feedDir)) {
      fs.mkdirSync(feedDir, { recursive: true });
    }
    fs.writeFileSync(feedPath, feed.content, 'utf-8');
  }

  // Generate manifest.json for PWA
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), generateManifestJson(), 'utf-8');

  // Generate CNAME for GitHub Pages custom domain
  fs.writeFileSync(path.join(outputDir, 'CNAME'), 'claudechef.com\n', 'utf-8');
}

// CLI entry point
if (require.main === module) {
  const recipesDir = path.resolve(__dirname, '../../recipes');
  const outputDir = path.resolve(__dirname, '../../docs');
  console.log(`Building site from ${recipesDir} -> ${outputDir}`);
  buildSite(recipesDir, outputDir);
  console.log('Site built successfully.');
}
