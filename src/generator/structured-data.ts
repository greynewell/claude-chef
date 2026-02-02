import { ParsedRecipe, RecipeJsonLd, HowToStep, BreadcrumbJsonLd, WebSiteJsonLd, ItemListJsonLd, CollectionPageJsonLd, TaxonomyType, TaxonomyDescriptions, TaxonomyEntry, Taxonomy } from '../types';
import { toSlug } from './taxonomy';

const BRANDED_KEYWORDS = ['Claude Chef', 'AI Cooking', 'Home Cooking'];
const DEFAULT_IMAGE = 'https://claudechef.com/images/og-default.jpg';

/**
 * Parse an ISO 8601 duration (e.g. PT4H30M) into total minutes.
 */
function parseDurationMinutes(iso: string): number {
  const hours = iso.match(/(\d+)H/);
  const minutes = iso.match(/(\d+)M/);
  return (hours ? parseInt(hours[1], 10) * 60 : 0) + (minutes ? parseInt(minutes[1], 10) : 0);
}

/**
 * Convert total minutes to ISO 8601 duration.
 */
function toIsoDuration(totalMinutes: number): string {
  if (totalMinutes === 0) return 'PT0M';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `PT${hours}H${minutes}M`;
  if (hours > 0) return `PT${hours}H`;
  return `PT${minutes}M`;
}

/**
 * Compute totalTime from prep + cook durations.
 */
export function computeTotalTime(prepTime: string, cookTime: string): string {
  return toIsoDuration(parseDurationMinutes(prepTime) + parseDurationMinutes(cookTime));
}

/**
 * Generate a JSON-LD structured data object for a recipe.
 */
export function generateJsonLd(recipe: ParsedRecipe, datePublished: string, baseUrl?: string, pairings?: ParsedRecipe[]): RecipeJsonLd {
  const instructions: HowToStep[] = recipe.instructions.map((text, index) => ({
    '@type': 'HowToStep',
    text,
    position: index + 1,
  }));

  const allKeywords = [...recipe.frontmatter.keywords, ...BRANDED_KEYWORDS];

  const images = recipe.frontmatter.image
    ? [recipe.frontmatter.image]
    : [DEFAULT_IMAGE];

  const jsonLd: RecipeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.frontmatter.title,
    author: {
      '@type': 'Person',
      name: recipe.frontmatter.author,
      url: `${baseUrl || 'https://claudechef.com'}/author/${toSlug(recipe.frontmatter.author)}.html`,
    },
    datePublished,
    description: recipe.frontmatter.description,
    image: images,
    prepTime: recipe.frontmatter.prep_time,
    cookTime: recipe.frontmatter.cook_time,
    totalTime: computeTotalTime(recipe.frontmatter.prep_time, recipe.frontmatter.cook_time),
    recipeYield: `${recipe.frontmatter.servings} servings`,
    nutrition: {
      '@type': 'NutritionInformation',
      calories: `${recipe.frontmatter.calories} calories`,
    },
    recipeIngredient: recipe.ingredients,
    recipeInstructions: instructions,
    keywords: allKeywords.join(', '),
  };

  if (baseUrl) {
    jsonLd.url = `${baseUrl}/${recipe.slug}.html`;
  }

  if (recipe.frontmatter.recipe_category) {
    jsonLd.recipeCategory = recipe.frontmatter.recipe_category;
  }

  if (recipe.frontmatter.cuisine) {
    jsonLd.recipeCuisine = recipe.frontmatter.cuisine;
  }

  if (pairings && pairings.length > 0) {
    const resolvedBaseUrl = baseUrl || 'https://claudechef.com';
    jsonLd.isRelatedTo = pairings.map(p => ({
      '@type': 'Recipe' as const,
      name: p.frontmatter.title,
      url: `${resolvedBaseUrl}/${p.slug}.html`,
    }));
  }

  return jsonLd;
}

/**
 * Generate BreadcrumbList JSON-LD for a recipe page.
 * When categoryBreadcrumb is provided, inserts a category level: Home > Category > Recipe
 */
export function generateBreadcrumbJsonLd(
  recipe: ParsedRecipe,
  baseUrl: string,
  categoryBreadcrumb?: { name: string; slug: string }
): BreadcrumbJsonLd {
  const items: BreadcrumbJsonLd['itemListElement'] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${baseUrl}/index.html`,
    },
  ];

  if (categoryBreadcrumb) {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: categoryBreadcrumb.name,
      item: `${baseUrl}/category/${categoryBreadcrumb.slug}.html`,
    });
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: recipe.frontmatter.title,
    });
  } else {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: recipe.frontmatter.title,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

/**
 * Generate WebSite JSON-LD for the index/home page.
 */
export function generateWebSiteJsonLd(baseUrl: string): WebSiteJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Claude Chef',
    url: baseUrl,
    description: 'Delicious recipes with AI-powered cooking guidance. Step-by-step technique, smart substitutions, and real-time coaching from Claude Chef.',
    publisher: {
      '@type': 'Organization',
      name: 'Claude Chef Community',
      url: baseUrl,
    },
  };
}

/**
 * Generate ItemList JSON-LD for the index page listing all recipes.
 */
export function generateItemListJsonLd(recipes: ParsedRecipe[], baseUrl: string): ItemListJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Claude Chef Recipes',
    description: 'A curated collection of delicious recipes with AI-powered cooking guidance from Claude Chef.',
    numberOfItems: recipes.length,
    itemListElement: recipes.map((r, i) => ({
      '@type': 'ListItem' as const,
      position: i + 1,
      url: `${baseUrl}/${r.slug}.html`,
      name: r.frontmatter.title,
    })),
  };
}

/**
 * Generate CollectionPage JSON-LD for a taxonomy hub page.
 */
export function generateCollectionPageJsonLd(
  type: TaxonomyType,
  entry: TaxonomyEntry,
  baseUrl: string,
  descriptions?: TaxonomyDescriptions | null,
  totalRecipeCount?: number
): CollectionPageJsonLd {
  const name = descriptions ? descriptions.hubTitle(entry.name) : `${entry.name} Recipes`;
  const description = descriptions
    ? descriptions.collectionDescription(entry.name)
    : `A collection of ${entry.name.toLowerCase()} recipes from Claude Chef.`;
  const totalItems = totalRecipeCount !== undefined ? totalRecipeCount : entry.recipes.length;

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: `${baseUrl}/${type}/${entry.slug}.html`,
    description,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: totalItems,
      itemListElement: entry.recipes.map((r, i) => ({
        '@type': 'ListItem' as const,
        position: i + 1,
        url: `${baseUrl}/${r.slug}.html`,
        name: r.frontmatter.title,
      })),
    },
  };
}

/**
 * Generate ItemList JSON-LD for a taxonomy index page (list of taxonomy entries).
 */
export function generateTaxonomyIndexJsonLd(taxonomy: Taxonomy, baseUrl: string): ItemListJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Claude Chef ${taxonomy.label}`,
    description: `Browse all ${taxonomy.label.toLowerCase()} on Claude Chef.`,
    numberOfItems: taxonomy.entries.length,
    itemListElement: taxonomy.entries.map((entry, i) => ({
      '@type': 'ListItem' as const,
      position: i + 1,
      url: `${baseUrl}/${taxonomy.type}/${entry.slug}.html`,
      name: entry.name,
    })),
  };
}

/**
 * Generate BreadcrumbList JSON-LD for hub pages.
 * 2-level: Home > Taxonomy Label (for index pages)
 * 3-level: Home > Taxonomy Label > Entry Name (for hub pages)
 */
export function generateHubBreadcrumbJsonLd(
  type: TaxonomyType,
  label: string,
  entryName: string | null,
  baseUrl: string
): BreadcrumbJsonLd {
  const items: BreadcrumbJsonLd['itemListElement'] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${baseUrl}/index.html`,
    },
  ];

  if (entryName) {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: label,
      item: `${baseUrl}/${type}/index.html`,
    });
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: entryName,
    });
  } else {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: label,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}
