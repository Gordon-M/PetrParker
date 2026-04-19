import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { buildS3Key, getS3PublishConfig } from '../shared/aws.ts';
import { ensureDir, writeJsonFile } from '../shared/fs.ts';
import { manifestsRoot, ingestionRoot } from '../shared/paths.ts';
import type { PublishedOfflineBundleManifest, OfflineBundleManifest } from '../../../types/parks.ts';

const LOCAL_BUNDLE_ROOT = path.join(ingestionRoot, 'exports', 'sqlite');
const LOCAL_BUNDLE_PATH = path.join(LOCAL_BUNDLE_ROOT, 'latest.sqlite');
const LOCAL_MANIFEST_PATH = path.join(LOCAL_BUNDLE_ROOT, 'latest-manifest.json');

function trimSlashes(value: string): string {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

function getDeliveryPrefix(rootPrefix: string): string {
  const explicitPrefix = process.env.PARKS_DELIVERY_PREFIX?.trim();

  if (explicitPrefix) {
    return trimSlashes(explicitPrefix);
  }

  return rootPrefix ? `${rootPrefix}/delivery/mobile-bundle` : 'delivery/mobile-bundle';
}

function joinPublicUrl(baseUrl: string, key: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${key}`;
}

function getPublicBaseUrl(): string | undefined {
  const value = process.env.PARKS_S3_PUBLIC_BASE_URL?.trim();
  return value || undefined;
}

async function uploadObject(
  client: S3Client,
  bucket: string,
  key: string,
  body: Uint8Array | string,
  contentType: string,
  cacheControl: string,
  metadata: Record<string, string>,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
      Metadata: metadata,
    }),
  );
}

async function main(): Promise<void> {
  const isDryRun = process.argv.includes('--dry-run');
  const publishedAt = new Date().toISOString();
  const { region, bucket, prefix } = getS3PublishConfig();
  const deliveryPrefix = getDeliveryPrefix(prefix);
  const publicBaseUrl = getPublicBaseUrl();

  const bundleManifest = JSON.parse(
    await readFile(LOCAL_MANIFEST_PATH, 'utf8'),
  ) as OfflineBundleManifest;
  const bundleBody = await readFile(LOCAL_BUNDLE_PATH);

  const versionedBundleKey = buildS3Key(
    deliveryPrefix,
    `versions/${bundleManifest.version}/parks.sqlite`,
  );
  const latestBundleKey = buildS3Key(deliveryPrefix, 'latest/parks.sqlite');
  const versionedManifestKey = buildS3Key(
    deliveryPrefix,
    `versions/${bundleManifest.version}/manifest.json`,
  );
  const latestManifestKey = buildS3Key(deliveryPrefix, 'latest/manifest.json');

  const publishedManifest: PublishedOfflineBundleManifest = {
    ...bundleManifest,
    publishedAt,
    bucket,
    region,
    prefix: deliveryPrefix,
    distribution: {
      latestManifestKey,
      versionedManifestKey,
      latestBundleKey,
      versionedBundleKey,
      latestManifestUrl: publicBaseUrl
        ? joinPublicUrl(publicBaseUrl, latestManifestKey)
        : undefined,
      versionedManifestUrl: publicBaseUrl
        ? joinPublicUrl(publicBaseUrl, versionedManifestKey)
        : undefined,
      latestBundleUrl: publicBaseUrl
        ? joinPublicUrl(publicBaseUrl, latestBundleKey)
        : undefined,
      versionedBundleUrl: publicBaseUrl
        ? joinPublicUrl(publicBaseUrl, versionedBundleKey)
        : undefined,
    },
  };

  const publishedManifestJson = `${JSON.stringify(publishedManifest, null, 2)}\n`;

  await ensureDir(manifestsRoot);
  const localPublicationRecordPath = path.join(manifestsRoot, 'publish-offline-bundle.json');
  const localPublishedManifestPath = path.join(
    manifestsRoot,
    'publish-offline-bundle-manifest.json',
  );
  await writeJsonFile(localPublicationRecordPath, {
    publishedAt,
    dryRun: isDryRun,
    bucket,
    region,
    prefix: deliveryPrefix,
    latestManifestKey,
    versionedManifestKey,
    latestBundleKey,
    versionedBundleKey,
    version: bundleManifest.version,
  });
  await writeJsonFile(localPublishedManifestPath, publishedManifest);

  if (isDryRun) {
    console.log(
      `Prepared offline bundle publication for s3://${bucket}/${deliveryPrefix} (dry run, version ${bundleManifest.version})`,
    );
    console.log(
      JSON.stringify(
        {
          latestManifestKey,
          versionedManifestKey,
          latestBundleKey,
          versionedBundleKey,
        },
        null,
        2,
      ),
    );
    return;
  }

  const client = new S3Client({ region });
  await client.send(new HeadBucketCommand({ Bucket: bucket }));

  await uploadObject(
    client,
    bucket,
    versionedBundleKey,
    bundleBody,
    bundleManifest.sqlite.contentType,
    'max-age=31536000, immutable',
    {
      version: bundleManifest.version,
      sha256: bundleManifest.sqlite.sha256,
      park_count: String(bundleManifest.parkCount),
    },
  );
  await uploadObject(
    client,
    bucket,
    latestBundleKey,
    bundleBody,
    bundleManifest.sqlite.contentType,
    'no-store',
    {
      version: bundleManifest.version,
      sha256: bundleManifest.sqlite.sha256,
      park_count: String(bundleManifest.parkCount),
    },
  );
  await uploadObject(
    client,
    bucket,
    versionedManifestKey,
    publishedManifestJson,
    'application/json',
    'max-age=60',
    {
      version: bundleManifest.version,
      kind: 'offline_bundle_manifest',
    },
  );
  await uploadObject(
    client,
    bucket,
    latestManifestKey,
    publishedManifestJson,
    'application/json',
    'no-store',
    {
      version: bundleManifest.version,
      kind: 'offline_bundle_manifest',
    },
  );

  console.log(
    `Published offline bundle ${bundleManifest.version} to s3://${bucket}/${deliveryPrefix}`,
  );
}

await main();
