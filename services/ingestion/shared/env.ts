import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ENV_FILES = ['.env.local', '.env'];

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseEnvFile(contents: string): Array<[string, string]> {
  const entries: Array<[string, string]> = [];

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripWrappingQuotes(line.slice(separatorIndex + 1).trim());

    if (!key) {
      continue;
    }

    entries.push([key, value]);
  }

  return entries;
}

export function loadLocalEnv(): { loadedFiles: string[]; loadedKeys: string[] } {
  const loadedFiles: string[] = [];
  const loadedKeys: string[] = [];

  for (const fileName of ENV_FILES) {
    const filePath = path.join(process.cwd(), fileName);

    if (!existsSync(filePath)) {
      continue;
    }

    const contents = readFileSync(filePath, 'utf8');

    for (const [key, value] of parseEnvFile(contents)) {
      if (process.env[key] != null) {
        continue;
      }

      process.env[key] = value;
      loadedKeys.push(key);
    }

    loadedFiles.push(fileName);
  }

  return { loadedFiles, loadedKeys };
}
