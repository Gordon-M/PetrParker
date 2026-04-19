import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ensureDir, writeTextFile } from '../shared/fs.ts';
import { sha256Hex } from '../shared/hashing.ts';
import { normalizedRoot, rawRoot, manifestsRoot, timestampSlug } from '../shared/paths.ts';
import type { SourceRunManifest, ArtifactRecord } from '../shared/source-manifest.ts';
import type {
  CanonicalParkRecord,
  GeoPoint,
  ParkAlert,
  ParkDocument,
  ParkFee,
  ParkFacility,
  ParkRoute,
  SourceReference,
} from '../../../types/parks.ts';

const PARK_LISTING_PATH = path.join(normalizedRoot, 'park-listing', 'latest.json');
const PARK_PAGE_INDEX_PATH = path.join(normalizedRoot, 'park-page-fragments', 'latest-index.json');
const BOUNDARIES_PATH = path.join(rawRoot, 'open-data', 'park-boundaries', 'latest.geojson');
const ENTRY_POINTS_PATH = path.join(rawRoot, 'open-data', 'park-entry-points', 'latest.geojson');
const ROUTES_PATH = path.join(rawRoot, 'open-data', 'recreational-routes', 'latest.geojson');
const CAMPGROUNDS_PATH = path.join(rawRoot, 'open-data', 'campgrounds', 'latest.geojson');
const PARKING_POINTS_PATH = path.join(rawRoot, 'open-data', 'parking-points', 'latest.geojson');

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

interface ParsedParkPageFragment {
  parkId: string;
  pageId: string;
  name: string;
  slug: string;
  sourceUrl: string;
  parsedAt: string;
  sourceFetchedAt: string;
  pageTitle?: string;
  lastChecked?: string;
  hoursSummary?: string;
  contactPhone?: string;
  dogPolicy?: string;
  directionsSummary?: string;
  aboutText?: string;
  feeLines: string[];
  alertLines: string[];
  activityFacilityLines: string[];
  notableLinks: Array<{
    label: string;
    url: string;
    kind: string;
  }>;
  rawHtmlPath: string;
  sourceMetadataPath: string;
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
    hoursSummary?: string;
    feeLineCount: number;
    alertCount: number;
    activityFacilityCount: number;
    sourceUrl: string;
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

interface GeoJsonFeature<P = Record<string, unknown>> {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: unknown;
  } | null;
  properties: P;
}

interface GeoJsonCollection<P = Record<string, unknown>> {
  type: 'FeatureCollection';
  features: GeoJsonFeature<P>[];
}

interface BoundaryProperties {
  UNITNAME?: string;
  GISID?: string;
  SUBTYPE?: string;
  UNITNBR?: string;
}

interface EntryPointProperties {
  PARK_NAME?: string;
  County?: string;
  LAT?: number;
  LON?: number;
  PARK_WEB_PG?: string;
  UNIT_NBR?: string;
  GISID?: string;
  STREET_ADDRESS?: string;
  City?: string;
  Zip?: string | number;
}

interface RouteProperties {
  ROUTENAME?: string;
  ROUTECLASS?: string;
  ROUTETYPE?: string;
  ROUTEDES?: string;
  TRAILDES?: string;
  UNITNBR?: string;
  SEGLNGTH?: number;
  SHARE?: string;
}

interface CampgroundProperties {
  Campground?: string;
  TYPE?: string;
  SUBTYPE?: string;
  DETAIL?: string;
  UNITNBR?: string;
}

interface ParkingPointProperties {
  NAME?: string;
  TYPE?: string;
  SUBTYPE?: string;
  UNITNBR?: string;
  TRAILHEAD?: string;
}

function toPrettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const contents = await readFile(filePath, 'utf8');
  return JSON.parse(contents) as T;
}

function getPageIdFromParkWebPage(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url.trim());
    return parsed.searchParams.get('page_id') ?? undefined;
  } catch {
    return undefined;
  }
}

function normalizeUnitNumber(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const text = String(value).trim();
  return text || undefined;
}

function collectCoordinatePairs(value: unknown, output: Array<[number, number]>): void {
  if (!Array.isArray(value)) {
    return;
  }

  if (
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    output.push([value[0], value[1]]);
    return;
  }

  for (const item of value) {
    collectCoordinatePairs(item, output);
  }
}

function convertWebMercatorToWgs84(longitude: number, latitude: number): [number, number] {
  const earthRadiusMeters = 6378137;
  const normalizedLongitude = (longitude / earthRadiusMeters) * (180 / Math.PI);
  const normalizedLatitude =
    (Math.atan(Math.sinh(latitude / earthRadiusMeters)) * 180) / Math.PI;

  return [normalizedLongitude, normalizedLatitude];
}

function normalizeCoordinatePair(longitude: number, latitude: number): [number, number] {
  const isWgs84 =
    Math.abs(longitude) <= 180 &&
    Math.abs(latitude) <= 90;

  if (isWgs84) {
    return [longitude, latitude];
  }

  const likelyWebMercator =
    Math.abs(longitude) <= 20037508.3427892 &&
    Math.abs(latitude) <= 20037508.3427892;

  if (likelyWebMercator) {
    return convertWebMercatorToWgs84(longitude, latitude);
  }

  return [longitude, latitude];
}

function computeBoundingBox(
  features: Array<GeoJsonFeature<Record<string, unknown>>>,
): CanonicalParkRecord['boundingBox'] | undefined {
  const pairs: Array<[number, number]> = [];

  for (const feature of features) {
    if (!feature.geometry) {
      continue;
    }

    collectCoordinatePairs(feature.geometry.coordinates, pairs);
  }

  if (pairs.length === 0) {
    return undefined;
  }

  let minLongitude = Number.POSITIVE_INFINITY;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;

  for (const [longitude, latitude] of pairs) {
    const [normalizedLongitude, normalizedLatitude] = normalizeCoordinatePair(
      longitude,
      latitude,
    );

    minLongitude = Math.min(minLongitude, normalizedLongitude);
    minLatitude = Math.min(minLatitude, normalizedLatitude);
    maxLongitude = Math.max(maxLongitude, normalizedLongitude);
    maxLatitude = Math.max(maxLatitude, normalizedLatitude);
  }

  return {
    minLatitude,
    minLongitude,
    maxLatitude,
    maxLongitude,
  };
}

function deriveUnitType(name: string): string {
  const normalizedName = name.replace(/[®™]/g, '').trim();
  const suffixes = [
    'State Recreation Area',
    'State Historic Park',
    'State Natural Reserve',
    'State Marine Reserve',
    'State Marine Park',
    'State Marine Conservation Area',
    'State Vehicular Recreation Area',
    'State Beach',
    'State Park',
    'State Seashore',
    'Point of Interest',
    'Park Property',
    'State Capitol',
    'State Historical Monument',
    'State Wilderness',
    'Campground',
  ];

  for (const suffix of suffixes) {
    if (normalizedName.endsWith(suffix)) {
      return suffix;
    }
  }

  return 'Unknown';
}

function getUnitNumberFromMapLinks(fragment?: ParsedParkPageFragment): string | undefined {
  if (!fragment) {
    return undefined;
  }

  for (const link of fragment.notableLinks) {
    try {
      const parsed = new URL(link.url);
      const unitNumber = normalizeUnitNumber(parsed.searchParams.get('UNITNBR'));

      if (unitNumber) {
        return unitNumber;
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

function inferStatus(fragment?: ParsedParkPageFragment): CanonicalParkRecord['status'] {
  const hours = fragment?.hoursSummary?.toLowerCase() ?? '';
  const alerts = fragment?.alertLines.join(' ').toLowerCase() ?? '';

  if (hours.includes('temporarily closed') || alerts.includes('temporarily closed')) {
    return 'temporarily_closed';
  }

  if (hours.includes('closed for the season') || hours.includes('winter season')) {
    return 'seasonal';
  }

  if (hours || alerts) {
    return 'open';
  }

  return 'unknown';
}

function createSourceReference(params: {
  sourceId: string;
  sourceType: SourceReference['sourceType'];
  title: string;
  url: string;
  fetchedAt: string;
  lastVerifiedAt?: string;
  parserVersion: string;
  freshnessTier: SourceReference['freshnessTier'];
}): SourceReference {
  return {
    sourceId: params.sourceId,
    sourceType: params.sourceType,
    title: params.title,
    url: params.url,
    fetchedAt: params.fetchedAt,
    lastVerifiedAt: params.lastVerifiedAt,
    parserVersion: params.parserVersion,
    freshnessTier: params.freshnessTier,
  };
}

function parseFeeLines(
  park: ParkListingRecord,
  fragment: ParsedParkPageFragment | undefined,
  source: SourceReference,
): ParkFee[] {
  if (!fragment) {
    return [];
  }

  return fragment.feeLines.map((line, index) => {
    const amountMatch = line.match(/\$[\d,.]+/);

    return {
      feeId: `${park.parkId}-fee-${index + 1}`,
      label: amountMatch ? line.replace(amountMatch[0], '').replace(/:\s*$/, '').trim() : line,
      amount: amountMatch?.[0],
      currency: amountMatch ? 'USD' : undefined,
      notes: amountMatch ? line : undefined,
      source,
    };
  });
}

function parseAlerts(
  park: ParkListingRecord,
  fragment: ParsedParkPageFragment | undefined,
  source: SourceReference,
): ParkAlert[] {
  if (!fragment) {
    return [];
  }

  return fragment.alertLines.map((line, index) => ({
    alertId: `${park.parkId}-alert-${index + 1}`,
    title: line,
    message: line,
    severity: 'warning',
    source,
  }));
}

function parseDocuments(
  park: ParkListingRecord,
  fragment: ParsedParkPageFragment | undefined,
  source: SourceReference,
): ParkDocument[] {
  if (!fragment) {
    return [];
  }

  return fragment.notableLinks
    .filter((link) => link.kind === 'brochure' || link.kind === 'map')
    .map((link, index) => ({
      documentId: `${park.parkId}-document-${index + 1}`,
      title: link.label,
      documentType: link.kind === 'map' ? 'map' : 'brochure',
      url: link.url,
      mimeType: link.url.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined,
      source,
    }));
}

const ACTIVITY_KEYWORDS = [
  'hiking',
  'bike',
  'swimming',
  'boating',
  'guided tours',
  'windsurfing',
  'wildlife',
  'museum',
  'historical',
  'beach',
  'picnic',
  'vista',
  'exhibits',
  'nature',
  'trail',
];

function splitActivitiesAndAmenities(fragment?: ParsedParkPageFragment): {
  activities: string[];
  amenities: string[];
} {
  if (!fragment) {
    return { activities: [], amenities: [] };
  }

  const activities: string[] = [];
  const amenities: string[] = [];

  for (const line of fragment.activityFacilityLines) {
    const lowerLine = line.toLowerCase();

    if (ACTIVITY_KEYWORDS.some((keyword) => lowerLine.includes(keyword))) {
      activities.push(line);
    } else {
      amenities.push(line);
    }
  }

  return {
    activities: Array.from(new Set(activities)),
    amenities: Array.from(new Set(amenities)),
  };
}

function buildDerivedFacilities(
  park: ParkListingRecord,
  unitNumber: string | undefined,
  campgrounds: GeoJsonFeature<CampgroundProperties>[],
  parkingPoints: GeoJsonFeature<ParkingPointProperties>[],
  source: SourceReference,
): ParkFacility[] {
  if (!unitNumber) {
    return [];
  }

  const facilities: ParkFacility[] = [];

  campgrounds
    .filter((feature) => normalizeUnitNumber(feature.properties.UNITNBR) === unitNumber)
    .forEach((feature, index) => {
      facilities.push({
        facilityId: `${park.parkId}-campground-${index + 1}`,
        name: feature.properties.Campground ?? feature.properties.DETAIL ?? 'Campground',
        category: 'campground',
        description: [feature.properties.TYPE, feature.properties.SUBTYPE]
          .filter(Boolean)
          .join(' - '),
        source,
      });
    });

  parkingPoints
    .filter((feature) => normalizeUnitNumber(feature.properties.UNITNBR) === unitNumber)
    .forEach((feature, index) => {
      facilities.push({
        facilityId: `${park.parkId}-parking-${index + 1}`,
        name: feature.properties.NAME ?? 'Parking Area',
        category: 'parking',
        description: [feature.properties.TYPE, feature.properties.SUBTYPE, feature.properties.TRAILHEAD]
          .filter(Boolean)
          .join(' - '),
        source,
      });
    });

  return facilities;
}

function buildDerivedRoutes(
  park: ParkListingRecord,
  unitNumber: string | undefined,
  routes: GeoJsonFeature<RouteProperties>[],
  source: SourceReference,
): ParkRoute[] {
  if (!unitNumber) {
    return [];
  }

  return routes
    .filter((feature) => normalizeUnitNumber(feature.properties.UNITNBR) === unitNumber)
    .map((feature, index) => {
      const routeClass = feature.properties.ROUTECLASS?.toLowerCase() ?? '';
      const routeType = routeClass.includes('road') ? 'road' : 'trail';

      return {
        routeId: `${park.parkId}-route-${index + 1}`,
        name: feature.properties.ROUTENAME ?? `Route ${index + 1}`,
        routeType,
        distanceMiles:
          typeof feature.properties.SEGLNGTH === 'number'
            ? Number((feature.properties.SEGLNGTH / 5280).toFixed(2))
            : undefined,
        difficulty: 'unknown',
        source,
      };
    });
}

function parseDogsAllowed(fragment?: ParsedParkPageFragment): boolean | undefined {
  if (!fragment?.dogPolicy) {
    return undefined;
  }

  const lower = fragment.dogPolicy.toLowerCase();

  if (lower.startsWith('yes')) {
    return true;
  }

  if (lower.startsWith('no')) {
    return false;
  }

  return undefined;
}

async function main(): Promise<void> {
  const builtAt = new Date().toISOString();
  const runId = timestampSlug(builtAt);

  const listing = await readJsonFile<ParkListingSnapshot>(PARK_LISTING_PATH);
  const fragmentsIndex = await readJsonFile<ParkPageFragmentsIndex>(PARK_PAGE_INDEX_PATH);
  const boundaries = await readJsonFile<GeoJsonCollection<BoundaryProperties>>(BOUNDARIES_PATH);
  const entryPoints = await readJsonFile<GeoJsonCollection<EntryPointProperties>>(ENTRY_POINTS_PATH);
  const routes = await readJsonFile<GeoJsonCollection<RouteProperties>>(ROUTES_PATH);
  const campgrounds = await readJsonFile<GeoJsonCollection<CampgroundProperties>>(CAMPGROUNDS_PATH);
  const parkingPoints =
    await readJsonFile<GeoJsonCollection<ParkingPointProperties>>(PARKING_POINTS_PATH);

  const fragmentsByParkId = new Map<string, ParsedParkPageFragment>();

  for (const park of fragmentsIndex.parks) {
    const fragmentPath = path.join(normalizedRoot, 'park-page-fragments', park.slug, 'latest.json');
    const fragment = await readJsonFile<ParsedParkPageFragment>(fragmentPath);
    fragmentsByParkId.set(fragment.parkId, fragment);
  }

  const summariesByPageId = new Map<string, GeoJsonFeature<EntryPointProperties>>();
  const boundaryFeaturesByUnitNumber = new Map<string, GeoJsonFeature<BoundaryProperties>[]>();

  for (const feature of entryPoints.features) {
    const pageId = getPageIdFromParkWebPage(feature.properties.PARK_WEB_PG);

    if (pageId) {
      summariesByPageId.set(pageId, feature);
    }
  }

  for (const feature of boundaries.features) {
    const unitNumber = normalizeUnitNumber(feature.properties.UNITNBR);

    if (!unitNumber) {
      continue;
    }

    const group = boundaryFeaturesByUnitNumber.get(unitNumber) ?? [];
    group.push(feature);
    boundaryFeaturesByUnitNumber.set(unitNumber, group);
  }

  const records: CanonicalParkRecord[] = [];
  const artifacts: ArtifactRecord[] = [];
  const canonicalRoot = path.join(normalizedRoot, 'canonical-parks');

  await ensureDir(canonicalRoot);

  for (const park of listing.parks) {
    const fragment = fragmentsByParkId.get(park.parkId);
    const summaryFeature = summariesByPageId.get(park.pageId);
    const unitNumber =
      normalizeUnitNumber(summaryFeature?.properties.UNIT_NBR) ??
      getUnitNumberFromMapLinks(fragment);
    const boundaryFeatures = unitNumber
      ? boundaryFeaturesByUnitNumber.get(unitNumber) ?? []
      : [];
    const pageSource = createSourceReference({
      sourceId: `${park.parkId}-park-page`,
      sourceType: 'park_detail_page',
      title: `${park.name} Park Page`,
      url: park.url,
      fetchedAt: fragment?.sourceFetchedAt ?? fragmentsIndex.sourceParkPagesFetchedAt,
      lastVerifiedAt: fragment?.lastChecked,
      parserVersion: 'park-page-fragment-v1',
      freshnessTier: 'operational',
    });
    const listingSource = createSourceReference({
      sourceId: `${park.parkId}-listing`,
      sourceType: 'park_listing',
      title: 'California State Parks Listing',
      url: listing.sourceUrl,
      fetchedAt: listing.fetchedAt,
      parserVersion: 'park-listing-v1',
      freshnessTier: 'static',
    });
    const boundarySource = createSourceReference({
      sourceId: `${park.parkId}-boundary`,
      sourceType: 'open_data_dataset',
      title: 'California State Parks Park Boundaries',
      url: 'https://sandbox.data.ca.gov/dataset/park-boundaries',
      fetchedAt: builtAt,
      parserVersion: 'open-data-boundary-v1',
      freshnessTier: 'static',
    });
    const routesSource = createSourceReference({
      sourceId: `${park.parkId}-routes`,
      sourceType: 'open_data_dataset',
      title: 'California State Parks Recreational Routes',
      url: 'https://sandbox.data.ca.gov/dataset/recreational-routes',
      fetchedAt: builtAt,
      parserVersion: 'open-data-routes-v1',
      freshnessTier: 'static',
    });
    const facilitiesSource = createSourceReference({
      sourceId: `${park.parkId}-facilities`,
      sourceType: 'open_data_dataset',
      title: 'California State Parks Facilities Datasets',
      url: 'https://sandbox.data.ca.gov/organization/datasets?publisher=california-department-of-parks-and-recreation&q=',
      fetchedAt: builtAt,
      parserVersion: 'open-data-facilities-v1',
      freshnessTier: 'static',
    });

    const { activities, amenities } = splitActivitiesAndAmenities(fragment);
    const fees = parseFeeLines(park, fragment, pageSource);
    const alerts = parseAlerts(park, fragment, pageSource);
    const documents = parseDocuments(park, fragment, pageSource);
    const facilities = buildDerivedFacilities(
      park,
      unitNumber,
      campgrounds.features,
      parkingPoints.features,
      facilitiesSource,
    );
    const parkRoutes = buildDerivedRoutes(park, unitNumber, routes.features, routesSource);
    const boundingBox = computeBoundingBox(
      boundaryFeatures as Array<GeoJsonFeature<Record<string, unknown>>>,
    );
    const centroid: GeoPoint | undefined =
      typeof summaryFeature?.properties.LAT === 'number' &&
      typeof summaryFeature?.properties.LON === 'number'
        ? {
            latitude: summaryFeature.properties.LAT,
            longitude: summaryFeature.properties.LON,
          }
        : boundingBox
          ? {
              latitude: (boundingBox.minLatitude + boundingBox.maxLatitude) / 2,
              longitude: (boundingBox.minLongitude + boundingBox.maxLongitude) / 2,
            }
        : undefined;

    const record: CanonicalParkRecord = {
      parkId: park.parkId,
      slug: park.slug,
      name: park.name,
      unitType: deriveUnitType(park.name),
      status: inferStatus(fragment),
      county: summaryFeature?.properties.County,
      description: fragment?.aboutText,
      shortSummary: fragment?.aboutText,
      centroid,
      boundingBox,
      contacts: {
        phone: fragment?.contactPhone,
        websiteUrl: park.url,
      },
      hours: fragment?.hoursSummary
        ? {
            summary: fragment.hoursSummary,
            source: pageSource,
          }
        : undefined,
      fees,
      facilities,
      routes: parkRoutes,
      alerts,
      documents,
      safetyTips: [],
      activities,
      amenities,
      dogPolicy: fragment?.dogPolicy,
      dogsAllowed: parseDogsAllowed(fragment),
      reservationSummary:
        fragment?.notableLinks.find((link) => link.kind === 'reservation')?.label ?? undefined,
      geometry: boundaryFeatures.length
        ? [
            {
              kind: 'boundary',
              format: 'geojson',
              assetKey: path.relative(process.cwd(), BOUNDARIES_PATH),
              featureCount: boundaryFeatures.length,
              boundingBox,
              simplified: false,
            },
          ]
        : [],
      sources: [listingSource, pageSource, boundarySource, routesSource, facilitiesSource],
      sourceUpdatedAt: fragment?.sourceFetchedAt ?? listing.fetchedAt,
    };

    const recordDir = path.join(canonicalRoot, park.slug);
    const versionedRecordPath = path.join(recordDir, `${runId}.json`);
    const latestRecordPath = path.join(recordDir, 'latest.json');
    const recordJson = toPrettyJson(record);

    await ensureDir(recordDir);
    await writeTextFile(versionedRecordPath, recordJson);
    await writeTextFile(latestRecordPath, recordJson);

    records.push(record);
    artifacts.push({
      label: `${park.slug}_canonical_park`,
      path: versionedRecordPath,
      bytes: Buffer.byteLength(recordJson),
      sha256: sha256Hex(recordJson),
      contentType: 'application/json',
      sourceUrl: park.url,
    });
  }

  records.sort((left, right) => left.name.localeCompare(right.name));

  const canonicalIndex = {
    builtAt,
    sourceListingFetchedAt: listing.fetchedAt,
    sourceParkPagesParsedAt: fragmentsIndex.parsedAt,
    recordCount: records.length,
    parks: records.map((record) => ({
      parkId: record.parkId,
      name: record.name,
      slug: record.slug,
      county: record.county,
      unitType: record.unitType,
      status: record.status,
      facilityCount: record.facilities.length,
      routeCount: record.routes.length,
      alertCount: record.alerts.length,
      documentCount: record.documents.length,
      dogsAllowed: record.dogsAllowed,
    })),
    upstreamFailures: fragmentsIndex.upstreamFailures,
  };

  const indexPath = path.join(canonicalRoot, `${runId}.json`);
  const latestIndexPath = path.join(canonicalRoot, 'latest-index.json');
  const indexJson = toPrettyJson(canonicalIndex);

  await writeTextFile(indexPath, indexJson);
  await writeTextFile(latestIndexPath, indexJson);

  artifacts.push({
    label: 'canonical_parks_index',
    path: indexPath,
    bytes: Buffer.byteLength(indexJson),
    sha256: sha256Hex(indexJson),
    contentType: 'application/json',
    sourceUrl: listing.sourceUrl,
  });

  const manifest: SourceRunManifest = {
    jobName: 'build-canonical-park',
    fetchedAt: builtAt,
    sourceUrl: listing.sourceUrl,
    artifactCount: artifacts.length,
    artifacts,
    metadata: {
      recordCount: records.length,
      upstreamMissingPageCount: fragmentsIndex.missingPageCount,
      parsedFragmentCount: fragmentsIndex.parsedCount,
    },
  };

  const manifestPath = path.join(manifestsRoot, 'build-canonical-park.json');
  await writeTextFile(manifestPath, toPrettyJson(manifest));

  console.log(
    `Built ${records.length} canonical park records into ${path.relative(process.cwd(), canonicalRoot)}`,
  );
}

await main();
