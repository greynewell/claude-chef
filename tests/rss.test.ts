import { generateRssFeed, generateAllRssFeeds, RssFeedOptions } from '../src/generator/rss';
import { ParsedRecipe, Taxonomy, TaxonomyDescriptions } from '../src/types';

const baseUrl = 'https://claudechef.com';

const mockDescriptions: TaxonomyDescriptions = {
  hubTitle: (name: string) => `${name} Recipes`,
  hubMetaDescription: (name: string) => `Browse ${name.toLowerCase()} recipes.`,
  hubSubheading: (name: string, count: number) => `${count} recipes in ${name.toLowerCase()}`,
  indexDescription: 'Browse by type.',
  collectionDescription: (name: string) => `A collection of ${name.toLowerCase()} recipes.`,
};

function makeRecipe(title: string, slug: string, description: string, category?: string, cuisine?: string): ParsedRecipe {
  return {
    frontmatter: {
      title,
      description,
      author: 'Test Author',
      prep_time: 'PT10M',
      cook_time: 'PT20M',
      servings: 4,
      calories: 300,
      keywords: ['test'],
      recipe_category: category,
      cuisine,
    },
    ingredients: ['1 cup flour'],
    instructions: ['Mix.'],
    body: '## Ingredients\n\n- 1 cup flour\n\n## Instructions\n\n1. Mix.',
    slug,
    sourceFile: `${slug}.md`,
  };
}

const recipes: ParsedRecipe[] = [
  makeRecipe('Teriyaki Chicken', 'teriyaki-chicken', 'Pan-seared chicken.', 'Main Course', 'Japanese-American'),
  makeRecipe('Apple Pie', 'apple-pie', 'Classic apple pie.', 'Dessert', 'American'),
];

const defaultOptions: RssFeedOptions = {
  title: 'Claude Chef',
  description: 'Delicious recipes.',
  feedUrl: `${baseUrl}/feed.xml`,
  siteUrl: baseUrl,
  recipes,
  buildDate: '2024-01-15',
};

describe('RSS Feed Generator', () => {
  describe('generateRssFeed', () => {
    it('should produce valid RSS 2.0 XML declaration and structure', () => {
      const xml = generateRssFeed(defaultOptions);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<rss version="2.0"');
      expect(xml).toContain('<channel>');
      expect(xml).toContain('</channel>');
      expect(xml).toContain('</rss>');
    });

    it('should include channel metadata', () => {
      const xml = generateRssFeed(defaultOptions);
      expect(xml).toContain('<title>Claude Chef</title>');
      expect(xml).toContain(`<link>${baseUrl}</link>`);
      expect(xml).toContain('<language>en</language>');
    });

    it('should include atom:link self-reference with namespace', () => {
      const xml = generateRssFeed(defaultOptions);
      expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
      expect(xml).toContain(`<atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>`);
    });

    it('should include items with title, link, description, guid, and pubDate', () => {
      const xml = generateRssFeed(defaultOptions);
      expect(xml).toContain('<title>Teriyaki Chicken</title>');
      expect(xml).toContain(`<link>${baseUrl}/teriyaki-chicken.html</link>`);
      expect(xml).toContain('<description>Pan-seared chicken.</description>');
      expect(xml).toContain(`<guid isPermaLink="true">${baseUrl}/teriyaki-chicken.html</guid>`);
      expect(xml).toContain('<pubDate>');
    });

    it('should include <category> elements from recipe_category and cuisine', () => {
      const xml = generateRssFeed(defaultOptions);
      expect(xml).toContain('<category>Main Course</category>');
      expect(xml).toContain('<category>Japanese-American</category>');
      expect(xml).toContain('<category>Dessert</category>');
      expect(xml).toContain('<category>American</category>');
    });

    it('should use RFC 2822 date format in pubDate', () => {
      const xml = generateRssFeed(defaultOptions);
      // new Date('2024-01-15').toUTCString() produces RFC 2822 format
      const expectedDate = new Date('2024-01-15').toUTCString();
      expect(xml).toContain(`<pubDate>${expectedDate}</pubDate>`);
      expect(xml).toContain(`<lastBuildDate>${expectedDate}</lastBuildDate>`);
    });

    it('should escape XML special characters in text content', () => {
      const specialRecipe = makeRecipe(
        'Mac & Cheese <Deluxe>',
        'mac-cheese',
        'Creamy "mac" & cheese with <special> sauce.',
      );
      const xml = generateRssFeed({ ...defaultOptions, recipes: [specialRecipe] });
      expect(xml).toContain('Mac &amp; Cheese &lt;Deluxe&gt;');
      expect(xml).toContain('Creamy &quot;mac&quot; &amp; cheese with &lt;special&gt; sauce.');
    });

    it('should produce valid XML with no items for empty recipes', () => {
      const xml = generateRssFeed({ ...defaultOptions, recipes: [] });
      expect(xml).toContain('<channel>');
      expect(xml).toContain('</channel>');
      expect(xml).not.toContain('<item>');
    });

    it('should omit <category> when recipe has no category or cuisine', () => {
      const plainRecipe = makeRecipe('Plain Toast', 'plain-toast', 'Just toast.');
      const xml = generateRssFeed({ ...defaultOptions, recipes: [plainRecipe] });
      expect(xml).toContain('<title>Plain Toast</title>');
      expect(xml).not.toContain('<category>');
    });

    it('should include description in channel', () => {
      const xml = generateRssFeed(defaultOptions);
      expect(xml).toContain('<description>Delicious recipes.</description>');
    });
  });

  describe('generateAllRssFeeds', () => {
    const taxonomies: Taxonomy[] = [
      {
        type: 'category',
        label: 'Categories',
        labelSingular: 'Category',
        entries: [
          { name: 'Main Course', slug: 'main-course', recipes: [recipes[0]] },
          { name: 'Dessert', slug: 'dessert', recipes: [recipes[1]] },
        ],
        descriptions: mockDescriptions,
      },
      {
        type: 'cuisine',
        label: 'Cuisines',
        labelSingular: 'Cuisine',
        entries: [
          { name: 'Japanese-American', slug: 'japanese-american', recipes: [recipes[0]] },
        ],
        descriptions: mockDescriptions,
      },
    ];

    it('should return main feed plus per-category feeds', () => {
      const feeds = generateAllRssFeeds(recipes, taxonomies, baseUrl, '2024-01-15');
      const paths = feeds.map(f => f.relativePath);
      expect(paths).toContain('feed.xml');
      expect(paths).toContain('category/main-course/feed.xml');
      expect(paths).toContain('category/dessert/feed.xml');
      // Should not generate per-cuisine feeds
      expect(paths).not.toContain('cuisine/japanese-american/feed.xml');
      expect(feeds.length).toBe(3);
    });

    it('should use correct relative paths for category feeds', () => {
      const feeds = generateAllRssFeeds(recipes, taxonomies, baseUrl, '2024-01-15');
      const mainCourseFeed = feeds.find(f => f.relativePath === 'category/main-course/feed.xml');
      expect(mainCourseFeed).toBeDefined();
      expect(mainCourseFeed!.content).toContain('Main Course');
      expect(mainCourseFeed!.content).toContain(`${baseUrl}/category/main-course/feed.xml`);
    });
  });
});
