import { ParsedRecipe } from '../types';
import { LlmClient, EnrichmentResult } from './types';
import { computeContentHash, readCache, writeCache, isCacheValid } from './cache';
import { buildEnrichmentPrompt, parseEnrichmentResponse, buildBatchEnrichmentPrompt, parseBatchEnrichmentResponse } from './prompt';

export async function enrichRecipe(
  recipe: ParsedRecipe,
  rawContent: string,
  client: LlmClient,
  cacheDir: string
): Promise<EnrichmentResult> {
  const contentHash = computeContentHash(rawContent);
  const cached = readCache(cacheDir, recipe.slug);

  if (isCacheValid(cached, contentHash)) {
    return cached!.enrichment;
  }

  const prompt = buildEnrichmentPrompt(recipe);
  const response = await client.complete(prompt);
  const enrichment = parseEnrichmentResponse(response);

  writeCache(cacheDir, recipe.slug, {
    contentHash,
    enrichment,
    timestamp: new Date().toISOString(),
  });

  return enrichment;
}

export async function enrichRecipeBatch(
  recipes: { slug: string; recipe: ParsedRecipe; rawContent: string }[],
  client: LlmClient,
  cacheDir: string
): Promise<Map<string, EnrichmentResult>> {
  const prompt = buildBatchEnrichmentPrompt(recipes.map(r => ({ slug: r.slug, recipe: r.recipe })));
  const response = await client.complete(prompt);
  const results = parseBatchEnrichmentResponse(response, recipes.map(r => r.slug));

  // Cache each result
  for (const { slug, rawContent } of recipes) {
    const enrichment = results.get(slug);
    if (enrichment) {
      const contentHash = computeContentHash(rawContent);
      writeCache(cacheDir, slug, {
        contentHash,
        enrichment,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}
