import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { buildS3Key, getS3PublishConfig } from '../shared/aws.ts';
import { ensureDir, listFilesRecursive, writeJsonFile } from '../shared/fs.ts';
import { sha256Hex } from '../shared/hashing.ts';
import {
  exportsRoot,
  ingestionRoot,
  manifestsRoot,
  normalizedRoot,
  rawRoot,
  timestampSlug,
} from '../shared/paths.ts';
import type { ArtifactRecord, SourceRunManifest } from '../shared/source-manifest.ts';

interface UploadedObject {
  artifact: ArtifactRecord;
  key: string;
}

function inferContentType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.json':
      return 'application/json';
    case '.geojson':
      return 'application/geo+json';
    case '.html':
      return 'text/html; charset=utf-8';
    case '.sql':
      return 'text/plain; charset=utf-8';
    case '.sqlite':
      return 'application/vnd.sqlite3';
    case '.txt':
      return 'text/plain; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function inferCacheControl(relativePath: string): string {
  const normalizedPath = relativePath.split(path.sep).join('/');
  const fileName = path.basename(normalizedPath);

  if (normalizedPath.startsWith('manifests/') || fileName.startsWith('latest')) {
    return 'no-store';
  }

  return 'max-age=31536000, immutable';
}

async function uploadFile(
  client: S3Client,
  bucket: string,
  prefix: string,
  filePath: string,
  uploadedAt: string,
): Promise<UploadedObject> {
  const body = await readFile(filePath);
  const relativePath = path.relative(ingestionRoot, filePath);
  const key = buildS3Key(prefix, relativePath);
  const contentType = inferContentType(filePath);
  const sha256 = sha256Hex(body);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: inferCacheControl(relativePath),
      Metadata: {
        sha256,
        relative_path: relativePath.split(path.sep).join('/'),
        uploaded_at: uploadedAt,
      },
    }),
  );

  return {
    key,
    artifact: {
      label: relativePath.split(path.sep).join('/'),
      path: filePath,
      bytes: body.byteLength,
      sha256,
      contentType,
      sourceUrl: `s3://${bucket}/${key}`,
    },
  };
}

async function main(): Promise<void> {
  const uploadedAt = new Date().toISOString();
  const runId = timestampSlug(uploadedAt);
  const { region, bucket, prefix } = getS3PublishConfig();
  const syncRoots = [rawRoot, normalizedRoot, manifestsRoot, exportsRoot];
  const client = new S3Client({ region });

  await client.send(new HeadBucketCommand({ Bucket: bucket }));

  const files = (
    await Promise.all(syncRoots.map(async (rootPath) => listFilesRecursive(rootPath)))
  ).flat();

  if (files.length === 0) {
    throw new Error(
      `No ingestion files found under ${path.relative(process.cwd(), ingestionRoot)} to upload.`,
    );
  }

  const uploadedObjects: UploadedObject[] = [];

  for (const filePath of files) {
    uploadedObjects.push(await uploadFile(client, bucket, prefix, filePath, uploadedAt));
  }

  const manifest: SourceRunManifest = {
    jobName: 'sync-ingestion-to-s3',
    fetchedAt: uploadedAt,
    sourceUrl: `s3://${bucket}/${prefix || ''}`,
    artifactCount: uploadedObjects.length,
    artifacts: uploadedObjects.map((item) => item.artifact),
    metadata: {
      runId,
      bucket,
      prefix,
      region,
      uploadedFileCount: uploadedObjects.length,
      uploadedBytes: uploadedObjects.reduce((sum, item) => sum + item.artifact.bytes, 0),
      syncedRoots: syncRoots.map((rootPath) => path.relative(ingestionRoot, rootPath)),
    },
  };

  await ensureDir(manifestsRoot);

  const manifestPath = path.join(manifestsRoot, 'sync-ingestion-to-s3.json');
  await writeJsonFile(manifestPath, manifest);

  const uploadedManifest = await uploadFile(client, bucket, prefix, manifestPath, uploadedAt);

  console.log(
    `Uploaded ${uploadedObjects.length + 1} files to s3://${bucket}/${prefix || ''} (${uploadedManifest.key})`,
  );
}

await main();
