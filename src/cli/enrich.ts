import * as fs from 'fs';
import * as path from 'path';
import { parseRecipeFile } from '../generator/parser';
import { enrichRecipe, enrichRecipeBatch } from '../enrichment/enricher';
import { isCacheValid, readCache, computeContentHash } from '../enrichment/cache';
import { LlmClient } from '../enrichment/types';

export interface EnrichOptions {
  slug?: string;
  batch?: number;
  batchSize?: number;  // recipes per API call
  skipCached?: boolean;
}

export async function enrichCommand(
  recipesDir: string,
  client: LlmClient,
  options: EnrichOptions = {}
): Promise<void> {
  const { slug, batch, batchSize = 5, skipCached = true } = options;
  const cacheDir = path.join(recipesDir, '.cache');
  let files = fs.readdirSync(recipesDir).filter(f => f.endsWith('.md'));

  // Filter to specific slug if provided
  if (slug) {
    files = files.filter(f => path.basename(f, '.md') === slug);
  }

  // If skipCached, filter out already-enriched recipes
  if (skipCached && !slug) {
    files = files.filter(f => {
      const recipeSlug = path.basename(f, '.md');
      const filePath = path.join(recipesDir, f);
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const hash = computeContentHash(rawContent);
      const cached = readCache(cacheDir, recipeSlug);
      return !isCacheValid(cached, hash);
    });
    console.log(`Found ${files.length} recipes needing enrichment`);
  }

  // Limit total recipes if batch specified
  if (batch && batch > 0) {
    files = files.slice(0, batch);
    console.log(`Processing ${files.length} recipes total`);
  }

  let processed = 0;
  let failed = 0;
  const totalApiCalls = Math.ceil(files.length / batchSize);
  let apiCall = 0;

  // Process in batches of batchSize recipes per API call
  for (let i = 0; i < files.length; i += batchSize) {
    const batchFiles = files.slice(i, i + batchSize);
    apiCall++;

    const recipes = batchFiles.map(file => {
      const recipeSlug = path.basename(file, '.md');
      const filePath = path.join(recipesDir, file);
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const recipe = parseRecipeFile(filePath);
      return { slug: recipeSlug, recipe, rawContent };
    });

    try {
      console.log(`[API ${apiCall}/${totalApiCalls}] Enriching ${recipes.map(r => r.slug).join(', ')}...`);
      const results = await enrichRecipeBatch(recipes, client, cacheDir);

      for (const r of recipes) {
        if (results.has(r.slug)) {
          processed++;
        } else {
          failed++;
          console.log(`  Warning: No result for ${r.slug}`);
        }
      }
      console.log(`  Done: ${results.size}/${recipes.length} succeeded`);
    } catch (err) {
      failed += recipes.length;
      console.error(`  Batch failed:`, err);
    }
  }

  console.log(`\nDone: ${processed} enriched, ${failed} failed (${apiCall} API calls)`);
}
