/**
 * Renderers for the Developer Docs and Changelog pages.
 */

const BASE_URL = 'https://claudechef.com';
const DEFAULT_OG_IMAGE = 'https://claudechef.com/images/og-default.jpg';

// Re-import VERSION at module load time
import * as path from 'path';
const pkg = require(path.resolve(__dirname, '../../package.json'));
const VERSION: string = pkg.version;

function docsStyles(): string {
  return `
    .docs-hero { text-align: center; padding: 2rem 0 3rem; }
    .docs-hero h1 { font-size: 2.75rem; margin-bottom: 1rem; }
    .docs-intro { font-size: 1.125rem; color: var(--color-text-secondary); max-width: 520px; margin: 0 auto; line-height: 1.7; }
    .docs-section { margin-bottom: 2.5rem; }
    .docs-section h2 { margin-top: 2rem; margin-bottom: 0.75rem; }
    .docs-section h3 { margin-top: 1.5rem; margin-bottom: 0.5rem; }
    .docs-section code { background: var(--color-bg); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.875rem; }
    .docs-section pre { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 8px; padding: 1rem 1.25rem; overflow-x: auto; margin: 0.75rem 0; }
    .docs-section pre code { background: none; padding: 0; font-size: 0.8125rem; }
    .docs-section table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; font-size: 0.9375rem; }
    .docs-section th, .docs-section td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--color-border); }
    .docs-section th { font-weight: 600; color: var(--color-text-secondary); font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.04em; }
  `;
}

// These are imported from template.ts at build time; we duplicate the minimal
// helpers here to keep this module self-contained and avoid circular deps.
import { baseStyles, googleFonts, renderHeader, footerCta } from './template';

export function renderDocsPage(): string {
  const canonicalUrl = `${BASE_URL}/docs.html`;
  const pageTitle = 'Developer Documentation | Claude Chef';
  const pageDescription = 'Technical documentation for the Claude Chef open-source recipe platform — architecture, CLI, static site generator, and contribution workflow.';

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/index.html` },
      { '@type': 'ListItem', position: 2, name: 'Developer Docs' },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="description" content="${pageDescription}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#5B7B5E">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:site_name" content="Claude Chef">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${pageDescription}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${DEFAULT_OG_IMAGE}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${pageTitle}">
  <meta name="twitter:description" content="${pageDescription}">
  <meta name="twitter:image" content="${DEFAULT_OG_IMAGE}">
  <script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>
  ${googleFonts()}
  <link rel="stylesheet" href="/styles.css">
  <style>${docsStyles()}</style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  ${renderHeader('about')}
  <main id="main-content">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/index.html">Home</a> <span class="breadcrumb-sep">/</span> <span>Developer Docs</span></nav>
    <div class="docs-hero">
      <h1>Developer Documentation</h1>
      <p class="docs-intro">Everything you need to build, extend, and contribute to Claude Chef.</p>
    </div>

    <div class="docs-section">
      <h2>Architecture Overview</h2>
      <p>Claude Chef is a dual-interface culinary platform: a CLI plugin for Claude Code and a GEO-optimized static recipe site. The codebase is TypeScript throughout.</p>
      <pre><code>claude-chef/
├── recipes/          # Markdown recipe files (the content)
├── src/
│   ├── cli/          # CLI commands (submit, enrich)
│   ├── generator/    # Static site generator
│   │   ├── index.ts       # Build orchestrator
│   │   ├── template.ts    # HTML page renderers
│   │   ├── parser.ts      # Markdown → ParsedRecipe
│   │   ├── taxonomy.ts    # Category/cuisine/tag grouping
│   │   ├── sanitizer.ts   # Content sanitization
│   │   ├── ingredient-parser.ts  # Quantity extraction
│   │   ├── structured-data.ts    # JSON-LD generation
│   │   ├── sitemap.ts     # sitemap.xml
│   │   ├── robots.ts      # robots.txt
│   │   └── cook-mode.ts   # AI coaching prompt builder
│   ├── enrichment/   # AI-powered recipe enrichment
│   │   ├── enricher.ts    # Claude API integration
│   │   ├── prompt.ts      # Enrichment prompt builder
│   │   ├── cache.ts       # File-based enrichment cache
│   │   └── types.ts       # EnrichmentResult interface
│   ├── affiliates/   # Shopping link generation
│   │   ├── registry.ts    # Provider registry
│   │   ├── link-generator.ts  # URL builder
│   │   ├── amazon.ts      # Amazon search URLs
│   │   ├── walmart.ts     # Walmart search URLs
│   │   └── types.ts       # AffiliateLink interface
│   └── types.ts      # Core type definitions
├── tests/            # Jest test suite
├── docs/             # Generated static site output
├── favorites.json    # Curated favorite recipe slugs
└── package.json      # v${VERSION}</code></pre>
    </div>

    <div class="docs-section">
      <h2>Getting Started</h2>
      <h3>Prerequisites</h3>
      <p>Node.js 18+ and npm. The project uses TypeScript 5.4+ compiled with <code>tsc</code>.</p>
      <h3>Installation</h3>
      <pre><code>git clone https://github.com/greynewell/claude-chef.git
cd claude-chef
npm install</code></pre>
      <h3>Build &amp; Test</h3>
      <pre><code>npm run build      # Compile TypeScript
npm test           # Run Jest test suite
npm run generate   # Build the static site into docs/</code></pre>
      <h3>CLI Plugin</h3>
      <pre><code>claude plugin install claude-chef</code></pre>
      <p>The CLI provides two commands:</p>
      <table>
        <thead><tr><th>Command</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>npm run lint-recipe</code></td><td>Validate recipe frontmatter and markdown structure</td></tr>
          <tr><td><code>npm run enrich</code></td><td>Enrich recipes with AI-generated shopping data, gear, and cooking tips</td></tr>
        </tbody>
      </table>
    </div>

    <div class="docs-section">
      <h2>Recipe Format</h2>
      <p>Each recipe is a Markdown file in <code>recipes/</code> with YAML frontmatter:</p>
      <pre><code>---
title: Teriyaki Chicken
description: Pan-seared chicken in a sticky teriyaki glaze.
author: Claude Chef Community
prep_time: PT20M
cook_time: PT30M
servings: 4
calories: 500
recipe_category: Main Course
cuisine: Japanese-American
skill_level: Easy
keywords: [chicken, teriyaki]
recipe_ingredients: [Chicken, Teriyaki Sauce]
allergies: [Soy, Dairy]
flavors: [Sweet, Savory, Umami]
sauces: [Teriyaki]
tools: [Skillet, Cutting Board]
pairings: [teriyaki-roasted-broccoli]
---

## Ingredients

- 4 chicken thighs
- 60ml soy sauce
...

## Instructions

1. Season the chicken...
2. Heat a skillet...
...</code></pre>
      <h3>Required Fields</h3>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>title</code></td><td>string</td><td>Recipe name</td></tr>
          <tr><td><code>description</code></td><td>string</td><td>Short summary (used in cards and meta tags)</td></tr>
          <tr><td><code>author</code></td><td>string</td><td>Recipe author</td></tr>
          <tr><td><code>prep_time</code></td><td>ISO 8601</td><td>Preparation time (e.g. <code>PT20M</code>)</td></tr>
          <tr><td><code>cook_time</code></td><td>ISO 8601</td><td>Cooking time (e.g. <code>PT1H30M</code>)</td></tr>
          <tr><td><code>servings</code></td><td>number</td><td>Number of servings</td></tr>
          <tr><td><code>calories</code></td><td>number</td><td>Calories per serving</td></tr>
          <tr><td><code>keywords</code></td><td>string[]</td><td>SEO keywords</td></tr>
        </tbody>
      </table>
      <h3>Optional Fields</h3>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>recipe_category</code></td><td>string</td><td>Main Course, Side Dish, Dessert, etc.</td></tr>
          <tr><td><code>cuisine</code></td><td>string</td><td>Cuisine type (e.g. Japanese-American)</td></tr>
          <tr><td><code>skill_level</code></td><td>string</td><td>Easy, Intermediate, or Advanced</td></tr>
          <tr><td><code>image</code></td><td>URL</td><td>Recipe photo URL</td></tr>
          <tr><td><code>recipe_ingredients</code></td><td>string[]</td><td>Ingredient tags for taxonomy</td></tr>
          <tr><td><code>allergies</code></td><td>string[]</td><td>Allergen tags</td></tr>
          <tr><td><code>flavors</code></td><td>string[]</td><td>Flavor profile tags</td></tr>
          <tr><td><code>sauces</code></td><td>string[]</td><td>Sauce type tags</td></tr>
          <tr><td><code>tools</code></td><td>string[]</td><td>Kitchen equipment tags</td></tr>
          <tr><td><code>pairings</code></td><td>string[]</td><td>Slugs of complementary recipes</td></tr>
        </tbody>
      </table>
    </div>

    <div class="docs-section">
      <h2>Build Pipeline</h2>
      <p>The static site generator (<code>src/generator/index.ts</code>) runs in a single pass:</p>
      <ol>
        <li><strong>Parse</strong> — Read all <code>.md</code> files, extract frontmatter and body via <code>gray-matter</code></li>
        <li><strong>Taxonomize</strong> — Group recipes by category, cuisine, ingredient, allergy, flavor, sauce, tool, skill level, and author</li>
        <li><strong>Enrich</strong> — Load cached AI enrichment data (shopping terms, gear, cooking tips)</li>
        <li><strong>Affiliate</strong> — Generate shopping links from enrichment data using configured providers (Amazon, Walmart)</li>
        <li><strong>Render</strong> — Generate HTML for every recipe, taxonomy hub, taxonomy index, index, about, contribute, favorites, docs, and changelog page</li>
        <li><strong>SEO</strong> — Generate <code>sitemap.xml</code>, <code>robots.txt</code>, JSON-LD structured data, and <code>CNAME</code></li>
      </ol>
    </div>

    <div class="docs-section">
      <h2>Enrichment System</h2>
      <p>The <code>npm run enrich</code> command calls the Claude API to analyze each recipe and produce:</p>
      <ul>
        <li><strong>Ingredient search terms</strong> — normalized names for shopping link generation</li>
        <li><strong>Gear recommendations</strong> — tools and equipment with search terms</li>
        <li><strong>Cooking tips</strong> — technique guidance for the recipe</li>
        <li><strong>Coaching prompt</strong> — a ready-made prompt for AI-assisted cooking</li>
      </ul>
      <p>Results are cached in <code>recipes/.cache/</code> as JSON files. The build step reads from cache and never calls the API directly.</p>
      <h3>Affiliate Providers</h3>
      <p>Configure providers via environment variables:</p>
      <pre><code>AMAZON_AFFILIATE_TAG=your-tag-20 npm run generate
WALMART_AFFILIATE_ID=your-id npm run generate</code></pre>
    </div>

    <div class="docs-section">
      <h2>Testing</h2>
      <p>The test suite uses Jest with ts-jest. Run with <code>npm test</code>.</p>
      <table>
        <thead><tr><th>Test File</th><th>Coverage</th></tr></thead>
        <tbody>
          <tr><td><code>template.test.ts</code></td><td>All page renderers, recipe cards, share/copy UI, taxonomy pills</td></tr>
          <tr><td><code>parser.test.ts</code></td><td>Markdown parsing, frontmatter extraction</td></tr>
          <tr><td><code>taxonomy.test.ts</code></td><td>Taxonomy grouping, slug generation</td></tr>
          <tr><td><code>ingredient-parser.test.ts</code></td><td>Quantity/unit extraction from ingredient strings</td></tr>
          <tr><td><code>structured-data.test.ts</code></td><td>JSON-LD schema generation</td></tr>
          <tr><td><code>sanitizer.test.ts</code></td><td>Content sanitization</td></tr>
          <tr><td><code>sitemap.test.ts</code></td><td>Sitemap XML generation</td></tr>
          <tr><td><code>robots.test.ts</code></td><td>robots.txt generation</td></tr>
          <tr><td><code>generator.test.ts</code></td><td>Full integration build test</td></tr>
          <tr><td><code>enrichment/*.test.ts</code></td><td>Enricher, prompt builder, cache</td></tr>
          <tr><td><code>affiliates/*.test.ts</code></td><td>Amazon, Walmart, registry, link generator</td></tr>
        </tbody>
      </table>
    </div>

    <div class="docs-section">
      <h2>Deployment</h2>
      <p>The site deploys to GitHub Pages via a GitHub Actions workflow (<code>.github/workflows/deploy-site.yml</code>) on every push to <code>main</code> that modifies <code>recipes/</code>, <code>src/</code>, or the workflow itself. The workflow runs the full build pipeline and uploads <code>docs/</code> as the Pages artifact.</p>
    </div>

    <div class="docs-section">
      <h2>Contributing</h2>
      <p>See the <a href="/contribute.html">contribution page</a> for recipe submissions. For code contributions:</p>
      <ol>
        <li>Fork the repository</li>
        <li>Create a feature branch</li>
        <li>Write tests for new functionality</li>
        <li>Ensure <code>npm test</code> passes</li>
        <li>Submit a pull request</li>
      </ol>
      <p>License: <a href="https://github.com/greynewell/claude-chef/blob/main/LICENSE">CC0-1.0 (Public Domain)</a></p>
    </div>

    <div class="docs-section">
      <h2>Roadmap</h2>
      <p>Planned features and milestones are tracked in the <a href="https://github.com/users/greynewell/projects/3">Claude Chef Roadmap</a> on GitHub Projects.</p>
    </div>
  </main>
${footerCta()}
</body>
</html>`;
}

export function renderChangelogPage(): string {
  const canonicalUrl = `${BASE_URL}/changelog.html`;
  const pageTitle = 'Changelog | Claude Chef';
  const pageDescription = 'Version history and release notes for Claude Chef.';

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/index.html` },
      { '@type': 'ListItem', position: 2, name: 'Changelog' },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="description" content="${pageDescription}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#5B7B5E">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:site_name" content="Claude Chef">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${pageDescription}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${DEFAULT_OG_IMAGE}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${pageTitle}">
  <meta name="twitter:description" content="${pageDescription}">
  <meta name="twitter:image" content="${DEFAULT_OG_IMAGE}">
  <script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>
  ${googleFonts()}
  <link rel="stylesheet" href="/styles.css">
  <style>${docsStyles()}</style>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  ${renderHeader('about')}
  <main id="main-content">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/index.html">Home</a> <span class="breadcrumb-sep">/</span> <span>Changelog</span></nav>
    <div class="docs-hero">
      <h1>Changelog</h1>
      <p class="docs-intro">Version history and release notes for Claude Chef.</p>
    </div>

    <div class="docs-section">
      <h2>v0.1.0 — Initial Release</h2>
      <h3>Features</h3>
      <ul>
        <li><strong>Static site generator</strong> — Markdown recipes compiled to a fully styled, responsive HTML site</li>
        <li><strong>Recipe pages</strong> — Structured recipe display with ingredients, instructions, prep/cook time, servings control with live portion scaling, and calorie adjustment</li>
        <li><strong>Taxonomy system</strong> — Recipes organized by category, cuisine, ingredient, allergy, flavor, sauce, tool, skill level, and author with hub pages and index pages</li>
        <li><strong>AI enrichment</strong> — Claude API integration for ingredient search terms, gear recommendations, cooking tips, and AI coaching prompts</li>
        <li><strong>Affiliate shopping</strong> — Amazon and Walmart search link generation from enrichment data, with "Shop Ingredients" and "Gear" sections on recipe pages</li>
        <li><strong>Buy all actions</strong> — "Copy list" and "Buy all on [Provider]" buttons for bulk ingredient shopping</li>
        <li><strong>Recipe cards</strong> — Navigation cards with metadata pills (skill level, cuisine, category, prep time, cook time, calories)</li>
        <li><strong>Cook with AI</strong> — Ready-made coaching prompts for hands-free, step-by-step guidance</li>
        <li><strong>Recipe pairings</strong> — Suggested complementary dishes (sides, sauces, desserts)</li>
        <li><strong>Share bar</strong> — Native Web Share API and copy-link buttons on every recipe</li>
        <li><strong>Favorites</strong> — Curated collection driven by <code>favorites.json</code>, featured on homepage and dedicated page</li>
        <li><strong>Contribute page</strong> — Browser-based recipe submission form that generates GitHub issues</li>
        <li><strong>SEO</strong> — JSON-LD structured data (Recipe, BreadcrumbList, WebSite, ItemList, CollectionPage), sitemap.xml, robots.txt, Open Graph, Twitter Cards</li>
        <li><strong>Responsive design</strong> — Mobile-first layout with DM Serif Display + Inter font pairing</li>
        <li><strong>CLI plugin</strong> — <code>claude plugin install claude-chef</code> for terminal-based cooking assistance</li>
        <li><strong>GitHub Pages deployment</strong> — Automated CI/CD via GitHub Actions</li>
        <li><strong>Developer documentation</strong> — Architecture overview, recipe format reference, build pipeline, and testing guide</li>
      </ul>
      <h3>Infrastructure</h3>
      <ul>
        <li>TypeScript 5.4+ codebase with strict compilation</li>
        <li>Jest test suite with 400+ tests across 20 test files</li>
        <li>CC0-1.0 (Public Domain) license</li>
      </ul>
      <p>See the <a href="https://github.com/users/greynewell/projects/3">Roadmap</a> for what's coming next.</p>
    </div>
  </main>
${footerCta()}
</body>
</html>`;
}
