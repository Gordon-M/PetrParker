import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ensureDir, writeTextFile } from '../shared/fs.ts';
import { sha256Hex } from '../shared/hashing.ts';
import { fetchText } from '../shared/http.ts';
import { manifestsRoot, normalizedRoot, rawRoot, timestampSlug } from '../shared/paths.ts';
import type {
  ArtifactRecord,
  SourceRunManifest,
} from '../shared/source-manifest.ts';
import {
  decodeHtmlEntities,
  normalizeWhitespace,
  stripTags,
} from '../shared/text.ts';

const PARK_LISTING_PATH = path.join(normalizedRoot, 'park-listing', 'latest.json');
const DEFAULT_CONCURRENCY = 5;
const MAX_ATTEMPTS = 3;

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

type NotableLinkKind =
  | 'brochure'
  | 'map'
  | 'directions'
  | 'accessibility'
  | 'reservation'
  | 'weather'
  | 'news'
  | 'events'
  | 'document'
  | 'other';

interface ParkPageLink {
  label: string;
  url: string;
  kind: NotableLinkKind;
}

interface ParkPageSnapshot {
  parkId: string;
  pageId: string;
  name: string;
  slug: string;
  sourceUrl: string;
  fetchedAt: string;
  contentType: string | null;
  pageTitle?: string;
  lastChecked?: string;
  rawHtmlSha256: string;
  rawHtmlPath: string;
  metadataPath: string;
  notableLinks: ParkPageLink[];
}

interface ParkPageFailure {
  parkId: string;
  pageId: string;
  name: string;
  url: string;
  attempts: number;
  error: string;
  httpStatus?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseConcurrency(): number {
  const rawValue = process.env.PARK_PAGE_FETCH_CONCURRENCY;

  if (!rawValue) {
    return DEFAULT_CONCURRENCY;
  }

  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid PARK_PAGE_FETCH_CONCURRENCY value: ${rawValue}`);
  }

  return Math.floor(parsed);
}

function cleanText(value: string): string {
  return normalizeWhitespace(decodeHtmlEntities(stripTags(value)));
}

function toPrettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function loadParkListing(): Promise<ParkListingSnapshot> {
  try {
    const contents = await readFile(PARK_LISTING_PATH, 'utf8');
    return JSON.parse(contents) as ParkListingSnapshot;
  } catch (error) {
    throw new Error(
      `Unable to load ${PARK_LISTING_PATH}. Run "npm run ingest:park-listing" first.`,
      { cause: error },
    );
  }
}

function extractPageTitle(html: string): string | undefined {
  const headingMatch = html.match(/<h1[^>]*data-title-border[^>]*>([\s\S]*?)<\/h1>/i);
  const fallbackMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const rawText = headingMatch?.[1] ?? fallbackMatch?.[1];

  if (!rawText) {
    return undefined;
  }

  const text = cleanText(rawText);
  return text || undefined;
}

function extractLastChecked(html: string): string | undefined {
  const match = html.match(/Last Checked:\s*([^<\n]+)/i);
  return match?.[1]?.trim();
}

function extractLinkSearchSection(html: string): string {
  const startMarker = '<div class="container fluid py-3">';
  const endMarker = 'Connect with California State Parks';
  const startIndex = html.indexOf(startMarker);
  const endIndex = html.indexOf(endMarker, startIndex);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return html;
  }

  return html.slice(startIndex, endIndex);
}

function deriveLabelFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const filename = decodeURIComponent(parsed.pathname.split('/').pop() ?? '');
    return filename || url;
  } catch {
    return url;
  }
}

function classifyLink(url: string, label: string): NotableLinkKind | null {
  const lowerUrl = url.toLowerCase();
  const lowerLabel = label.toLowerCase();

  if (
    lowerUrl.endsWith('.pdf') ||
    lowerUrl.endsWith('.doc') ||
    lowerUrl.endsWith('.docx') ||
    lowerLabel.includes('brochure') ||
    lowerLabel.includes('visitor guide')
  ) {
    return lowerLabel.includes('map') ? 'map' : 'brochure';
  }

  if (
    lowerLabel.includes('campground map') ||
    lowerLabel.includes('trail map') ||
    lowerLabel.includes('explore map') ||
    lowerLabel === 'maps' ||
    lowerLabel.includes('map of the park')
  ) {
    return 'map';
  }

  if (
    lowerLabel.includes('directions') ||
    lowerLabel.includes('google maps') ||
    lowerUrl.includes('maps.google.com')
  ) {
    return 'directions';
  }

  if (lowerLabel.includes('accessibility')) {
    return 'accessibility';
  }

  if (
    lowerLabel.includes('reservation') ||
    lowerLabel.includes('availability') ||
    lowerUrl.includes('reservecalifornia.com')
  ) {
    return 'reservation';
  }

  if (lowerLabel.includes('weather') || lowerLabel.includes('tides')) {
    return 'weather';
  }

  if (lowerLabel.includes('news')) {
    return 'news';
  }

  if (lowerLabel.includes('event')) {
    return 'events';
  }

  if (lowerUrl.endsWith('.txt') || lowerUrl.endsWith('.xls') || lowerUrl.endsWith('.xlsx')) {
    return 'document';
  }

  return null;
}

function extractNotableLinks(html: string, sourceUrl: string): ParkPageLink[] {
  const linkSearchSection = extractLinkSearchSection(html);
  const anchorPattern = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const links: ParkPageLink[] = [];
  const seen = new Set<string>();

  for (const match of linkSearchSection.matchAll(anchorPattern)) {
    const href = decodeHtmlEntities(match[1]);
    const absoluteUrl = new URL(href, sourceUrl).toString();
    const rawLabel = cleanText(match[2]);
    const label = rawLabel || deriveLabelFromUrl(absoluteUrl);
    const kind = classifyLink(absoluteUrl, label);

    if (!kind) {
      continue;
    }

    const dedupeKey = `${kind}|${absoluteUrl}`;

    if (seen.has(dedupeKey)) {
      continue;
    }

    links.push({
      label,
      url: absoluteUrl,
      kind,
    });
    seen.add(dedupeKey);
  }

  return links.sort((left, right) => {
    const leftKey = `${left.kind}:${left.label}`;
    const rightKey = `${right.kind}:${right.label}`;
    return leftKey.localeCompare(rightKey);
  });
}

function extractHttpStatus(errorMessage: string): number | undefined {
  const match = errorMessage.match(/:\s*(\d{3})\s/);

  if (!match) {
    return undefined;
  }

  return Number(match[1]);
}

async function fetchParkPageOnce(
  park: ParkListingRecord,
  fetchedAt: string,
  runId: string,
): Promise<{ snapshot: ParkPageSnapshot; artifacts: ArtifactRecord[] }> {
  const pageResult = await fetchText(park.url);
  const rawDir = path.join(rawRoot, 'park-pages', park.slug);
  const normalizedDir = path.join(normalizedRoot, 'park-pages', park.slug);

  await ensureDir(rawDir);
  await ensureDir(normalizedDir);

  const rawHtmlPath = path.join(rawDir, `${runId}.html`);
  const latestHtmlPath = path.join(rawDir, 'latest.html');
  const metadataPath = path.join(normalizedDir, `${runId}.json`);
  const latestMetadataPath = path.join(normalizedDir, 'latest.json');

  const snapshot: ParkPageSnapshot = {
    parkId: park.parkId,
    pageId: park.pageId,
    name: park.name,
    slug: park.slug,
    sourceUrl: park.url,
    fetchedAt,
    contentType: pageResult.contentType,
    pageTitle: extractPageTitle(pageResult.text),
    lastChecked: extractLastChecked(pageResult.text),
    rawHtmlSha256: sha256Hex(pageResult.body),
    rawHtmlPath,
    metadataPath,
    notableLinks: extractNotableLinks(pageResult.text, park.url),
  };

  const snapshotJson = toPrettyJson(snapshot);

  await writeTextFile(rawHtmlPath, pageResult.text);
  await writeTextFile(latestHtmlPath, pageResult.text);
  await writeTextFile(metadataPath, snapshotJson);
  await writeTextFile(latestMetadataPath, snapshotJson);

  return {
    snapshot,
    artifacts: [
      {
        label: `${park.slug}_park_page_html`,
        path: rawHtmlPath,
        bytes: pageResult.body.byteLength,
        sha256: sha256Hex(pageResult.body),
        contentType: pageResult.contentType,
        sourceUrl: pageResult.finalUrl,
      },
      {
        label: `${park.slug}_park_page_metadata`,
        path: metadataPath,
        bytes: Buffer.byteLength(snapshotJson),
        sha256: sha256Hex(snapshotJson),
        contentType: 'application/json',
        sourceUrl: park.url,
      },
    ],
  };
}

async function fetchParkPageWithRetry(
  park: ParkListingRecord,
  fetchedAt: string,
  runId: string,
): Promise<
  | { ok: true; snapshot: ParkPageSnapshot; artifacts: ArtifactRecord[] }
  | { ok: false; failure: ParkPageFailure }
> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await fetchParkPageOnce(park, fetchedAt, runId);

      return {
        ok: true,
        snapshot: result.snapshot,
        artifacts: result.artifacts,
      };
    } catch (error) {
      lastError = error;

      if (attempt < MAX_ATTEMPTS) {
        await delay(attempt * 500);
      }
    }
  }

  return {
    ok: false,
    failure: {
      parkId: park.parkId,
      pageId: park.pageId,
      name: park.name,
      url: park.url,
      attempts: MAX_ATTEMPTS,
      error: lastError instanceof Error ? lastError.message : String(lastError),
      httpStatus: extractHttpStatus(
        lastError instanceof Error ? lastError.message : String(lastError),
      ),
    },
  };
}

async function main(): Promise<void> {
  const listing = await loadParkListing();
  const fetchedAt = new Date().toISOString();
  const runId = timestampSlug(fetchedAt);
  const concurrency = Math.min(parseConcurrency(), listing.parks.length);

  const snapshots: ParkPageSnapshot[] = [];
  const failures: ParkPageFailure[] = [];
  const artifacts: ArtifactRecord[] = [];

  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < listing.parks.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      const park = listing.parks[currentIndex];

      if (currentIndex === 0 || (currentIndex + 1) % 25 === 0) {
        console.log(`Fetching park page ${currentIndex + 1}/${listing.parks.length}: ${park.name}`);
      }

      const result = await fetchParkPageWithRetry(park, fetchedAt, runId);

      if (!result.ok) {
        failures.push(result.failure);
        continue;
      }

      snapshots.push(result.snapshot);
      artifacts.push(...result.artifacts);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  snapshots.sort((left, right) => left.name.localeCompare(right.name));
  failures.sort((left, right) => left.name.localeCompare(right.name));
  const blockingFailures = failures.filter((failure) => failure.httpStatus !== 404);
  const missingPageFailures = failures.filter((failure) => failure.httpStatus === 404);

  const index = {
    fetchedAt,
    sourceListingFetchedAt: listing.fetchedAt,
    sourceListingUrl: listing.sourceUrl,
    expectedParkCount: listing.parkCount,
    successCount: snapshots.length,
    failureCount: failures.length,
    missingPageCount: missingPageFailures.length,
    blockingFailureCount: blockingFailures.length,
    parks: snapshots.map((snapshot) => ({
      parkId: snapshot.parkId,
      pageId: snapshot.pageId,
      name: snapshot.name,
      slug: snapshot.slug,
      sourceUrl: snapshot.sourceUrl,
      pageTitle: snapshot.pageTitle,
      lastChecked: snapshot.lastChecked,
      notableLinkCount: snapshot.notableLinks.length,
      metadataPath: snapshot.metadataPath,
      rawHtmlPath: snapshot.rawHtmlPath,
    })),
    failures,
  };

  const indexJson = toPrettyJson(index);
  const indexDir = path.join(normalizedRoot, 'park-pages');
  const versionedIndexPath = path.join(indexDir, `${runId}.json`);
  const latestIndexPath = path.join(indexDir, 'latest-index.json');

  await ensureDir(indexDir);
  await writeTextFile(versionedIndexPath, indexJson);
  await writeTextFile(latestIndexPath, indexJson);

  artifacts.push({
    label: 'park_pages_index',
    path: versionedIndexPath,
    bytes: Buffer.byteLength(indexJson),
    sha256: sha256Hex(indexJson),
    contentType: 'application/json',
    sourceUrl: listing.sourceUrl,
  });

  const manifest: SourceRunManifest = {
    jobName: 'fetch-park-pages',
    fetchedAt,
    sourceUrl: listing.sourceUrl,
    artifactCount: artifacts.length,
    artifacts,
    metadata: {
      sourceListingFetchedAt: listing.fetchedAt,
      expectedParkCount: listing.parkCount,
      successCount: snapshots.length,
      failureCount: failures.length,
      missingPageCount: missingPageFailures.length,
      blockingFailureCount: blockingFailures.length,
      failures,
    },
  };

  const manifestPath = path.join(manifestsRoot, 'fetch-park-pages.json');
  await writeTextFile(manifestPath, toPrettyJson(manifest));

  if (blockingFailures.length > 0) {
    throw new Error(
      `Failed to fetch ${blockingFailures.length} park pages. See ${manifestPath}.`,
    );
  }

  if (missingPageFailures.length > 0) {
    console.log(
      `Recorded ${missingPageFailures.length} park pages as missing from the official site.`,
    );
  }

  console.log(
    `Fetched ${snapshots.length} park pages into ${path.relative(process.cwd(), path.join(rawRoot, 'park-pages'))}`,
  );
}

await main();
