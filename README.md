# Claude Chef

A dual-interface culinary platform: a **CLI plugin for Claude Code** and a **GEO-optimized static recipe site** at [claudechef.com](https://claudechef.com).

Recipes are authored in Markdown, enriched with AI-generated shopping data and cooking tips, then compiled to a fast, fully static HTML site with structured data, taxonomy navigation, affiliate shopping links, and RSS feeds.

## Quick Start

```bash
git clone https://github.com/greynewell/claude-chef.git
cd claude-chef
npm install
npm run build
npm test
npm run generate   # builds the site into docs/
```

### CLI Plugin

```bash
claude plugin install claude-chef
```

Once installed, Claude Code gains access to recipe submission and enrichment commands.

## Features

### Recipe Pages

Each recipe gets a dedicated page with:

- Structured ingredients list with parsed quantities
- Step-by-step instructions
- Prep time, cook time, and calorie display
- Interactive servings control with live portion scaling and calorie adjustment
- Share bar (native Web Share API + copy link)
- Recipe pairings — suggested complementary dishes
- Cook with AI — ready-made coaching prompt for hands-free guidance

### AI Enrichment

The `npm run enrich` command calls the Claude API to analyze each recipe and produce:

- **Ingredient search terms** — normalized names for shopping link generation
- **Gear recommendations** — tools and equipment with search terms
- **Cooking tips** — technique guidance
- **Coaching prompt** — a ready-made prompt for AI-assisted step-by-step cooking

Results are cached in `recipes/.cache/` as JSON. The build step reads from cache and never calls the API.

### Affiliate Shopping

When enrichment data is available, recipe pages display:

- **Shop Ingredients** — individual shopping links plus "Copy list" and "Buy all" bulk actions
- **Gear** — recommended tools with shopping links and bulk actions

Configure providers via environment variables:

```bash
AMAZON_AFFILIATE_TAG=your-tag-20 npm run generate
WALMART_AFFILIATE_ID=your-id npm run generate
```

### Taxonomy System

Recipes are automatically grouped by:

| Taxonomy | Example Values |
|----------|---------------|
| Category | Main Course, Side Dish, Dessert |
| Cuisine | Japanese-American, Italian, Mexican |
| Ingredient | Chicken, Soy Sauce, Rice |
| Allergy | Soy, Dairy, Gluten |
| Flavor | Sweet, Savory, Umami |
| Sauce | Teriyaki, Marinara |
| Tool | Skillet, Cutting Board |
| Skill Level | Easy, Intermediate, Advanced |
| Author | Claude Chef Community |

Each taxonomy type gets an index page and individual hub pages with paginated recipe listings.

### Favorites

Curate a collection of featured recipes by listing slugs in `favorites.json`:

```json
["teriyaki-and-sesame-seed-chicken", "teriyaki-roasted-broccoli"]
```

Favorites are highlighted on the homepage and have a dedicated `/favorites.html` page.

### SEO & Structured Data

- JSON-LD: `Recipe`, `BreadcrumbList`, `WebSite`, `ItemList`, `CollectionPage`
- Open Graph and Twitter Card meta tags on every page
- `sitemap.xml` with priority weighting
- `robots.txt`
- `llms.txt` — LLM-friendly site summary ([llmstxt.org](https://llmstxt.org) standard)
- RSS feeds — main feed at `/feed.xml` plus per-category feeds

## Recipe Format

Recipes are Markdown files in `recipes/` with YAML frontmatter:

```yaml
---
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
...
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Recipe name |
| `description` | string | Short summary (used in cards and meta tags) |
| `author` | string | Recipe author |
| `prep_time` | ISO 8601 | Preparation time (e.g. `PT20M`) |
| `cook_time` | ISO 8601 | Cooking time (e.g. `PT1H30M`) |
| `servings` | number | Number of servings |
| `calories` | number | Calories per serving |
| `keywords` | string[] | SEO keywords |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `recipe_category` | string | Main Course, Side Dish, Dessert, etc. |
| `cuisine` | string | Cuisine type |
| `skill_level` | string | Easy, Intermediate, or Advanced |
| `image` | URL | Recipe photo URL |
| `recipe_ingredients` | string[] | Ingredient tags for taxonomy |
| `allergies` | string[] | Allergen tags |
| `flavors` | string[] | Flavor profile tags |
| `sauces` | string[] | Sauce type tags |
| `tools` | string[] | Kitchen equipment tags |
| `pairings` | string[] | Slugs of complementary recipes |

## Architecture

```
claude-chef/
├── recipes/              # Markdown recipe files
│   └── .cache/           # AI enrichment cache (JSON)
├── src/
│   ├── cli/              # CLI commands (submit, enrich)
│   ├── generator/        # Static site generator
│   │   ├── index.ts           # Build orchestrator
│   │   ├── template.ts        # HTML page renderers
│   │   ├── docs-pages.ts      # Docs & changelog renderers
│   │   ├── parser.ts          # Markdown -> ParsedRecipe
│   │   ├── taxonomy.ts        # Category/cuisine/tag grouping
│   │   ├── sanitizer.ts       # Content sanitization
│   │   ├── ingredient-parser.ts  # Quantity extraction
│   │   ├── structured-data.ts    # JSON-LD generation
│   │   ├── sitemap.ts         # sitemap.xml
│   │   ├── robots.ts          # robots.txt
│   │   ├── llms-txt.ts        # llms.txt
│   │   ├── rss.ts             # RSS feed generation
│   │   └── cook-mode.ts       # AI coaching prompt builder
│   ├── enrichment/       # AI-powered recipe enrichment
│   │   ├── enricher.ts        # Claude API integration
│   │   ├── prompt.ts          # Enrichment prompt builder
│   │   ├── cache.ts           # File-based enrichment cache
│   │   └── types.ts           # EnrichmentResult interface
│   ├── affiliates/       # Shopping link generation
│   │   ├── registry.ts        # Provider registry
│   │   ├── link-generator.ts  # URL builder
│   │   ├── amazon.ts          # Amazon search URLs
│   │   ├── walmart.ts         # Walmart search URLs
│   │   └── types.ts           # AffiliateLink interface
│   └── types.ts          # Core type definitions
├── tests/                # Jest test suite
├── docs/                 # Generated static site output
├── favorites.json        # Curated favorite recipe slugs
├── CHANGELOG.md          # Version history
└── package.json
```

### Build Pipeline

The static site generator (`src/generator/index.ts`) runs in a single pass:

1. **Parse** — Read all `.md` files, extract frontmatter and body via `gray-matter`
2. **Taxonomize** — Group recipes by all taxonomy types
3. **Enrich** — Load cached AI enrichment data
4. **Affiliate** — Generate shopping links from enrichment data
5. **Render** — Generate HTML for every recipe, taxonomy hub, taxonomy index, index, about, contribute, favorites, docs, and changelog page
6. **SEO** — Generate `sitemap.xml`, `robots.txt`, `llms.txt`, RSS feeds, JSON-LD, and `CNAME`

### Testing

```bash
npm test
```

The test suite uses Jest with ts-jest. Test files cover:

| Test File | Coverage |
|-----------|----------|
| `template.test.ts` | All page renderers, recipe cards, share/copy UI, taxonomy pills |
| `parser.test.ts` | Markdown parsing, frontmatter extraction |
| `taxonomy.test.ts` | Taxonomy grouping, slug generation |
| `ingredient-parser.test.ts` | Quantity/unit extraction |
| `structured-data.test.ts` | JSON-LD schema generation |
| `sanitizer.test.ts` | Content sanitization |
| `sitemap.test.ts` | Sitemap XML generation |
| `robots.test.ts` | robots.txt generation |
| `generator.test.ts` | Full integration build test |
| `enrichment/*.test.ts` | Enricher, prompt builder, cache |
| `affiliates/*.test.ts` | Amazon, Walmart, registry, link generator |

## Deployment

The site deploys to GitHub Pages via `.github/workflows/deploy-site.yml` on every push to `main` that modifies `recipes/`, `src/`, or the workflow itself. The workflow:

1. Installs dependencies
2. Compiles TypeScript
3. Runs the test suite
4. Builds the static site into `docs/`
5. Deploys to GitHub Pages

The output is served at [claudechef.com](https://claudechef.com) via the `CNAME` file.

## Contributing

### Adding Recipes

Visit [claudechef.com/contribute.html](https://claudechef.com/contribute.html) to submit a recipe via the browser-based form (generates a GitHub issue).

Or add a `.md` file directly to `recipes/` following the format above.

### Code Contributions

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure `npm test` passes
5. Submit a pull request

## Roadmap

See the [Claude Chef Roadmap](https://github.com/users/greynewell/projects/3) for planned features and milestones.

## Documentation

- [Developer Docs](https://claudechef.com/docs.html) — architecture, build pipeline, recipe format reference
- [Changelog](https://claudechef.com/changelog.html) — version history and release notes
- [Roadmap](https://github.com/users/greynewell/projects/3) — planned features and milestones
- [CHANGELOG.md](./CHANGELOG.md) — changelog in Markdown format

## License

[CC0-1.0 (Public Domain)](./LICENSE) — No rights reserved.
