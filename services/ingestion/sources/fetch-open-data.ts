import path from 'node:path';

import {
  OPEN_DATA_DATASETS,
  type OpenDataDatasetConfig,
} from '../shared/open-data-catalog.ts';
import {
  ensureDir,
  writeBinaryFile,
  writeJsonFile,
  writeTextFile,
} from '../shared/fs.ts';
import { sha256Hex } from '../shared/hashing.ts';
import { fetchBytes, fetchText } from '../shared/http.ts';
import { manifestsRoot, rawRoot, timestampSlug } from '../shared/paths.ts';
import type {
  ArtifactRecord,
  SourceRunManifest,
} from '../shared/source-manifest.ts';

interface DatasetFetchResult {
  slug: string;
  title: string;
  datasetPageUrl: string;
  lastUpdated?: string;
  geojsonDownloadUrl: string;
  geojsonContentType: string | null;
  geoserviceUrl?: string;
  htmlPath: string;
  geojsonPath: string;
  htmlBytes: number;
  geojsonBytes: number;
  htmlSha256: string;
  geojsonSha256: string;
}

function resolveLink(pageUrl: string, href: string): string {
  return new URL(href, pageUrl).toString();
}

function extractFirstMatch(text: string, pattern: RegExp, label: string): string {
  const match = text.match(pattern);

  if (!match?.[1]) {
    throw new Error(`Unable to extract ${label}.`);
  }

  return match[1];
}

function extractGeoJsonDownloadUrl(html: string, datasetPageUrl: string): string {
  const href = extractFirstMatch(
    html,
    /href="([^"]*\/api\/download\/v1\/items\/[^"]*\/geojson\?layers=\d+[^"]*)"/i,
    'GeoJSON download URL',
  );

  return resolveLink(datasetPageUrl, href);
}

function extractGeoServiceUrl(html: string, datasetPageUrl: string): string | undefined {
  const match = html.match(
    /href="([^"]*services2\.arcgis\.com\/[^"]*\/arcgis\/rest\/services\/[^"]*FeatureServer[^"]*)"/i,
  );

  if (!match?.[1]) {
    return undefined;
  }

  return resolveLink(datasetPageUrl, match[1]);
}

function extractLastUpdated(html: string): string | undefined {
  const match = html.match(/Last updated:\s*([^<\n]+)/i);
  return match?.[1]?.trim();
}

async function fetchDataset(
  dataset: OpenDataDatasetConfig,
  fetchedAt: string,
): Promise<DatasetFetchResult> {
  const runId = timestampSlug(fetchedAt);
  const datasetRoot = path.join(rawRoot, 'open-data', dataset.slug);

  await ensureDir(datasetRoot);

  const htmlResult = await fetchText(dataset.datasetPageUrl);
  const geojsonDownloadUrl = extractGeoJsonDownloadUrl(htmlResult.text, dataset.datasetPageUrl);
  const geoserviceUrl = extractGeoServiceUrl(htmlResult.text, dataset.datasetPageUrl);
  const geojsonResult = await fetchBytes(geojsonDownloadUrl);

  const htmlPath = path.join(datasetRoot, `${runId}.html`);
  const latestHtmlPath = path.join(datasetRoot, 'latest.html');
  const geojsonPath = path.join(datasetRoot, `${runId}.geojson`);
  const latestGeojsonPath = path.join(datasetRoot, 'latest.geojson');

  await writeTextFile(htmlPath, htmlResult.text);
  await writeTextFile(latestHtmlPath, htmlResult.text);
  await writeBinaryFile(geojsonPath, geojsonResult.body);
  await writeBinaryFile(latestGeojsonPath, geojsonResult.body);

  return {
    slug: dataset.slug,
    title: dataset.title,
    datasetPageUrl: dataset.datasetPageUrl,
    lastUpdated: extractLastUpdated(htmlResult.text),
    geojsonDownloadUrl,
    geojsonContentType: geojsonResult.contentType,
    geoserviceUrl,
    htmlPath,
    geojsonPath,
    htmlBytes: htmlResult.body.byteLength,
    geojsonBytes: geojsonResult.body.byteLength,
    htmlSha256: sha256Hex(htmlResult.body),
    geojsonSha256: sha256Hex(geojsonResult.body),
  };
}

function toArtifactRecords(results: DatasetFetchResult[]): ArtifactRecord[] {
  return results.flatMap((result) => [
    {
      label: `${result.slug}_dataset_page`,
      path: result.htmlPath,
      bytes: result.htmlBytes,
      sha256: result.htmlSha256,
      contentType: 'text/html',
      sourceUrl: result.datasetPageUrl,
    },
    {
      label: `${result.slug}_geojson`,
      path: result.geojsonPath,
      bytes: result.geojsonBytes,
      sha256: result.geojsonSha256,
      contentType: result.geojsonContentType,
      sourceUrl: result.geojsonDownloadUrl,
    },
  ]);
}

async function main(): Promise<void> {
  const fetchedAt = new Date().toISOString();
  const results: DatasetFetchResult[] = [];

  for (const dataset of OPEN_DATA_DATASETS) {
    console.log(`Fetching ${dataset.title} from ${dataset.datasetPageUrl}`);
    results.push(await fetchDataset(dataset, fetchedAt));
  }

  const manifest: SourceRunManifest = {
    jobName: 'fetch-open-data',
    fetchedAt,
    sourceUrl: 'https://sandbox.data.ca.gov/organization/datasets?publisher=california-department-of-parks-and-recreation&q=',
    artifactCount: results.length * 2,
    artifacts: toArtifactRecords(results),
    metadata: {
      datasetCount: results.length,
      datasets: results.map((result) => ({
        slug: result.slug,
        title: result.title,
        datasetPageUrl: result.datasetPageUrl,
        lastUpdated: result.lastUpdated,
        geoserviceUrl: result.geoserviceUrl,
        geojsonDownloadUrl: result.geojsonDownloadUrl,
      })),
    },
  };

  const manifestPath = path.join(manifestsRoot, 'fetch-open-data.json');
  await writeJsonFile(manifestPath, manifest);

  console.log(
    `Fetched ${results.length} official open-data datasets into ${path.relative(process.cwd(), path.join(rawRoot, 'open-data'))}`,
  );
}

await main();
