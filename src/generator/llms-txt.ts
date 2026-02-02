import { ParsedRecipe, Taxonomy } from '../types';

/**
 * Generate an llms.txt file following the llmstxt.org standard.
 * Provides an LLM-friendly summary of the site's recipes and taxonomies.
 */
export function generateLlmsTxt(
  recipes: ParsedRecipe[],
  taxonomies: Taxonomy[],
  baseUrl: string
): string {
  const lines: string[] = [];

  lines.push('# Claude Chef');
  lines.push('');
  lines.push('> Delicious, tested recipes with AI-powered cooking guidance.');
  lines.push('');

  // Recipes sorted alphabetically by title
  lines.push('## Recipes');
  lines.push('');
  const sorted = [...recipes].sort((a, b) =>
    a.frontmatter.title.localeCompare(b.frontmatter.title)
  );
  for (const recipe of sorted) {
    const url = `${baseUrl}/${recipe.slug}.html`;
    lines.push(`- [${recipe.frontmatter.title}](${url}): ${recipe.frontmatter.description}`);
  }

  // Only include category and cuisine taxonomies (primary navigation ones)
  const navigationTypes = ['category', 'cuisine'];
  for (const taxonomy of taxonomies) {
    if (!navigationTypes.includes(taxonomy.type)) continue;

    lines.push('');
    lines.push(`## ${taxonomy.label}`);
    lines.push('');
    for (const entry of taxonomy.entries) {
      const url = `${baseUrl}/${taxonomy.type}/${entry.slug}.html`;
      lines.push(`- [${entry.name}](${url})`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
