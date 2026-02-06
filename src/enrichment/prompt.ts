import { ParsedRecipe } from '../types';
import { EnrichmentResult } from './types';

export function buildEnrichmentPrompt(recipe: ParsedRecipe): string {
  const ingredientsList = recipe.ingredients.map(i => `- ${i}`).join('\n');
  const instructionsList = recipe.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n');

  return `Analyze this recipe and return a JSON object with enrichment data.

Recipe: ${recipe.frontmatter.title}
Description: ${recipe.frontmatter.description}

Ingredients:
${ingredientsList}

Instructions:
${instructionsList}

Return a JSON object with exactly this structure:
{
  "ingredients": [{"ingredient": "original ingredient text", "searchTerm": "search-friendly term for shopping", "normalizedName": "Canonical Ingredient Name"}],
  "gear": [{"name": "equipment name", "searchTerm": "search-friendly term for purchasing"}],
  "cookingTips": ["actionable cooking tip"],
  "coachingPrompt": "A detailed prompt that a user could paste into an AI assistant to get step-by-step cooking guidance for this recipe"
}

Rules:
- For ingredients:
  - searchTerm: concise term suitable for online grocery/retail search
  - normalizedName: STRICT canonical name rules (follow exactly):
    * ALWAYS singular: eggs→Egg, tomatoes→Tomato, flakes→Flake, onions→Onion
    * white sugar/granulated sugar/caster sugar/superfine sugar → "Sugar" (NEVER "White Sugar")
    * brown sugar → "Brown Sugar", powdered sugar/confectioners sugar → "Powdered Sugar"
    * red pepper flakes/crushed red pepper → "Red Pepper Flake" (singular, NEVER "Flakes")
    * salt and pepper → list as TWO separate entries: "Salt" and "Black Pepper"
    * Remove quantities, measurements, prep words (chopped, diced, minced, etc.)
    * Title Case always (Olive Oil, Parmesan Cheese, Black Pepper)
    * Keep meaningful qualifiers (Chicken Breast ≠ Chicken Thigh, Green Onion ≠ Onion)
- For gear, identify essential cooking equipment needed and create search terms
- Provide 2-5 practical cooking tips specific to this recipe
- The coachingPrompt should be a comprehensive prompt that includes key techniques and timing
- Return ONLY valid JSON, no markdown fencing or extra text`;
}

export function buildBatchEnrichmentPrompt(recipes: { slug: string; recipe: ParsedRecipe }[]): string {
  const recipeBlocks = recipes.map(({ slug, recipe }) => {
    const ingredientsList = recipe.ingredients.map(i => `- ${i}`).join('\n');
    return `### ${slug}
Title: ${recipe.frontmatter.title}
Ingredients:
${ingredientsList}`;
  }).join('\n\n');

  return `Analyze these ${recipes.length} recipes and return enrichment data for each.

${recipeBlocks}

Return a JSON object where keys are recipe slugs and values have this structure:
{
  "recipe-slug": {
    "ingredients": [{"ingredient": "original", "searchTerm": "search term", "normalizedName": "Canonical Name"}],
    "gear": [{"name": "equipment", "searchTerm": "search term"}],
    "cookingTips": ["tip"],
    "coachingPrompt": "coaching prompt for AI assistant"
  }
}

Rules for normalizedName (STRICT - follow exactly):
- ALWAYS singular: eggs→Egg, flakes→Flake, tomatoes→Tomato
- white sugar/granulated sugar/caster sugar → "Sugar" (NEVER "White Sugar")
- brown sugar → "Brown Sugar", powdered sugar → "Powdered Sugar"
- red pepper flakes/crushed red pepper → "Red Pepper Flake" (NEVER "Flakes")
- "salt and pepper" → TWO entries: "Salt" AND "Black Pepper"
- Title Case, no quantities/prep words
- searchTerm: concise shopping term
- gear: 2-4 essential items
- cookingTips: 2-3 tips
- coachingPrompt: brief guidance prompt
- Return ONLY valid JSON, no markdown`;
}

export function parseBatchEnrichmentResponse(response: string, slugs: string[]): Map<string, EnrichmentResult> {
  let cleaned = response.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const results = new Map<string, EnrichmentResult>();

  for (const slug of slugs) {
    const obj = parsed[slug] as Record<string, unknown> | undefined;
    if (obj && Array.isArray(obj.ingredients) && Array.isArray(obj.gear)) {
      results.set(slug, {
        ingredients: obj.ingredients as EnrichmentResult['ingredients'],
        gear: obj.gear as EnrichmentResult['gear'],
        cookingTips: (obj.cookingTips as string[]) || [],
        coachingPrompt: (obj.coachingPrompt as string) || '',
      });
    }
  }

  return results;
}

export function parseEnrichmentResponse(response: string): EnrichmentResult {
  // Strip markdown code fences if present
  let cleaned = response.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse LLM response as JSON: ${cleaned.slice(0, 100)}`);
  }

  const obj = parsed as Record<string, unknown>;

  if (
    !Array.isArray(obj.ingredients) ||
    !Array.isArray(obj.gear) ||
    !Array.isArray(obj.cookingTips) ||
    typeof obj.coachingPrompt !== 'string'
  ) {
    throw new Error('LLM response missing required fields: ingredients, gear, cookingTips, coachingPrompt');
  }

  return {
    ingredients: obj.ingredients as EnrichmentResult['ingredients'],
    gear: obj.gear as EnrichmentResult['gear'],
    cookingTips: obj.cookingTips as string[],
    coachingPrompt: obj.coachingPrompt as string,
  };
}
