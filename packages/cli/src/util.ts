import { resolve } from 'node:path';

export function resolveRoot(input?: string): string {
  return resolve(input ?? '.');
}

export function fail(message: string, exitCode = 1): never {
  process.stderr.write(`error: ${message}\n`);
  process.exit(exitCode);
}
