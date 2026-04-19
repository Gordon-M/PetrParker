import path from 'node:path';

import { ensureDir, writeJsonFile, writeTextFile } from '../shared/fs.ts';
import { sha256Hex } from '../shared/hashing.ts';
import { fetchText } from '../shared/http.ts';
import {
  manifestsRoot,
  normalizedRoot,
  rawRoot,
  timestampSlug,
} from '../shared/paths.ts';
import type { SourceRunManifest } from '../shared/source-manifest.ts';
import {
  decodeHtmlEntities,
  normalizeWhitespace,
  slugify,
  stripTags,
} from '../shared/text.ts';

const PARK_LISTING_URL = 'https://www.parks.ca.gov/?page_id=21805';

interface ParkListingRecord {
  parkId: string;
  pageId: string;
  name: string;
  slug: string;
  url: string;
}

function buildAbsoluteUrl(href: string): string {
  return new URL(href, PARK_LISTING_URL).toString();
}

function extractPageId(url: string): string {
  const parsed = new URL(url);
  const pageId = parsed.searchParams.get('page_id');

  if (!pageId) {
    throw new Error(`Missing page_id in park URL: ${url}`);
  }

  return pageId;
}

function extractListingSection(html: string): string {
  const headingMarker = '<h1 data-title-border>California State Parks Listing</h1>';
  const contentMarker = '<div id="main-content"';
  const reservationMarker = '<h2 class="short"><strong>Make a Camping Reservation</strong></h2>';
  const headingIndex = html.indexOf(headingMarker);
  const startIndex = html.indexOf(contentMarker, headingIndex);
  const endIndex = html.indexOf(reservationMarker, startIndex);

  if (
    headingIndex === -1 ||
    startIndex === -1 ||
    endIndex === -1 ||
    endIndex <= startIndex
  ) {
    throw new Error('Unable to locate the park listing section in the source HTML.');
  }

  return html.slice(startIndex, endIndex);
}

function parseParkLinks(html: string): ParkListingRecord[] {
  const listingSection = extractListingSection(html);
  const anchorPattern = /<a[^>]+href="([^"]*page_id=\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const parks: ParkListingRecord[] = [];
  const seenPageIds = new Set<string>();

  for (const match of listingSection.matchAll(anchorPattern)) {
    const url = buildAbsoluteUrl(match[1]);
    const pageId = extractPageId(url);

    if (seenPageIds.has(pageId)) {
      continue;
    }

    const name = normalizeWhitespace(decodeHtmlEntities(stripTags(match[2])));

    if (!name) {
      continue;
    }

    parks.push({
      parkId: `ca-park-${pageId}`,
      pageId,
      name,
      slug: slugify(name),
      url,
    });
    seenPageIds.add(pageId);
  }

  if (parks.length === 0) {
    throw new Error('Parsed zero parks from the listing page.');
  }

  return parks.sort((left, right) => left.name.localeCompare(right.name));
}

async function main(): Promise<void> {
  const fetchedAt = new Date().toISOString();
  const runId = timestampSlug(fetchedAt);

  const htmlResult = await fetchText(PARK_LISTING_URL);
  const parks = parseParkLinks(htmlResult.text);

  const rawDir = path.join(rawRoot, 'park-listing');
  const normalizedDir = path.join(normalizedRoot, 'park-listing');

  await ensureDir(rawDir);
  await ensureDir(normalizedDir);

  const rawHtmlPath = path.join(rawDir, `${runId}.html`);
  const latestHtmlPath = path.join(rawDir, 'latest.html');
  const parsedJsonPath = path.join(normalizedDir, `${runId}.json`);
  const latestJsonPath = path.join(normalizedDir, 'latest.json');
  const manifestPath = path.join(manifestsRoot, 'fetch-park-listing.json');

  await writeTextFile(rawHtmlPath, htmlResult.text);
  await writeTextFile(latestHtmlPath, htmlResult.text);
  await writeJsonFile(parsedJsonPath, {
    fetchedAt,
    sourceUrl: PARK_LISTING_URL,
    parkCount: parks.length,
    parks,
  });
  await writeJsonFile(latestJsonPath, {
    fetchedAt,
    sourceUrl: PARK_LISTING_URL,
    parkCount: parks.length,
    parks,
  });

  const manifest: SourceRunManifest = {
    jobName: 'fetch-park-listing',
    fetchedAt,
    sourceUrl: PARK_LISTING_URL,
    artifactCount: 2,
    artifacts: [
      {
        label: 'park_listing_html',
        path: rawHtmlPath,
        bytes: htmlResult.body.byteLength,
        sha256: sha256Hex(htmlResult.body),
        contentType: htmlResult.contentType,
        sourceUrl: htmlResult.finalUrl,
      },
      {
        label: 'park_listing_json',
        path: parsedJsonPath,
        bytes: Buffer.byteLength(JSON.stringify(parks)),
        sha256: sha256Hex(JSON.stringify(parks)),
        contentType: 'application/json',
      },
    ],
    metadata: {
      parkCount: parks.length,
    },
  };

  await writeJsonFile(manifestPath, manifest);

  console.log(
    `Fetched ${parks.length} parks from the official listing into ${path.relative(process.cwd(), latestJsonPath)}`,
  );
}

await main();
