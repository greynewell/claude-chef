import { generateLlmsTxt } from '../src/generator/llms-txt';
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
  makeRecipe('Zucchini Bread', 'zucchini-bread', 'Moist zucchini bread.', 'Dessert', 'American'),
  makeRecipe('Apple Pie', 'apple-pie', 'Classic apple pie.', 'Dessert', 'American'),
  makeRecipe('Teriyaki Chicken', 'teriyaki-chicken', 'Pan-seared chicken.', 'Main Course', 'Japanese-American'),
];

const taxonomies: Taxonomy[] = [
  {
    type: 'category',
    label: 'Categories',
    labelSingular: 'Category',
    entries: [
      { name: 'Dessert', slug: 'dessert', recipes: [recipes[0], recipes[1]] },
      { name: 'Main Course', slug: 'main-course', recipes: [recipes[2]] },
    ],
    descriptions: mockDescriptions,
  },
  {
    type: 'cuisine',
    label: 'Cuisines',
    labelSingular: 'Cuisine',
    entries: [
      { name: 'American', slug: 'american', recipes: [recipes[0], recipes[1]] },
      { name: 'Japanese-American', slug: 'japanese-american', recipes: [recipes[2]] },
    ],
    descriptions: mockDescriptions,
  },
  {
    type: 'ingredient',
    label: 'Ingredients',
    labelSingular: 'Ingredient',
    entries: [
      { name: 'Flour', slug: 'flour', recipes: recipes },
    ],
    descriptions: mockDescriptions,
  },
];

describe('llms.txt Generator', () => {
  it('should start with # Claude Chef heading', () => {
    const txt = generateLlmsTxt(recipes, taxonomies, baseUrl);
    expect(txt.startsWith('# Claude Chef\n')).toBe(true);
  });

  it('should include blockquote description', () => {
    const txt = generateLlmsTxt(recipes, taxonomies, baseUrl);
    expect(txt).toContain('> Delicious, tested recipes with AI-powered cooking guidance.');
  });

  it('should list all recipes with URLs and descriptions', () => {
    const txt = generateLlmsTxt(recipes, taxonomies, baseUrl);
    expect(txt).toContain(`- [Teriyaki Chicken](${baseUrl}/teriyaki-chicken.html): Pan-seared chicken.`);
    expect(txt).toContain(`- [Apple Pie](${baseUrl}/apple-pie.html): Classic apple pie.`);
    expect(txt).toContain(`- [Zucchini Bread](${baseUrl}/zucchini-bread.html): Moist zucchini bread.`);
  });

  it('should include Categories and Cuisines sections with entry links', () => {
    const txt = generateLlmsTxt(recipes, taxonomies, baseUrl);
    expect(txt).toContain('## Categories');
    expect(txt).toContain(`- [Dessert](${baseUrl}/category/dessert.html)`);
    expect(txt).toContain(`- [Main Course](${baseUrl}/category/main-course.html)`);
    expect(txt).toContain('## Cuisines');
    expect(txt).toContain(`- [American](${baseUrl}/cuisine/american.html)`);
    expect(txt).toContain(`- [Japanese-American](${baseUrl}/cuisine/japanese-american.html)`);
  });

  it('should exclude non-navigation taxonomy types', () => {
    const txt = generateLlmsTxt(recipes, taxonomies, baseUrl);
    expect(txt).not.toContain('## Ingredients');
    expect(txt).not.toContain('flour.html');
  });

  it('should handle empty recipe list', () => {
    const txt = generateLlmsTxt([], taxonomies, baseUrl);
    expect(txt).toContain('# Claude Chef');
    expect(txt).toContain('## Recipes');
    // No recipe lines after ## Recipes
    const recipesSection = txt.split('## Recipes')[1].split('## ')[0];
    expect(recipesSection.trim()).toBe('');
  });

  it('should sort recipes alphabetically by title', () => {
    const txt = generateLlmsTxt(recipes, taxonomies, baseUrl);
    const recipeLines = txt
      .split('## Recipes')[1]
      .split('## ')[0]
      .trim()
      .split('\n')
      .filter(line => line.startsWith('- ['));
    expect(recipeLines[0]).toContain('Apple Pie');
    expect(recipeLines[1]).toContain('Teriyaki Chicken');
    expect(recipeLines[2]).toContain('Zucchini Bread');
  });
});
