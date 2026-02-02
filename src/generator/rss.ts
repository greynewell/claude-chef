import { ParsedRecipe, Taxonomy } from '../types';

export interface RssFeedOptions {
  title: string;
  description: string;
  feedUrl: string;
  siteUrl: string;
  recipes: ParsedRecipe[];
  buildDate: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate an RSS 2.0 feed XML string.
 */
export function generateRssFeed(options: RssFeedOptions): string {
  const { title, description, feedUrl, siteUrl, recipes, buildDate } = options;
  const pubDate = new Date(buildDate).toUTCString();

  const items = recipes.map(recipe => {
    const link = `${siteUrl}/${recipe.slug}.html`;
    const itemPubDate = new Date(buildDate).toUTCString();

    const categories: string[] = [];
    if (recipe.frontmatter.recipe_category) {
      categories.push(recipe.frontmatter.recipe_category);
    }
    if (recipe.frontmatter.cuisine) {
      categories.push(recipe.frontmatter.cuisine);
    }

    const categoryTags = categories
      .map(cat => `    <category>${escapeXml(cat)}</category>`)
      .join('\n');

    const categoryBlock = categoryTags ? `\n${categoryTags}` : '';

    return `  <item>
    <title>${escapeXml(recipe.frontmatter.title)}</title>
    <link>${link}</link>
    <description>${escapeXml(recipe.frontmatter.description)}</description>${categoryBlock}
    <guid isPermaLink="true">${link}</guid>
    <pubDate>${itemPubDate}</pubDate>
  </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(title)}</title>
  <link>${siteUrl}</link>
  <description>${escapeXml(description)}</description>
  <language>en</language>
  <lastBuildDate>${pubDate}</lastBuildDate>
  <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>`;
}

/**
 * Generate all RSS feeds: a main feed and per-category feeds.
 */
export function generateAllRssFeeds(
  recipes: ParsedRecipe[],
  taxonomies: Taxonomy[],
  baseUrl: string,
  buildDate: string
): { relativePath: string; content: string }[] {
  const feeds: { relativePath: string; content: string }[] = [];

  // Main feed
  feeds.push({
    relativePath: 'feed.xml',
    content: generateRssFeed({
      title: 'Claude Chef',
      description: 'Delicious, tested recipes with AI-powered cooking guidance.',
      feedUrl: `${baseUrl}/feed.xml`,
      siteUrl: baseUrl,
      recipes,
      buildDate,
    }),
  });

  // Per-category feeds
  const categoryTaxonomy = taxonomies.find(t => t.type === 'category');
  if (categoryTaxonomy) {
    for (const entry of categoryTaxonomy.entries) {
      const relativePath = `category/${entry.slug}/feed.xml`;
      feeds.push({
        relativePath,
        content: generateRssFeed({
          title: `Claude Chef — ${entry.name}`,
          description: `${entry.name} recipes from Claude Chef.`,
          feedUrl: `${baseUrl}/${relativePath}`,
          siteUrl: baseUrl,
          recipes: entry.recipes,
          buildDate,
        }),
      });
    }
  }

  return feeds;
}
