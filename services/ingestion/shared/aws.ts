import { loadLocalEnv } from './env.ts';

export interface S3PublishConfig {
  region: string;
  bucket: string;
  prefix: string;
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

export function getS3PublishConfig(): S3PublishConfig {
  loadLocalEnv();

  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
  const bucket = process.env.PARKS_S3_BUCKET?.trim();
  const prefixEnv = process.env.PARKS_S3_PREFIX;

  if (!region) {
    throw new Error('Missing AWS region. Set AWS_REGION or AWS_DEFAULT_REGION.');
  }

  if (!bucket) {
    throw new Error('Missing PARKS_S3_BUCKET. Set the destination bucket name.');
  }

  return {
    region,
    bucket,
    prefix: prefixEnv == null ? 'parks-knowledge' : trimSlashes(prefixEnv.trim()),
  };
}

export function buildS3Key(prefix: string, relativePath: string): string {
  const normalizedPath = relativePath.split('\\').join('/');
  return prefix ? `${prefix}/${normalizedPath}` : normalizedPath;
}
