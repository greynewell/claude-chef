import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { ParsedRecipe, RecipeFrontmatter } from '../types';

/**
 * Parse a recipe markdown string into a structured object.
 */
export function parseRecipeString(content: string, filename: string): ParsedRecipe {
  const { data, content: body } = matter(content);
  const frontmatter = data as RecipeFrontmatter;

  const ingredients = extractListItems(body, 'Ingredients');
  const instructions = extractOrderedListItems(body, 'Instructions');
  const slug = path.basename(filename, path.extname(filename));

  return {
    frontmatter,
    ingredients,
    instructions,
    body,
    slug,
    sourceFile: filename,
  };
}

/**
 * Parse a recipe file from disk.
 */
export function parseRecipeFile(filePath: string): ParsedRecipe {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath);
  return parseRecipeString(content, filename);
}

/**
 * Extract unordered list items from a markdown section.
 */
function extractListItems(body: string, sectionName: string): string[] {
  const sectionRegex = new RegExp(
    `##\\s+${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`
  );
  const match = body.match(sectionRegex);
  if (!match) return [];

  const lines = match[1].split('\n');
  return lines
    .filter(line => /^\s*-\s+/.test(line))
    .map(line => line.replace(/^\s*-\s+/, '').trim());
}

/**
 * Extract ordered list items from a markdown section.
 */
function extractOrderedListItems(body: string, sectionName: string): string[] {
  const sectionRegex = new RegExp(
    `##\\s+${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`
  );
  const match = body.match(sectionRegex);
  if (!match) return [];

  const lines = match[1].split('\n');
  return lines
    .filter(line => /^\s*\d+\.\s+/.test(line))
    .map(line => line.replace(/^\s*\d+\.\s+/, '').trim());
}
