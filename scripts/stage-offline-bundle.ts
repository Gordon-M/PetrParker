import { access, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, 'data', 'ingestion', 'exports', 'sqlite');
const destinationRoot = path.join(repoRoot, 'assets', 'data');

const sourceDatabasePath = path.join(sourceRoot, 'latest.sqlite');
const sourceManifestPath = path.join(sourceRoot, 'latest-manifest.json');
const destinationDatabasePath = path.join(destinationRoot, 'parks.sqlite');
const destinationManifestPath = path.join(destinationRoot, 'parks-manifest.json');

async function assertExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(
      `Missing ${path.relative(repoRoot, filePath)}. Run npm run export:sqlite-bundle first.`,
    );
  }
}

async function main(): Promise<void> {
  await assertExists(sourceDatabasePath);
  await assertExists(sourceManifestPath);
  await mkdir(destinationRoot, { recursive: true });

  await copyFile(sourceDatabasePath, destinationDatabasePath);
  await copyFile(sourceManifestPath, destinationManifestPath);

  console.log(
    `Staged offline bundle into ${path.relative(repoRoot, destinationRoot)} from ${path.relative(repoRoot, sourceRoot)}`,
  );
}

await main();
