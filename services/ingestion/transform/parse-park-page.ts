import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ensureDir, writeTextFile } from '../shared/fs.ts';
import { sha256Hex } from '../shared/hashing.ts';
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

const PARK_PAGE_INDEX_PATH = path.join(normalizedRoot, 'park-pages', 'latest-index.json');

interface ParkPageIndexEntry {
  parkId: string;
  pageId: string;
  name: string;
  slug: string;
  sourceUrl: string;
  pageTitle?: string;
  lastChecked?: string;
  notableLinkCount: number;
  metadataPath: string;
  rawHtmlPath: string;
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

interface ParkPagesIndex {
  fetchedAt: string;
  sourceListingFetchedAt: string;
  sourceListingUrl: string;
  expectedParkCount: number;
  successCount: number;
  failureCount: number;
  missingPageCount: number;
  blockingFailureCount: number;
  parks: ParkPageIndexEntry[];
  failures: ParkPageFailure[];
}

interface ParkPageLink {
  label: string;
  url: string;
  kind: string;
}

interface ParkPageMetadata {
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
  notableLinks: ParkPageLink[];
  rawHtmlPath: string;
  sourceMetadataPath: string;
}

function cleanText(value: string): string {
  return normalizeWhitespace(decodeHtmlEntities(stripTags(value)));
}

function toPrettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function loadParkPageIndex(): Promise<ParkPagesIndex> {
  try {
    const contents = await readFile(PARK_PAGE_INDEX_PATH, 'utf8');
    return JSON.parse(contents) as ParkPagesIndex;
  } catch (error) {
    throw new Error(
      `Unable to load ${PARK_PAGE_INDEX_PATH}. Run "npm run ingest:park-pages" first.`,
      { cause: error },
    );
  }
}

async function loadParkPageMetadata(metadataPath: string): Promise<ParkPageMetadata> {
  const contents = await readFile(metadataPath, 'utf8');
  return JSON.parse(contents) as ParkPageMetadata;
}

function extractFirstText(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);

  if (!match?.[1]) {
    return undefined;
  }

  const text = cleanText(match[1]);
  return text || undefined;
}

function extractAllTexts(html: string, pattern: RegExp): string[] {
  const values: string[] = [];

  for (const match of html.matchAll(pattern)) {
    const text = cleanText(match[1]);

    if (!text) {
      continue;
    }

    values.push(text);
  }

  return Array.from(new Set(values));
}

function extractHoursSummary(html: string): string | undefined {
  return extractFirstText(html, /id="parkHoursContainer"[^>]*>([\s\S]*?)<\/div>/i);
}

function extractContactPhone(html: string): string | undefined {
  return extractFirstText(
    html,
    /Contact <strong[^>]*>Information<\/strong><\/h4>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i,
  );
}

function extractDogPolicy(html: string): string | undefined {
  const dogInfoContainer = extractFirstText(
    html,
    /id="dogInfoContainer"[^>]*>([\s\S]*?)<\/div>/i,
  );

  if (dogInfoContainer) {
    return dogInfoContainer;
  }

  return extractFirstText(
    html,
    /Are dogs <strong[^>]*>Allowed\?<\/strong><\/h4>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractAboutText(html: string, parkName: string): string | undefined {
  const headingPattern = new RegExp(
    `<h4 class="mb-3">About ${escapeRegExp(parkName)}<\\/h4>[\\s\\S]*?<p class="mb-0">([\\s\\S]*?)<\\/p>`,
    'i',
  );

  return extractFirstText(html, headingPattern);
}

function extractDirectionsSummary(html: string): string | undefined {
  return extractFirstText(
    html,
    /Maps and Park Directions[\s\S]*?<p class="mb-0">([\s\S]*?)<\/p>/i,
  );
}

function extractFeeLines(html: string): string[] {
  const dayUseSection = html.match(/id="DayUseModal"[\s\S]*?<ul>([\s\S]*?)<\/ul>/i)?.[1];

  if (!dayUseSection) {
    return [];
  }

  return extractAllTexts(dayUseSection, /<li>([\s\S]*?)<\/li>/gi);
}

function extractAlertLines(html: string): string[] {
  const advisoriesSection =
    html.match(/Current <strong[^>]*>Advisories and Notices<\/strong>[\s\S]*?<\/section>/i)?.[0] ??
    html.match(/Current Restrictions[\s\S]*?<\/section>/i)?.[0] ??
    '';

  if (!advisoriesSection) {
    return [];
  }

  return extractAllTexts(advisoriesSection, /<a[^>]*>([\s\S]*?)<\/a>/gi);
}

function extractActivityFacilityLines(html: string): string[] {
  const sectionMatch = html.match(
    /Activities and Facilities[\s\S]*?<div id="collapse\d+Six"|Activities and Facilities[\s\S]*?## Image Gallery|Activities and Facilities[\s\S]*?<div class="row mt-4"/i,
  );
  const section = sectionMatch?.[0] ?? '';

  if (!section) {
    return [];
  }

  return extractAllTexts(section, /<li><i class="fas fa-caret-right"><\/i>([\s\S]*?)<\/li>/gi);
}

async function parseOneParkPage(
  metadata: ParkPageMetadata,
  parsedAt: string,
  runId: string,
): Promise<{ fragment: ParsedParkPageFragment; artifacts: ArtifactRecord[] }> {
  const html = await readFile(metadata.rawHtmlPath, 'utf8');
  const fragmentDir = path.join(normalizedRoot, 'park-page-fragments', metadata.slug);

  await ensureDir(fragmentDir);

  const fragment: ParsedParkPageFragment = {
    parkId: metadata.parkId,
    pageId: metadata.pageId,
    name: metadata.name,
    slug: metadata.slug,
    sourceUrl: metadata.sourceUrl,
    parsedAt,
    sourceFetchedAt: metadata.fetchedAt,
    pageTitle: metadata.pageTitle,
    lastChecked: metadata.lastChecked,
    hoursSummary: extractHoursSummary(html),
    contactPhone: extractContactPhone(html),
    dogPolicy: extractDogPolicy(html),
    directionsSummary: extractDirectionsSummary(html),
    aboutText: extractAboutText(html, metadata.name),
    feeLines: extractFeeLines(html),
    alertLines: extractAlertLines(html),
    activityFacilityLines: extractActivityFacilityLines(html),
    notableLinks: metadata.notableLinks,
    rawHtmlPath: metadata.rawHtmlPath,
    sourceMetadataPath: metadata.metadataPath,
  };

  const versionedFragmentPath = path.join(fragmentDir, `${runId}.json`);
  const latestFragmentPath = path.join(fragmentDir, 'latest.json');
  const fragmentJson = toPrettyJson(fragment);

  await writeTextFile(versionedFragmentPath, fragmentJson);
  await writeTextFile(latestFragmentPath, fragmentJson);

  return {
    fragment,
    artifacts: [
      {
        label: `${metadata.slug}_parsed_fragment`,
        path: versionedFragmentPath,
        bytes: Buffer.byteLength(fragmentJson),
        sha256: sha256Hex(fragmentJson),
        contentType: 'application/json',
        sourceUrl: metadata.sourceUrl,
      },
    ],
  };
}

async function main(): Promise<void> {
  const parkPageIndex = await loadParkPageIndex();
  const parsedAt = new Date().toISOString();
  const runId = timestampSlug(parsedAt);
  const fragments: ParsedParkPageFragment[] = [];
  const artifacts: ArtifactRecord[] = [];

  for (const park of parkPageIndex.parks) {
    const metadata = await loadParkPageMetadata(park.metadataPath);
    const result = await parseOneParkPage(metadata, parsedAt, runId);
    fragments.push(result.fragment);
    artifacts.push(...result.artifacts);
  }

  fragments.sort((left, right) => left.name.localeCompare(right.name));

  const index = {
    parsedAt,
    sourceParkPagesFetchedAt: parkPageIndex.fetchedAt,
    expectedParkCount: parkPageIndex.expectedParkCount,
    parsedCount: fragments.length,
    missingPageCount: parkPageIndex.missingPageCount,
    parks: fragments.map((fragment) => ({
      parkId: fragment.parkId,
      name: fragment.name,
      slug: fragment.slug,
      hoursSummary: fragment.hoursSummary,
      feeLineCount: fragment.feeLines.length,
      alertCount: fragment.alertLines.length,
      activityFacilityCount: fragment.activityFacilityLines.length,
      sourceUrl: fragment.sourceUrl,
    })),
    upstreamFailures: parkPageIndex.failures,
  };

  const indexDir = path.join(normalizedRoot, 'park-page-fragments');
  const versionedIndexPath = path.join(indexDir, `${runId}.json`);
  const latestIndexPath = path.join(indexDir, 'latest-index.json');
  const indexJson = toPrettyJson(index);

  await ensureDir(indexDir);
  await writeTextFile(versionedIndexPath, indexJson);
  await writeTextFile(latestIndexPath, indexJson);

  artifacts.push({
    label: 'park_page_fragments_index',
    path: versionedIndexPath,
    bytes: Buffer.byteLength(indexJson),
    sha256: sha256Hex(indexJson),
    contentType: 'application/json',
    sourceUrl: parkPageIndex.sourceListingUrl,
  });

  const manifest: SourceRunManifest = {
    jobName: 'parse-park-page',
    fetchedAt: parsedAt,
    sourceUrl: parkPageIndex.sourceListingUrl,
    artifactCount: artifacts.length,
    artifacts,
    metadata: {
      expectedParkCount: parkPageIndex.expectedParkCount,
      parsedCount: fragments.length,
      missingPageCount: parkPageIndex.missingPageCount,
      upstreamFailureCount: parkPageIndex.failureCount,
    },
  };

  const manifestPath = path.join(manifestsRoot, 'parse-park-page.json');
  await writeTextFile(manifestPath, toPrettyJson(manifest));

  console.log(
    `Parsed ${fragments.length} park page fragments into ${path.relative(process.cwd(), indexDir)}`,
  );
}

await main();
