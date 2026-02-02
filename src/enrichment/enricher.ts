import { ParsedRecipe } from '../types';
import { LlmClient, EnrichmentResult } from './types';
import { computeContentHash, readCache, writeCache, isCacheValid } from './cache';
import { buildEnrichmentPrompt, parseEnrichmentResponse } from './prompt';

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
