import matter from 'gray-matter';
import { LintResult } from '../types';

const REQUIRED_FIELDS = [
  'title',
  'description',
  'author',
  'prep_time',
  'cook_time',
  'servings',
  'calories',
  'keywords',
];

const LINK_PATTERN = /\[([^\]]*)\]\([^)]+\)|https?:\/\/[^\s)]+/;

/**
 * Lint a recipe markdown string for submission readiness.
 * Returns errors (must fix) and warnings (should fix).
 */
export function lintRecipe(content: string, filename: string): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse frontmatter
  const { data, content: body } = matter(content);

  // Check required frontmatter fields
  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      const severity = ['title'].includes(field) ? errors : warnings;
      severity.push(`Missing required frontmatter field: ${field}`);
    }
  }

  // Check for hyperlinks in body
  const bodyLines = body.split('\n');
  for (let i = 0; i < bodyLines.length; i++) {
    if (LINK_PATTERN.test(bodyLines[i])) {
      errors.push(
        `Error: Hyperlinks detected on line ${i + 1}. Please remove external links to pass the build.`
      );
    }
  }

  // Check for Ingredients section
  if (!/##\s+Ingredients/i.test(body)) {
    errors.push('Missing required section: ## Ingredients');
  }

  // Check for Instructions section
  if (!/##\s+Instructions/i.test(body)) {
    errors.push('Missing required section: ## Instructions');
  }

  return { file: filename, errors, warnings };
}
