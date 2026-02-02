import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { CacheEntry } from './types';

export function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function readCache(cacheDir: string, slug: string): CacheEntry | null {
  const filePath = path.join(cacheDir, `${slug}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

export function writeCache(cacheDir: string, slug: string, entry: CacheEntry): void {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  const filePath = path.join(cacheDir, `${slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
}

export function isCacheValid(entry: CacheEntry | null, currentHash: string): boolean {
  if (!entry) return false;
  return entry.contentHash === currentHash;
}
