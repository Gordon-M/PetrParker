import path from 'node:path';

export const repoRoot = process.cwd();
export const ingestionRoot =
  process.env.PARKS_DATA_DIR ?? path.join(repoRoot, 'data', 'ingestion');
export const rawRoot = path.join(ingestionRoot, 'raw');
export const normalizedRoot = path.join(ingestionRoot, 'normalized');
export const manifestsRoot = path.join(ingestionRoot, 'manifests');
export const exportsRoot = path.join(ingestionRoot, 'exports');

export function timestampSlug(isoTimestamp: string): string {
  return isoTimestamp.replaceAll(':', '-').replaceAll('.', '-');
}
