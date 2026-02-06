export interface LlmClient {
  complete(prompt: string): Promise<string>;
}

export interface IngredientSearchTerm {
  ingredient: string;
  searchTerm: string;
  /** Canonical ingredient name for taxonomy (e.g., "eggs" -> "Egg", "baby spinach" -> "Spinach") */
  normalizedName: string;
}

export interface GearItem {
  name: string;
  searchTerm: string;
}

export interface EnrichmentResult {
  ingredients: IngredientSearchTerm[];
  gear: GearItem[];
  cookingTips: string[];
  coachingPrompt: string;
}

export interface CacheEntry {
  contentHash: string;
  enrichment: EnrichmentResult;
  timestamp: string;
}
