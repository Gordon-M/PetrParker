import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ensureDir, writeJsonFile } from '../shared/fs.ts';
import { manifestsRoot, normalizedRoot, timestampSlug } from '../shared/paths.ts';

type Severity = 'error' | 'warning';

interface ValidationIssue {
  severity: Severity;
  code: string;
  message: string;
  parkId?: string;
  slug?: string;
  details?: Record<string, unknown>;
}

interface ParkListingRecord {
  parkId: string;
  pageId: string;
  name: string;
  slug: string;
  url: string;
}

interface ParkListingSnapshot {
  fetchedAt: string;
  sourceUrl: string;
  parkCount: number;
  parks: ParkListingRecord[];
}

interface ParkPageFragmentsIndex {
  parsedAt: string;
  sourceParkPagesFetchedAt: string;
  expectedParkCount: number;
  parsedCount: number;
  missingPageCount: number;
  parks: Array<{
    parkId: string;
    name: string;
    slug: string;
  }>;
  upstreamFailures: Array<{
    parkId: string;
    pageId: string;
    name: string;
    url: string;
    attempts: number;
    error: string;
    httpStatus?: number;
  }>;
}

interface CanonicalIndexSummary {
  parkId: string;
  name: string;
  slug: string;
  county?: string;
  unitType: string;
  status: string;
  facilityCount: number;
  routeCount: number;
  alertCount: number;
  documentCount: number;
  dogsAllowed?: boolean;
}

interface CanonicalIndex {
  builtAt: string;
  sourceListingFetchedAt: string;
  sourceParkPagesParsedAt: string;
  recordCount: number;
  parks: CanonicalIndexSummary[];
  upstreamFailures: Array<{
    parkId: string;
    pageId: string;
    name: string;
    url: string;
    attempts: number;
    error: string;
    httpStatus?: number;
  }>;
}

interface BoundingBox {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
}

interface SourceReference {
  sourceId: string;
  sourceType: string;
  title: string;
  url: string;
  fetchedAt: string;
  lastVerifiedAt?: string;
  parserVersion: string;
  freshnessTier: string;
}

interface CanonicalParkRecord {
  parkId: string;
  slug: string;
  name: string;
  unitType: string;
  status: string;
  county?: string;
  centroid?: {
    latitude: number;
    longitude: number;
  };
  boundingBox?: BoundingBox;
  hours?: {
    summary: string;
    source: SourceReference;
  };
  geometry: Array<{
    kind: string;
    format: string;
    assetKey: string;
    featureCount: number;
    boundingBox?: BoundingBox;
    simplified: boolean;
  }>;
  facilities: unknown[];
  routes: unknown[];
  alerts: unknown[];
  documents: unknown[];
  sources: SourceReference[];
  sourceUpdatedAt: string;
}

interface ValidationReport {
  validatedAt: string;
  version: string;
  status: 'passed' | 'failed';
  summary: {
    expectedParkCount: number;
    parsedParkCount: number;
    canonicalParkCount: number;
    upstreamFailureCount: number;
    errorCount: number;
    warningCount: number;
    missingCentroidCount: number;
    invalidBoundingBoxCount: number;
    unknownUnitTypeCount: number;
    hoursCoverageCount: number;
    geometryCoverageCount: number;
  };
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const PARK_LISTING_PATH = path.join(normalizedRoot, 'park-listing', 'latest.json');
const PARK_PAGE_FRAGMENTS_INDEX_PATH = path.join(
  normalizedRoot,
  'park-page-fragments',
  'latest-index.json',
);
const CANONICAL_INDEX_PATH = path.join(normalizedRoot, 'canonical-parks', 'latest-index.json');

async function readJsonFile<T>(filePath: string): Promise<T> {
  const contents = await readFile(filePath, 'utf8');
  return JSON.parse(contents) as T;
}

function isValidLatitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
}

function isValidBoundingBox(value?: BoundingBox): boolean {
  if (!value) {
    return false;
  }

  return (
    isValidLatitude(value.minLatitude) &&
    isValidLatitude(value.maxLatitude) &&
    isValidLongitude(value.minLongitude) &&
    isValidLongitude(value.maxLongitude) &&
    value.minLatitude <= value.maxLatitude &&
    value.minLongitude <= value.maxLongitude
  );
}

function createIssue(issue: ValidationIssue): ValidationIssue {
  return issue;
}

function collectDuplicates(values: string[]): string[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort((left, right) => left.localeCompare(right));
}

function parseDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

async function main(): Promise<void> {
  const validatedAt = new Date().toISOString();
  const runId = timestampSlug(validatedAt);
  const listing = await readJsonFile<ParkListingSnapshot>(PARK_LISTING_PATH);
  const fragmentsIndex = await readJsonFile<ParkPageFragmentsIndex>(PARK_PAGE_FRAGMENTS_INDEX_PATH);
  const canonicalIndex = await readJsonFile<CanonicalIndex>(CANONICAL_INDEX_PATH);

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const upstreamFailureParkIds = new Set(
    canonicalIndex.upstreamFailures.map((failure) => failure.parkId),
  );

  if (listing.parkCount !== canonicalIndex.recordCount) {
    errors.push(
      createIssue({
        severity: 'error',
        code: 'park_count_mismatch',
        message: 'Canonical park count does not match the authoritative listing count.',
        details: {
          listingParkCount: listing.parkCount,
          canonicalParkCount: canonicalIndex.recordCount,
        },
      }),
    );
  }

  if (fragmentsIndex.expectedParkCount !== listing.parkCount) {
    errors.push(
      createIssue({
        severity: 'error',
        code: 'fragment_expected_count_mismatch',
        message: 'Parsed park-page index expected count does not match the authoritative listing.',
        details: {
          listingParkCount: listing.parkCount,
          expectedParkCount: fragmentsIndex.expectedParkCount,
        },
      }),
    );
  }

  if (fragmentsIndex.parsedCount + fragmentsIndex.missingPageCount !== listing.parkCount) {
    errors.push(
      createIssue({
        severity: 'error',
        code: 'fragment_accounting_mismatch',
        message: 'Parsed and missing park-page counts do not add up to the full listing size.',
        details: {
          parsedCount: fragmentsIndex.parsedCount,
          missingPageCount: fragmentsIndex.missingPageCount,
          listingParkCount: listing.parkCount,
        },
      }),
    );
  }

  const duplicateParkIds = collectDuplicates(canonicalIndex.parks.map((park) => park.parkId));
  const duplicateSlugs = collectDuplicates(canonicalIndex.parks.map((park) => park.slug));

  if (duplicateParkIds.length > 0) {
    errors.push(
      createIssue({
        severity: 'error',
        code: 'duplicate_park_ids',
        message: 'Canonical catalog contains duplicate park IDs.',
        details: {
          duplicateParkIds,
        },
      }),
    );
  }

  if (duplicateSlugs.length > 0) {
    errors.push(
      createIssue({
        severity: 'error',
        code: 'duplicate_slugs',
        message: 'Canonical catalog contains duplicate slugs.',
        details: {
          duplicateSlugs,
        },
      }),
    );
  }

  let missingCentroidCount = 0;
  let invalidBoundingBoxCount = 0;
  let unknownUnitTypeCount = 0;
  let hoursCoverageCount = 0;
  let geometryCoverageCount = 0;

  for (const park of canonicalIndex.parks) {
    const recordPath = path.join(normalizedRoot, 'canonical-parks', park.slug, 'latest.json');
    const record = await readJsonFile<CanonicalParkRecord>(recordPath);

    if (!record.parkId || !record.name || !record.slug) {
      errors.push(
        createIssue({
          severity: 'error',
          code: 'missing_required_identity_fields',
          message: 'Canonical park record is missing one of parkId, name, or slug.',
          parkId: record.parkId,
          slug: record.slug,
        }),
      );
    }

    if (!Array.isArray(record.sources) || record.sources.length === 0) {
      errors.push(
        createIssue({
          severity: 'error',
          code: 'missing_sources',
          message: 'Canonical park record is missing source references.',
          parkId: record.parkId,
          slug: record.slug,
        }),
      );
    }

    if (record.hours?.summary) {
      hoursCoverageCount += 1;

      const freshnessDate =
        parseDate(record.hours.source.lastVerifiedAt) ?? parseDate(record.hours.source.fetchedAt);
      const ageDays = freshnessDate
        ? (Date.parse(validatedAt) - freshnessDate.getTime()) / (1000 * 60 * 60 * 24)
        : undefined;

      if (ageDays == null) {
        warnings.push(
          createIssue({
            severity: 'warning',
            code: 'operational_freshness_unparseable',
            message: 'Hours metadata contains an unparseable freshness timestamp.',
            parkId: record.parkId,
            slug: record.slug,
            details: {
              lastVerifiedAt: record.hours.source.lastVerifiedAt,
              fetchedAt: record.hours.source.fetchedAt,
            },
          }),
        );
      } else if (ageDays > 14) {
        errors.push(
          createIssue({
            severity: 'error',
            code: 'operational_freshness_stale',
            message: 'Operational hours data is older than the allowed freshness window.',
            parkId: record.parkId,
            slug: record.slug,
            details: {
              ageDays,
              lastVerifiedAt: record.hours.source.lastVerifiedAt,
              fetchedAt: record.hours.source.fetchedAt,
            },
          }),
        );
      }
    }

    const hasValidCentroid =
      isValidLatitude(record.centroid?.latitude) &&
      isValidLongitude(record.centroid?.longitude);

    if (!hasValidCentroid) {
      missingCentroidCount += 1;

      const severity: Severity =
        record.status === 'unknown' || upstreamFailureParkIds.has(record.parkId)
          ? 'warning'
          : 'error';
      const collection = severity === 'error' ? errors : warnings;

      collection.push(
        createIssue({
          severity,
          code: 'missing_centroid',
          message: 'Canonical park record is missing a valid centroid.',
          parkId: record.parkId,
          slug: record.slug,
          details: {
            status: record.status,
            county: record.county,
            hasGeometry: record.geometry.length > 0,
          },
        }),
      );
    }

    const hasGeometry = Array.isArray(record.geometry) && record.geometry.length > 0;

    if (hasGeometry) {
      geometryCoverageCount += 1;
    }

    if (record.boundingBox) {
      if (!isValidBoundingBox(record.boundingBox)) {
        invalidBoundingBoxCount += 1;
        errors.push(
          createIssue({
            severity: 'error',
            code: 'invalid_bounding_box',
            message: 'Canonical park record has an invalid bounding box.',
            parkId: record.parkId,
            slug: record.slug,
            details: {
              boundingBox: record.boundingBox,
            },
          }),
        );
      }
    } else if (hasGeometry) {
      invalidBoundingBoxCount += 1;
      errors.push(
        createIssue({
          severity: 'error',
          code: 'missing_bounding_box',
          message: 'Canonical park record has geometry but no top-level bounding box.',
          parkId: record.parkId,
          slug: record.slug,
        }),
      );
    }

    if (record.unitType === 'Unknown') {
      unknownUnitTypeCount += 1;
      warnings.push(
        createIssue({
          severity: 'warning',
          code: 'unknown_unit_type',
          message: 'Canonical park record could not derive a known unit type from the park name.',
          parkId: record.parkId,
          slug: record.slug,
          details: {
            name: record.name,
          },
        }),
      );
    }

    const sourceTypes = new Set(record.sources.map((source) => source.sourceType));
    for (const expectedType of ['park_listing', 'park_detail_page']) {
      if (!sourceTypes.has(expectedType)) {
        errors.push(
          createIssue({
            severity: 'error',
            code: 'missing_expected_source_type',
            message: 'Canonical park record is missing an expected source type.',
            parkId: record.parkId,
            slug: record.slug,
            details: {
              expectedType,
            },
          }),
        );
      }
    }
  }

  for (const failure of canonicalIndex.upstreamFailures) {
    warnings.push(
      createIssue({
        severity: 'warning',
        code: 'upstream_fetch_failure',
        message: 'A park page failed to fetch upstream and the canonical record may be partial.',
        parkId: failure.parkId,
        details: {
          pageId: failure.pageId,
          name: failure.name,
          url: failure.url,
          error: failure.error,
          httpStatus: failure.httpStatus,
        },
      }),
    );
  }

  const report: ValidationReport = {
    validatedAt,
    version: runId,
    status: errors.length === 0 ? 'passed' : 'failed',
    summary: {
      expectedParkCount: listing.parkCount,
      parsedParkCount: fragmentsIndex.parsedCount,
      canonicalParkCount: canonicalIndex.recordCount,
      upstreamFailureCount: canonicalIndex.upstreamFailures.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      missingCentroidCount,
      invalidBoundingBoxCount,
      unknownUnitTypeCount,
      hoursCoverageCount,
      geometryCoverageCount,
    },
    errors,
    warnings,
  };

  await ensureDir(manifestsRoot);

  const versionedReportPath = path.join(manifestsRoot, `validate-catalog-${runId}.json`);
  const latestReportPath = path.join(manifestsRoot, 'validate-catalog.json');

  await writeJsonFile(versionedReportPath, report);
  await writeJsonFile(latestReportPath, report);

  console.log(
    `Validated catalog: ${report.status} (${report.summary.errorCount} errors, ${report.summary.warningCount} warnings)`,
  );

  if (errors.length > 0) {
    throw new Error(
      `Catalog validation failed with ${errors.length} errors. See ${path.relative(process.cwd(), latestReportPath)}.`,
    );
  }
}

await main();
