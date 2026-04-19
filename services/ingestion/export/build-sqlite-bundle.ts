import { readFile, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { ensureDir, writeTextFile } from '../shared/fs.ts';
import { sha256Hex } from '../shared/hashing.ts';
import { manifestsRoot, normalizedRoot, ingestionRoot, timestampSlug } from '../shared/paths.ts';
import type { ArtifactRecord, SourceRunManifest } from '../shared/source-manifest.ts';
import type {
  CanonicalParkRecord,
  OfflineBundleManifest,
  SourceReference,
} from '../../../types/parks.ts';

const CANONICAL_INDEX_PATH = path.join(normalizedRoot, 'canonical-parks', 'latest-index.json');
const SQLITE_SCHEMA_PATH = path.join(process.cwd(), 'docs', 'sqlite-schema.sql');

interface CanonicalIndex {
  builtAt: string;
  sourceListingFetchedAt: string;
  sourceParkPagesParsedAt: string;
  recordCount: number;
  parks: Array<{
    parkId: string;
    name: string;
    slug: string;
  }>;
  upstreamFailures: Array<Record<string, unknown>>;
}

function sqlString(value?: string | null): string {
  if (value == null) {
    return 'NULL';
  }

  return `'${value.replaceAll("'", "''")}'`;
}

function sqlNumber(value?: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'NULL';
  }

  return String(value);
}

function sqlBoolean(value?: boolean | null): string {
  if (typeof value !== 'boolean') {
    return 'NULL';
  }

  return value ? '1' : '0';
}

function toPrettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const contents = await readFile(filePath, 'utf8');
  return JSON.parse(contents) as T;
}

function buildSourceReferenceSql(source: SourceReference): string[] {
  return [
    `INSERT OR REPLACE INTO source_reference (source_id, source_type, title, url, fetched_at, last_verified_at, checksum, parser_version, freshness_tier) VALUES (${sqlString(source.sourceId)}, ${sqlString(source.sourceType)}, ${sqlString(source.title)}, ${sqlString(source.url)}, ${sqlString(source.fetchedAt)}, ${sqlString(source.lastVerifiedAt)}, ${sqlString(source.checksum)}, ${sqlString(source.parserVersion)}, ${sqlString(source.freshnessTier)});`,
  ];
}

function buildParkSql(record: CanonicalParkRecord, builtAt: string): string[] {
  const statements: string[] = [];

  statements.push(
    `INSERT OR REPLACE INTO park (park_id, slug, name, unit_type, status, district, county, description, short_summary, hero_image_url, latitude, longitude, bbox_min_lat, bbox_min_lng, bbox_max_lat, bbox_max_lng, dogs_allowed, dog_policy, reservation_summary, hours_summary, hours_details, hours_last_verified_at, source_updated_at, generated_summary_updated_at, created_at, updated_at) VALUES (${sqlString(record.parkId)}, ${sqlString(record.slug)}, ${sqlString(record.name)}, ${sqlString(record.unitType)}, ${sqlString(record.status)}, ${sqlString(record.district)}, ${sqlString(record.county)}, ${sqlString(record.description)}, ${sqlString(record.shortSummary)}, ${sqlString(record.heroImageUrl)}, ${sqlNumber(record.centroid?.latitude)}, ${sqlNumber(record.centroid?.longitude)}, ${sqlNumber(record.boundingBox?.minLatitude)}, ${sqlNumber(record.boundingBox?.minLongitude)}, ${sqlNumber(record.boundingBox?.maxLatitude)}, ${sqlNumber(record.boundingBox?.maxLongitude)}, ${sqlBoolean(record.dogsAllowed)}, ${sqlString(record.dogPolicy)}, ${sqlString(record.reservationSummary)}, ${sqlString(record.hours?.summary)}, ${sqlString(record.hours?.details)}, ${sqlString(record.hours?.source.lastVerifiedAt)}, ${sqlString(record.sourceUpdatedAt)}, ${sqlString(record.generatedSummaryUpdatedAt)}, ${sqlString(builtAt)}, ${sqlString(builtAt)});`,
  );

  statements.push(
    `INSERT OR REPLACE INTO park_contact (park_id, phone, email, website_url, reservation_url) VALUES (${sqlString(record.parkId)}, ${sqlString(record.contacts.phone)}, ${sqlString(record.contacts.email)}, ${sqlString(record.contacts.websiteUrl)}, ${sqlString(record.contacts.reservationUrl)});`,
  );

  for (const activity of record.activities) {
    statements.push(
      `INSERT OR REPLACE INTO park_activity (park_id, activity) VALUES (${sqlString(record.parkId)}, ${sqlString(activity)});`,
    );
  }

  for (const amenity of record.amenities) {
    statements.push(
      `INSERT OR REPLACE INTO park_amenity (park_id, amenity) VALUES (${sqlString(record.parkId)}, ${sqlString(amenity)});`,
    );
  }

  for (const fee of record.fees) {
    statements.push(
      `INSERT OR REPLACE INTO park_fee (fee_id, park_id, label, amount, currency, notes, source_url, last_verified_at) VALUES (${sqlString(fee.feeId)}, ${sqlString(record.parkId)}, ${sqlString(fee.label)}, ${sqlString(fee.amount)}, ${sqlString(fee.currency)}, ${sqlString(fee.notes)}, ${sqlString(fee.source.url)}, ${sqlString(fee.source.lastVerifiedAt)});`,
    );
  }

  for (const facility of record.facilities) {
    statements.push(
      `INSERT OR REPLACE INTO park_facility (facility_id, park_id, name, category, description, latitude, longitude, source_url, last_verified_at) VALUES (${sqlString(facility.facilityId)}, ${sqlString(record.parkId)}, ${sqlString(facility.name)}, ${sqlString(facility.category)}, ${sqlString(facility.description)}, ${sqlNumber(facility.location?.latitude)}, ${sqlNumber(facility.location?.longitude)}, ${sqlString(facility.source.url)}, ${sqlString(facility.source.lastVerifiedAt)});`,
    );
  }

  for (const route of record.routes) {
    statements.push(
      `INSERT OR REPLACE INTO park_route (route_id, park_id, name, route_type, distance_miles, elevation_gain_feet, difficulty, source_url, last_verified_at) VALUES (${sqlString(route.routeId)}, ${sqlString(record.parkId)}, ${sqlString(route.name)}, ${sqlString(route.routeType)}, ${sqlNumber(route.distanceMiles)}, ${sqlNumber(route.elevationGainFeet)}, ${sqlString(route.difficulty)}, ${sqlString(route.source.url)}, ${sqlString(route.source.lastVerifiedAt)});`,
    );
  }

  for (const alert of record.alerts) {
    statements.push(
      `INSERT OR REPLACE INTO park_alert (alert_id, park_id, title, message, severity, effective_at, expires_at, source_url, last_verified_at) VALUES (${sqlString(alert.alertId)}, ${sqlString(record.parkId)}, ${sqlString(alert.title)}, ${sqlString(alert.message)}, ${sqlString(alert.severity)}, ${sqlString(alert.effectiveAt)}, ${sqlString(alert.expiresAt)}, ${sqlString(alert.source.url)}, ${sqlString(alert.source.lastVerifiedAt)});`,
    );
  }

  for (const document of record.documents) {
    statements.push(
      `INSERT OR REPLACE INTO park_document (document_id, park_id, title, document_type, url, mime_type, source_url, last_verified_at) VALUES (${sqlString(document.documentId)}, ${sqlString(record.parkId)}, ${sqlString(document.title)}, ${sqlString(document.documentType)}, ${sqlString(document.url)}, ${sqlString(document.mimeType)}, ${sqlString(document.source.url)}, ${sqlString(document.source.lastVerifiedAt)});`,
    );
  }

  for (const safetyTip of record.safetyTips) {
    statements.push(
      `INSERT OR REPLACE INTO safety_tip (tip_id, park_id, title, body, tags_json, source_url, last_verified_at) VALUES (${sqlString(safetyTip.tipId)}, ${sqlString(record.parkId)}, ${sqlString(safetyTip.title)}, ${sqlString(safetyTip.body)}, ${sqlString(JSON.stringify(safetyTip.tags))}, ${sqlString(safetyTip.source.url)}, ${sqlString(safetyTip.source.lastVerifiedAt)});`,
    );
  }

  for (const source of record.sources) {
    statements.push(...buildSourceReferenceSql(source));
    statements.push(
      `INSERT OR REPLACE INTO park_source (park_id, source_id) VALUES (${sqlString(record.parkId)}, ${sqlString(source.sourceId)});`,
    );
  }

  return statements;
}

async function main(): Promise<void> {
  const exportedAt = new Date().toISOString();
  const runId = timestampSlug(exportedAt);
  const canonicalIndex = await readJsonFile<CanonicalIndex>(CANONICAL_INDEX_PATH);
  const schemaSql = await readFile(SQLITE_SCHEMA_PATH, 'utf8');

  const records: CanonicalParkRecord[] = [];

  for (const park of canonicalIndex.parks) {
    const recordPath = path.join(normalizedRoot, 'canonical-parks', park.slug, 'latest.json');
    records.push(await readJsonFile<CanonicalParkRecord>(recordPath));
  }

  const exportRoot = path.join(ingestionRoot, 'exports', 'sqlite');
  await ensureDir(exportRoot);

  const dbPath = path.join(exportRoot, `${runId}.sqlite`);
  const latestDbPath = path.join(exportRoot, 'latest.sqlite');
  const sqlPath = path.join(exportRoot, `${runId}.sql`);
  const versionedManifestPath = path.join(exportRoot, `${runId}-manifest.json`);
  const latestManifestPath = path.join(exportRoot, 'latest-manifest.json');

  await rm(dbPath, { force: true });

  const statements: string[] = [schemaSql.trim(), 'BEGIN TRANSACTION;'];
  statements.push(
    `INSERT OR REPLACE INTO bundle_manifest (version, generated_at, park_count, source_snapshot_at, min_supported_app_version) VALUES (${sqlString(runId)}, ${sqlString(exportedAt)}, ${canonicalIndex.recordCount}, ${sqlString(canonicalIndex.builtAt)}, NULL);`,
  );

  for (const record of records) {
    statements.push(...buildParkSql(record, exportedAt));
  }

  statements.push('COMMIT;');

  const sqlText = `${statements.join('\n')}\n`;
  await writeTextFile(sqlPath, sqlText);

  const sqliteResult = spawnSync('sqlite3', [dbPath], {
    input: sqlText,
    encoding: 'utf8',
  });

  if (sqliteResult.status !== 0) {
    throw new Error(
      `sqlite3 failed with status ${sqliteResult.status}: ${sqliteResult.stderr || sqliteResult.stdout}`,
    );
  }

  await copyFile(dbPath, latestDbPath);

  const dbBytes = (await readFile(dbPath)).byteLength;
  const dbSha256 = sha256Hex(await readFile(dbPath));
  const bundleManifest: OfflineBundleManifest = {
    version: runId,
    generatedAt: exportedAt,
    parkCount: canonicalIndex.recordCount,
    sourceSnapshotAt: canonicalIndex.builtAt,
    minSupportedAppVersion: undefined,
    upstreamFailures: canonicalIndex.upstreamFailures,
    sqlite: {
      fileName: path.basename(dbPath),
      bytes: dbBytes,
      sha256: dbSha256,
      contentType: 'application/vnd.sqlite3',
      relativePath: path.relative(process.cwd(), dbPath),
    },
  };
  const bundleManifestJson = toPrettyJson(bundleManifest);
  await writeTextFile(versionedManifestPath, bundleManifestJson);
  await writeTextFile(latestManifestPath, bundleManifestJson);

  const artifacts: ArtifactRecord[] = [
    {
      label: 'sqlite_bundle',
      path: dbPath,
      bytes: dbBytes,
      sha256: dbSha256,
      contentType: 'application/vnd.sqlite3',
      sourceUrl: CANONICAL_INDEX_PATH,
    },
    {
      label: 'sqlite_bundle_sql',
      path: sqlPath,
      bytes: Buffer.byteLength(sqlText),
      sha256: sha256Hex(sqlText),
      contentType: 'text/plain',
      sourceUrl: CANONICAL_INDEX_PATH,
    },
    {
      label: 'sqlite_bundle_manifest',
      path: versionedManifestPath,
      bytes: Buffer.byteLength(bundleManifestJson),
      sha256: sha256Hex(bundleManifestJson),
      contentType: 'application/json',
      sourceUrl: CANONICAL_INDEX_PATH,
    },
  ];

  const manifest: SourceRunManifest = {
    jobName: 'build-sqlite-bundle',
    fetchedAt: exportedAt,
    sourceUrl: CANONICAL_INDEX_PATH,
    artifactCount: artifacts.length,
    artifacts,
    metadata: {
      version: runId,
      parkCount: canonicalIndex.recordCount,
      sourceSnapshotAt: canonicalIndex.builtAt,
    },
  };

  const manifestPath = path.join(manifestsRoot, 'build-sqlite-bundle.json');
  await writeTextFile(manifestPath, toPrettyJson(manifest));

  console.log(
    `Exported SQLite bundle with ${canonicalIndex.recordCount} parks to ${path.relative(process.cwd(), dbPath)}`,
  );
}

await main();
