export const PARK_SOURCE_TYPES = [
  'park_listing',
  'open_data_dataset',
  'park_detail_page',
  'park_document',
  'safety_guidance',
  'rules_page',
  'faq_page',
  'generated_summary',
] as const;

export type ParkSourceType = (typeof PARK_SOURCE_TYPES)[number];

export const FRESHNESS_TIERS = [
  'static',
  'operational',
  'guidance',
  'generated',
] as const;

export type FreshnessTier = (typeof FRESHNESS_TIERS)[number];

export const PARK_STATUSES = [
  'open',
  'partially_open',
  'temporarily_closed',
  'seasonal',
  'unknown',
] as const;

export type ParkStatus = (typeof PARK_STATUSES)[number];

export const ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const;

export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export interface BoundingBox {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface SourceReference {
  sourceId: string;
  sourceType: ParkSourceType;
  title: string;
  url: string;
  fetchedAt: string;
  lastVerifiedAt?: string;
  checksum?: string;
  parserVersion: string;
  freshnessTier: FreshnessTier;
}

export interface GeometryReference {
  kind: 'boundary' | 'route' | 'parking' | 'trailhead' | 'poi';
  format: 'geojson';
  assetKey: string;
  featureCount: number;
  boundingBox?: BoundingBox;
  simplified: boolean;
}

export interface ParkContact {
  phone?: string;
  email?: string;
  websiteUrl?: string;
  reservationUrl?: string;
}

export interface ParkHours {
  summary: string;
  details?: string;
  seasonal?: boolean;
  source: SourceReference;
}

export interface ParkFee {
  feeId: string;
  label: string;
  amount?: string;
  currency?: 'USD';
  notes?: string;
  source: SourceReference;
}

export interface ParkFacility {
  facilityId: string;
  name: string;
  category:
    | 'campground'
    | 'day_use'
    | 'parking'
    | 'restroom'
    | 'visitor_center'
    | 'picnic_area'
    | 'boat_launch'
    | 'water'
    | 'other';
  description?: string;
  location?: GeoPoint;
  source: SourceReference;
}

export interface ParkRoute {
  routeId: string;
  name: string;
  routeType: 'trail' | 'road' | 'bike' | 'multi_use' | 'unknown';
  distanceMiles?: number;
  elevationGainFeet?: number;
  difficulty?: 'easy' | 'moderate' | 'hard' | 'unknown';
  geometry?: GeometryReference;
  source: SourceReference;
}

export interface ParkAlert {
  alertId: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  effectiveAt?: string;
  expiresAt?: string;
  source: SourceReference;
}

export interface ParkDocument {
  documentId: string;
  title: string;
  documentType: 'brochure' | 'map' | 'guide' | 'notice' | 'faq' | 'other';
  url: string;
  mimeType?: string;
  source: SourceReference;
}

export interface SafetyTip {
  tipId: string;
  title: string;
  body: string;
  tags: string[];
  source: SourceReference;
}

export interface CanonicalParkRecord {
  parkId: string;
  slug: string;
  name: string;
  unitType: string;
  status: ParkStatus;
  district?: string;
  county?: string;
  description?: string;
  shortSummary?: string;
  heroImageUrl?: string;
  centroid?: GeoPoint;
  boundingBox?: BoundingBox;
  contacts: ParkContact;
  hours?: ParkHours;
  fees: ParkFee[];
  facilities: ParkFacility[];
  routes: ParkRoute[];
  alerts: ParkAlert[];
  documents: ParkDocument[];
  safetyTips: SafetyTip[];
  activities: string[];
  amenities: string[];
  dogPolicy?: string;
  dogsAllowed?: boolean;
  reservationSummary?: string;
  geometry: GeometryReference[];
  sources: SourceReference[];
  sourceUpdatedAt: string;
  generatedSummaryUpdatedAt?: string;
}

export interface GlobalSafetyTopic {
  topicId: string;
  title: string;
  body: string;
  tags: string[];
  source: SourceReference;
}

export interface OfflineBundleFileArtifact {
  fileName: string;
  bytes: number;
  sha256: string;
  contentType: string;
  relativePath: string;
}

export interface OfflineBundleManifest {
  version: string;
  generatedAt: string;
  parkCount: number;
  sourceSnapshotAt: string;
  minSupportedAppVersion?: string;
  upstreamFailures: Array<Record<string, unknown>>;
  sqlite: OfflineBundleFileArtifact;
}

export interface PublishedOfflineBundleManifest extends OfflineBundleManifest {
  publishedAt: string;
  bucket: string;
  region: string;
  prefix: string;
  distribution: {
    latestManifestKey: string;
    versionedManifestKey: string;
    latestBundleKey: string;
    versionedBundleKey: string;
    latestManifestUrl?: string;
    versionedManifestUrl?: string;
    latestBundleUrl?: string;
    versionedBundleUrl?: string;
  };
}
