import { parseRecipeFile, parseRecipeString } from '../src/generator/parser';
import * as path from 'path';

const SAMPLE_RECIPE = `---
title: Test Recipe
description: A test recipe for unit testing.
author: Test Author
prep_time: PT10M
cook_time: PT20M
servings: 2
calories: 500
keywords:
  - test
  - sample
---

## Ingredients

- 100g ingredient one
- 200ml ingredient two
- 1 tsp ingredient three

## Instructions

1. Do the first step carefully.
2. Do the second step with precision.
3. Finish with the third step.

## Notes

Some notes about the recipe.
`;

describe('Recipe Parser', () => {
  describe('parseRecipeString', () => {
    it('should parse frontmatter fields correctly', () => {
      const result = parseRecipeString(SAMPLE_RECIPE, 'test-recipe.md');
      expect(result.frontmatter.title).toBe('Test Recipe');
      expect(result.frontmatter.description).toBe('A test recipe for unit testing.');
      expect(result.frontmatter.author).toBe('Test Author');
      expect(result.frontmatter.prep_time).toBe('PT10M');
      expect(result.frontmatter.cook_time).toBe('PT20M');
      expect(result.frontmatter.servings).toBe(2);
      expect(result.frontmatter.calories).toBe(500);
      expect(result.frontmatter.keywords).toEqual(['test', 'sample']);
    });

    it('should extract ingredients as an array of strings', () => {
      const result = parseRecipeString(SAMPLE_RECIPE, 'test-recipe.md');
      expect(result.ingredients).toHaveLength(3);
      expect(result.ingredients[0]).toBe('100g ingredient one');
      expect(result.ingredients[1]).toBe('200ml ingredient two');
      expect(result.ingredients[2]).toBe('1 tsp ingredient three');
    });

    it('should extract instructions as an array of strings', () => {
      const result = parseRecipeString(SAMPLE_RECIPE, 'test-recipe.md');
      expect(result.instructions).toHaveLength(3);
      expect(result.instructions[0]).toBe('Do the first step carefully.');
      expect(result.instructions[1]).toBe('Do the second step with precision.');
      expect(result.instructions[2]).toBe('Finish with the third step.');
    });

    it('should generate a slug from the filename', () => {
      const result = parseRecipeString(SAMPLE_RECIPE, 'my-cool-recipe.md');
      expect(result.slug).toBe('my-cool-recipe');
    });

    it('should store the source file path', () => {
      const result = parseRecipeString(SAMPLE_RECIPE, 'test-recipe.md');
      expect(result.sourceFile).toBe('test-recipe.md');
    });

    it('should include the raw body content', () => {
      const result = parseRecipeString(SAMPLE_RECIPE, 'test-recipe.md');
      expect(result.body).toContain('## Ingredients');
      expect(result.body).toContain('## Instructions');
    });
  });

  describe('parseRecipeFile', () => {
    it('should parse an actual recipe file from disk', () => {
      const recipePath = path.resolve(__dirname, '../recipes/teriyaki-and-sesame-seed-chicken.md');
      const result = parseRecipeFile(recipePath);
      expect(result.frontmatter.title).toBe('Teriyaki and Sesame Seed Chicken');
      expect(result.ingredients.length).toBeGreaterThan(0);
      expect(result.instructions.length).toBeGreaterThan(0);
      expect(result.slug).toBe('teriyaki-and-sesame-seed-chicken');
    });
  });
});
