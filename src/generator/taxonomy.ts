import { ParsedRecipe, Taxonomy, TaxonomyDescriptions, TaxonomyEntry, TaxonomyType } from '../types';

/**
 * Convert a display name to a URL-safe slug.
 * "Main Course" → "main-course"
 */
export function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface TaxonomyConfig {
  type: TaxonomyType;
  label: string;
  labelSingular: string;
  extract: (recipe: ParsedRecipe) => string[];
  invert?: boolean;
  hubTitle: (name: string) => string;
  hubMetaDescription: (name: string) => string;
  hubSubheading: (name: string, count: number, start?: number, end?: number) => string;
  indexDescription: string;
  collectionDescription: (name: string) => string;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function defaultSubheading(preposition: string): (name: string, count: number, start?: number, end?: number) => string {
  return (name, count, start?, end?) => {
    if (start !== undefined && end !== undefined) {
      return `Showing ${formatNumber(start)}\u2013${formatNumber(end)} of ${formatNumber(count)} recipes ${preposition} ${name.toLowerCase()}`;
    }
    return `${formatNumber(count)} recipe${count === 1 ? '' : 's'} ${preposition} ${name.toLowerCase()}`;
  };
}

export const TAXONOMY_CONFIGS: TaxonomyConfig[] = [
  {
    type: 'category',
    label: 'Categories',
    labelSingular: 'Category',
    extract: (r) => r.frontmatter.recipe_category ? [r.frontmatter.recipe_category] : [],
    hubTitle: (name) => `${name} Recipes`,
    hubMetaDescription: (name) => `Browse ${name.toLowerCase()} recipes from Claude Chef.`,
    hubSubheading: defaultSubheading('in'),
    indexDescription: 'Browse by meal type \u2014 main courses, sides, desserts, and more.',
    collectionDescription: (name) => `A collection of ${name.toLowerCase()} recipes from Claude Chef.`,
  },
  {
    type: 'cuisine',
    label: 'Cuisines',
    labelSingular: 'Cuisine',
    extract: (r) => r.frontmatter.cuisine ? [r.frontmatter.cuisine] : [],
    hubTitle: (name) => `${name} Recipes`,
    hubMetaDescription: (name) => `Explore ${name.toLowerCase()} recipes from Claude Chef.`,
    hubSubheading: defaultSubheading('in'),
    indexDescription: 'Explore dishes from cuisines around the world.',
    collectionDescription: (name) => `A collection of ${name.toLowerCase()} recipes from Claude Chef.`,
  },
  {
    type: 'ingredient',
    label: 'Ingredients',
    labelSingular: 'Ingredient',
    extract: (r) => r.frontmatter.recipe_ingredients || [],
    hubTitle: (name) => `Recipes with ${name}`,
    hubMetaDescription: (name) => `Find recipes with ${name.toLowerCase()} from Claude Chef.`,
    hubSubheading: defaultSubheading('with'),
    indexDescription: 'Find recipes by key ingredient.',
    collectionDescription: (name) => `Recipes featuring ${name.toLowerCase()} from Claude Chef.`,
  },
  {
    type: 'allergy',
    label: 'Allergies',
    labelSingular: 'Allergy',
    extract: (r) => r.frontmatter.allergies || [],
    invert: true,
    hubTitle: (name) => `${name} Recipes`,
    hubMetaDescription: (name) => `Browse ${name.toLowerCase()} recipes from Claude Chef.`,
    hubSubheading: (name, count, start?, end?) => {
      if (start !== undefined && end !== undefined) {
        return `Showing ${formatNumber(start)}\u2013${formatNumber(end)} of ${formatNumber(count)} ${name.toLowerCase()} recipes`;
      }
      return `${formatNumber(count)} ${name.toLowerCase()} recipe${count === 1 ? '' : 's'}`;
    },
    indexDescription: 'Find recipes free from common allergens.',
    collectionDescription: (name) => `${name} recipes from Claude Chef.`,
  },
  {
    type: 'flavor',
    label: 'Flavors',
    labelSingular: 'Flavor',
    extract: (r) => r.frontmatter.flavors || [],
    hubTitle: (name) => `${name} Recipes`,
    hubMetaDescription: (name) => `Find ${name.toLowerCase()} recipes from Claude Chef.`,
    hubSubheading: defaultSubheading('featuring'),
    indexDescription: 'Find recipes by flavor profile.',
    collectionDescription: (name) => `${name} recipes from Claude Chef.`,
  },
  {
    type: 'sauce',
    label: 'Sauces',
    labelSingular: 'Sauce',
    extract: (r) => r.frontmatter.sauces || [],
    hubTitle: (name) => `Recipes with ${name} Sauce`,
    hubMetaDescription: (name) => `Browse recipes with ${name.toLowerCase()} sauce from Claude Chef.`,
    hubSubheading: defaultSubheading('with'),
    indexDescription: 'Browse recipes by sauce.',
    collectionDescription: (name) => `Recipes with ${name.toLowerCase()} sauce from Claude Chef.`,
  },
  {
    type: 'tool',
    label: 'Tools',
    labelSingular: 'Tool',
    extract: (r) => r.frontmatter.tools || [],
    hubTitle: (name) => `Recipes Using a ${name}`,
    hubMetaDescription: (name) => `Find recipes using a ${name.toLowerCase()} from Claude Chef.`,
    hubSubheading: defaultSubheading('using a'),
    indexDescription: 'Find recipes by kitchen tool.',
    collectionDescription: (name) => `Recipes using a ${name.toLowerCase()} from Claude Chef.`,
  },
  {
    type: 'skill_level',
    label: 'Skill Levels',
    labelSingular: 'Skill Level',
    extract: (r) => r.frontmatter.skill_level ? [r.frontmatter.skill_level] : [],
    hubTitle: (name) => `${name} Recipes`,
    hubMetaDescription: (name) => `Browse ${name.toLowerCase()} recipes from Claude Chef.`,
    hubSubheading: defaultSubheading('at'),
    indexDescription: 'Browse recipes by difficulty level.',
    collectionDescription: (name) => `${name} recipes from Claude Chef.`,
  },
  {
    type: 'author',
    label: 'Authors',
    labelSingular: 'Author',
    extract: (r) => [r.frontmatter.author],
    hubTitle: (name) => `Recipes by ${name}`,
    hubMetaDescription: (name) => `Browse recipes by ${name} on Claude Chef.`,
    hubSubheading: defaultSubheading('by'),
    indexDescription: 'Browse recipes by author.',
    collectionDescription: (name) => `Recipes by ${name} on Claude Chef.`,
  },
];

/**
 * Build all taxonomies from parsed recipes using the data-driven config.
 * Entries are sorted alphabetically by slug; first-seen casing is preserved for display name.
 */
export function buildAllTaxonomies(recipes: ParsedRecipe[]): Taxonomy[] {
  return TAXONOMY_CONFIGS.map((config) => {
    const map = new Map<string, { name: string; recipes: ParsedRecipe[] }>();

    if (config.invert) {
      // Inverted taxonomy: collect all unique values, then for each value
      // include recipes that do NOT have it.
      const allValues = new Map<string, string>(); // slug → first-seen display name
      for (const recipe of recipes) {
        for (const value of config.extract(recipe)) {
          const slug = toSlug(value);
          if (slug && !allValues.has(slug)) {
            allValues.set(slug, value);
          }
        }
      }
      for (const [slug, originalName] of allValues) {
        const recipesWithout = recipes.filter((recipe) => {
          const slugs = config.extract(recipe).map((v) => toSlug(v));
          return !slugs.includes(slug);
        });
        map.set(slug, { name: `No ${originalName}`, recipes: recipesWithout });
      }
    } else {
      for (const recipe of recipes) {
        const values = config.extract(recipe);
        for (const value of values) {
          const slug = toSlug(value);
          if (slug) {
            const existing = map.get(slug);
            if (existing) {
              existing.recipes.push(recipe);
            } else {
              map.set(slug, { name: value, recipes: [recipe] });
            }
          }
        }
      }
    }

    const entries: TaxonomyEntry[] = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slug, { name, recipes: recs }]) => ({ name, slug, recipes: recs }));

    const descriptions: TaxonomyDescriptions = {
      hubTitle: config.hubTitle,
      hubMetaDescription: config.hubMetaDescription,
      hubSubheading: config.hubSubheading,
      indexDescription: config.indexDescription,
      collectionDescription: config.collectionDescription,
    };

    return {
      type: config.type,
      label: config.label,
      labelSingular: config.labelSingular,
      entries,
      descriptions,
    };
  });
}
