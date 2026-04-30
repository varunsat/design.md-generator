/**
 * Best-effort major-version extraction from a semver range string.
 * Handles "^3.4.0", "~4.0", ">=3", "3.4.x", "*", "next", "latest".
 * Returns undefined if no numeric major can be extracted.
 */
export function parseMajor(range: string): number | undefined {
  const match = range.match(/(\d+)/);
  return match?.[1] ? Number(match[1]) : undefined;
}

export function depVersion(
  pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } | undefined,
  name: string,
): string | undefined {
  return pkg?.dependencies?.[name] ?? pkg?.devDependencies?.[name];
}
