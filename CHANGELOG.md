# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — Initial Release

### Added

- **Static site generator** — Markdown recipes compiled to a fully styled, responsive HTML site
- **Recipe pages** — Structured recipe display with ingredients, instructions, prep/cook time, servings control with live portion scaling, and calorie adjustment
- **Taxonomy system** — Recipes organized by category, cuisine, ingredient, allergy, flavor, sauce, tool, skill level, and author with hub pages and index pages
- **AI enrichment** — Claude API integration for ingredient search terms, gear recommendations, cooking tips, and AI coaching prompts
- **Affiliate shopping** — Amazon and Walmart search link generation from enrichment data, with "Shop Ingredients" and "Gear" sections on recipe pages
- **Buy all actions** — "Copy list" and "Buy all on [Provider]" buttons for bulk ingredient shopping
- **Recipe cards** — Navigation cards with metadata pills (skill level, cuisine, category, prep time, cook time, calories)
- **Cook with AI** — Ready-made coaching prompts for hands-free, step-by-step guidance
- **Recipe pairings** — Suggested complementary dishes (sides, sauces, desserts)
- **Share bar** — Native Web Share API and copy-link buttons on every recipe
- **Favorites** — Curated collection driven by `favorites.json`, featured on homepage and dedicated page
- **Contribute page** — Browser-based recipe submission form that generates GitHub issues
- **SEO** — JSON-LD structured data (Recipe, BreadcrumbList, WebSite, ItemList, CollectionPage), sitemap.xml, robots.txt, Open Graph, Twitter Cards
- **llms.txt** — LLM-friendly site summary following the llmstxt.org standard
- **RSS feeds** — Main feed at `/feed.xml` plus per-category feeds at `/category/{slug}/feed.xml`
- **Responsive design** — Mobile-first layout with DM Serif Display + Inter font pairing
- **CLI plugin** — `claude plugin install claude-chef` for terminal-based cooking assistance
- **GitHub Pages deployment** — Automated CI/CD via GitHub Actions
- **Developer documentation** — Architecture overview, recipe format reference, build pipeline, and testing guide

### Infrastructure

- TypeScript 5.4+ codebase with strict compilation
- Jest test suite with 400+ tests across 20 test files
- CC0-1.0 (Public Domain) license

---

See the [Roadmap](https://github.com/users/greynewell/projects/3) for what's coming next.
