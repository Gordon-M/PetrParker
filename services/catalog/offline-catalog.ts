import type { SQLiteDatabase } from 'expo-sqlite';

export interface OfflineBundleInfo {
  version: string;
  generatedAt: string;
  parkCount: number;
  sourceSnapshotAt: string;
}

export interface OfflineParkSummary {
  parkId: string;
  slug: string;
  name: string;
  unitType: string;
  county?: string | null;
  status: string;
  hoursSummary?: string | null;
  dogsAllowed?: boolean | null;
  routeCount: number;
  alertCount: number;
  documentCount: number;
}

export interface OfflineParkFee {
  feeId: string;
  label: string;
  amount?: string | null;
  notes?: string | null;
}

export interface OfflineParkAlert {
  alertId: string;
  title: string;
  message: string;
  severity: string;
}

export interface OfflineParkDocument {
  documentId: string;
  title: string;
  documentType: string;
  url: string;
}

export interface OfflineParkFacility {
  facilityId: string;
  name: string;
  category: string;
}

export interface OfflineParkRoute {
  routeId: string;
  name: string;
  routeType: string;
  difficulty?: string | null;
  distanceMiles?: number | null;
}

export interface OfflineParkDetail {
  parkId: string;
  slug: string;
  name: string;
  unitType: string;
  status: string;
  county?: string | null;
  description?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  hoursSummary?: string | null;
  hoursLastVerifiedAt?: string | null;
  dogPolicy?: string | null;
  sourceUpdatedAt: string;
  activities: string[];
  amenities: string[];
  fees: OfflineParkFee[];
  alerts: OfflineParkAlert[];
  documents: OfflineParkDocument[];
  facilities: OfflineParkFacility[];
  routes: OfflineParkRoute[];
}

export interface OfflineCatalogDiagnostics {
  bundle: OfflineBundleInfo;
  counts: {
    facilities: number;
    routes: number;
    alerts: number;
    documents: number;
    activities: number;
    amenities: number;
  };
}

interface CountRow {
  count: number;
}

function likePattern(search: string): string {
  return `%${search.trim()}%`;
}

function coerceBoolean(value: number | null | undefined): boolean | null {
  if (value == null) {
    return null;
  }

  return Boolean(value);
}

export async function searchOfflineParks(
  db: SQLiteDatabase,
  search: string,
): Promise<{ parks: OfflineParkSummary[] }> {
  const trimmedSearch = search.trim();
  const hasSearch = trimmedSearch.length > 0;

  const rows = await db.getAllAsync<{
    parkId: string;
    slug: string;
    name: string;
    unitType: string;
    county?: string | null;
    status: string;
    hoursSummary?: string | null;
    dogsAllowed?: number | null;
    routeCount: number;
    alertCount: number;
    documentCount: number;
  }>(
    `
      SELECT
        park.park_id AS parkId,
        park.slug AS slug,
        park.name AS name,
        park.unit_type AS unitType,
        park.county AS county,
        park.status AS status,
        park.hours_summary AS hoursSummary,
        park.dogs_allowed AS dogsAllowed,
        (SELECT COUNT(*) FROM park_route WHERE park_id = park.park_id) AS routeCount,
        (SELECT COUNT(*) FROM park_alert WHERE park_id = park.park_id) AS alertCount,
        (SELECT COUNT(*) FROM park_document WHERE park_id = park.park_id) AS documentCount
      FROM park
      WHERE
        (? = '' OR park.name LIKE ? OR COALESCE(park.county, '') LIKE ? OR park.unit_type LIKE ?)
      ORDER BY park.name COLLATE NOCASE ASC
    `,
    trimmedSearch,
    hasSearch ? likePattern(trimmedSearch) : '',
    hasSearch ? likePattern(trimmedSearch) : '',
    hasSearch ? likePattern(trimmedSearch) : '',
  );

  return {
    parks: rows.map((row) => ({
      ...row,
      dogsAllowed: coerceBoolean(row.dogsAllowed),
    })),
  };
}

export async function getOfflineParkById(
  db: SQLiteDatabase,
  parkId: string,
): Promise<OfflineParkDetail | null> {
  if (!parkId) {
    return null;
  }

  const park = await db.getFirstAsync<{
    parkId: string;
    slug: string;
    name: string;
    unitType: string;
    status: string;
    county?: string | null;
    description?: string | null;
    phone?: string | null;
    websiteUrl?: string | null;
    hoursSummary?: string | null;
    hoursLastVerifiedAt?: string | null;
    dogPolicy?: string | null;
    sourceUpdatedAt: string;
  }>(
    `
      SELECT
        park.park_id AS parkId,
        park.slug AS slug,
        park.name AS name,
        park.unit_type AS unitType,
        park.status AS status,
        park.county AS county,
        park.description AS description,
        park_contact.phone AS phone,
        park_contact.website_url AS websiteUrl,
        park.hours_summary AS hoursSummary,
        park.hours_last_verified_at AS hoursLastVerifiedAt,
        park.dog_policy AS dogPolicy,
        park.source_updated_at AS sourceUpdatedAt
      FROM park
      LEFT JOIN park_contact ON park_contact.park_id = park.park_id
      WHERE park.park_id = ?
      LIMIT 1
    `,
    parkId,
  );

  if (!park) {
    return null;
  }

  const [activities, amenities, fees, alerts, documents, facilities, routes] = await Promise.all([
    db.getAllAsync<{ activity: string }>(
      'SELECT activity FROM park_activity WHERE park_id = ? ORDER BY activity COLLATE NOCASE ASC',
      parkId,
    ),
    db.getAllAsync<{ amenity: string }>(
      'SELECT amenity FROM park_amenity WHERE park_id = ? ORDER BY amenity COLLATE NOCASE ASC',
      parkId,
    ),
    db.getAllAsync<OfflineParkFee>(
      `
        SELECT fee_id AS feeId, label, amount, notes
        FROM park_fee
        WHERE park_id = ?
        ORDER BY label COLLATE NOCASE ASC
      `,
      parkId,
    ),
    db.getAllAsync<OfflineParkAlert>(
      `
        SELECT alert_id AS alertId, title, message, severity
        FROM park_alert
        WHERE park_id = ?
        ORDER BY title COLLATE NOCASE ASC
      `,
      parkId,
    ),
    db.getAllAsync<OfflineParkDocument>(
      `
        SELECT document_id AS documentId, title, document_type AS documentType, url
        FROM park_document
        WHERE park_id = ?
        ORDER BY title COLLATE NOCASE ASC
      `,
      parkId,
    ),
    db.getAllAsync<OfflineParkFacility>(
      `
        SELECT facility_id AS facilityId, name, category
        FROM park_facility
        WHERE park_id = ?
        ORDER BY name COLLATE NOCASE ASC
      `,
      parkId,
    ),
    db.getAllAsync<OfflineParkRoute>(
      `
        SELECT route_id AS routeId, name, route_type AS routeType, difficulty, distance_miles AS distanceMiles
        FROM park_route
        WHERE park_id = ?
        ORDER BY name COLLATE NOCASE ASC
      `,
      parkId,
    ),
  ]);

  return {
    ...park,
    activities: activities.map((item) => item.activity),
    amenities: amenities.map((item) => item.amenity),
    fees,
    alerts,
    documents,
    facilities,
    routes,
  };
}

export async function getOfflineCatalogDiagnostics(
  db: SQLiteDatabase,
): Promise<OfflineCatalogDiagnostics> {
  const bundle =
    (await db.getFirstAsync<OfflineBundleInfo>(
      `
        SELECT
          version,
          generated_at AS generatedAt,
          park_count AS parkCount,
          source_snapshot_at AS sourceSnapshotAt
        FROM bundle_manifest
        ORDER BY generated_at DESC
        LIMIT 1
      `,
    )) ?? null;

  if (!bundle) {
    throw new Error('The staged SQLite bundle is missing its bundle_manifest row.');
  }

  const [facilities, routes, alerts, documents, activities, amenities] = await Promise.all([
    db.getFirstAsync<CountRow>('SELECT COUNT(*) AS count FROM park_facility'),
    db.getFirstAsync<CountRow>('SELECT COUNT(*) AS count FROM park_route'),
    db.getFirstAsync<CountRow>('SELECT COUNT(*) AS count FROM park_alert'),
    db.getFirstAsync<CountRow>('SELECT COUNT(*) AS count FROM park_document'),
    db.getFirstAsync<CountRow>('SELECT COUNT(*) AS count FROM park_activity'),
    db.getFirstAsync<CountRow>('SELECT COUNT(*) AS count FROM park_amenity'),
  ]);

  return {
    bundle,
    counts: {
      facilities: facilities?.count ?? 0,
      routes: routes?.count ?? 0,
      alerts: alerts?.count ?? 0,
      documents: documents?.count ?? 0,
      activities: activities?.count ?? 0,
      amenities: amenities?.count ?? 0,
    },
  };
}
