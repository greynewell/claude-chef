import * as fs from 'fs';
import * as path from 'path';
import { parseRecipeFile } from '../generator/parser';
import { enrichRecipe } from '../enrichment/enricher';
import { LlmClient } from '../enrichment/types';

export async function enrichCommand(
  recipesDir: string,
  client: LlmClient,
  slug?: string
): Promise<void> {
  const cacheDir = path.join(recipesDir, '.cache');
  const files = fs.readdirSync(recipesDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const recipeSlug = path.basename(file, '.md');

    if (slug && recipeSlug !== slug) {
      continue;
    }

    const filePath = path.join(recipesDir, file);
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const recipe = parseRecipeFile(filePath);

    try {
      const result = await enrichRecipe(recipe, rawContent, client, cacheDir);
      console.log(`Enriched: ${recipeSlug} (${result.ingredients.length} ingredients, ${result.gear.length} gear items)`);
    } catch (err) {
      console.error(`Failed to enrich ${recipeSlug}:`, err);
    }
  }
}
