import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { PackageJson } from '../types.js';

export async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(path: string): Promise<T | undefined> {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export async function readTextFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
}

export async function readPackageJson(root: string): Promise<PackageJson | undefined> {
  return readJsonFile<PackageJson>(join(root, 'package.json'));
}

export async function findFirstExisting(
  root: string,
  candidates: string[],
): Promise<string | undefined> {
  for (const candidate of candidates) {
    const path = join(root, candidate);
    if (await fileExists(path)) return path;
  }
  return undefined;
}
