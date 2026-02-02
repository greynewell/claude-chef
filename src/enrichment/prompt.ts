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
  "ingredients": [{"ingredient": "original ingredient text", "searchTerm": "search-friendly term for shopping"}],
  "gear": [{"name": "equipment name", "searchTerm": "search-friendly term for purchasing"}],
  "cookingTips": ["actionable cooking tip"],
  "coachingPrompt": "A detailed prompt that a user could paste into an AI assistant to get step-by-step cooking guidance for this recipe"
}

Rules:
- For ingredients, create a concise search term suitable for online grocery/retail search
- For gear, identify essential cooking equipment needed and create search terms
- Provide 2-5 practical cooking tips specific to this recipe
- The coachingPrompt should be a comprehensive prompt that includes key techniques and timing
- Return ONLY valid JSON, no markdown fencing or extra text`;
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
