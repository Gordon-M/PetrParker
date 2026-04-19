import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function writeTextFile(filePath: string, contents: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, contents, 'utf8');
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  const contents = `${JSON.stringify(value, null, 2)}\n`;
  await writeTextFile(filePath, contents);
}

export async function writeBinaryFile(filePath: string, value: Uint8Array): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, value);
}

export async function listFilesRecursive(rootDir: string): Promise<string[]> {
  try {
    const entries = await readdir(rootDir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const entryPath = path.join(rootDir, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await listFilesRecursive(entryPath)));
        continue;
      }

      if (entry.isFile()) {
        files.push(entryPath);
      }
    }

    return files.sort((left, right) => left.localeCompare(right));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}
