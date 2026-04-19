# Knowledge Database Spec

## Goal

Build a trustworthy, repeatable knowledge pipeline for California State Parks that supports:

- structured park data for app screens
- offline SQLite exports for the Expo app
- curated RAG documents for the AI ranger
- source attribution and freshness tracking for safety-critical fields

The system of record should be deterministic and inspectable. Bedrock should sit on top of the cleaned dataset for extraction and retrieval, not replace the dataset itself.

## Non-Goals

- using Bedrock as the primary crawler or canonical datastore
- relying on live HTML parsing inside the mobile app
- treating generated answers as the source of truth for fees, hours, or closures

## Recommended Architecture

1. Fetch official California State Parks datasets and park pages into `S3/raw`.
2. Normalize that raw data into canonical JSON records in `S3/normalized`.
3. Upsert the canonical records into DynamoDB for API lookup.
4. Export a versioned SQLite bundle for the React Native app.
5. Build a curated RAG corpus in `S3/rag` and ingest that into Bedrock Knowledge Bases.
6. Expose the structured API and bundle manifest through Lambda + API Gateway.

## Source Inventory

Use official, stable sources first. Use page scraping only to fill gaps.

| Priority | Source | Purpose |
| --- | --- | --- |
| 1 | California State Parks GIS / Open Data | Boundaries, routes, campgrounds, parking, access points, geometry |
| 1 | California State Parks park listing | Expected park/unit inventory and park IDs/slugs |
| 2 | Individual park pages on `parks.ca.gov` | Hours, fees, rules, amenities, contacts, brochure links, descriptive text |
| 2 | Global safety / rules / FAQ pages | Safety content for the chatbot and offline tips |
| 3 | Park brochures and PDFs | Additional detail when official pages are sparse |

## Bedrock Role

Use Bedrock in two narrow places:

1. Extraction from messy documents after raw files have been captured and versioned.
2. Retrieval for the AI ranger over curated summaries, rules, and safety documents.

Do not use Bedrock to:

- discover which parks exist
- generate operational facts without a cited source
- scrape and store uncontrolled website output as your only dataset

## AWS Layout

### Storage

- `S3`
  - `raw/park-listing/`
  - `raw/open-data/`
  - `raw/park-pages/`
  - `raw/documents/`
  - `normalized/parks/`
  - `normalized/documents/`
  - `exports/sqlite/`
  - `rag/`

### Compute

- `Step Functions`
  - orchestrates the end-to-end refresh job
- `Lambda`
  - fetches HTML, JSON, CSV, and GeoJSON
  - parses deterministic fields
  - writes manifests and validation output
- `Bedrock`
  - extracts structured fields from PDFs or irregular source documents
  - powers the AI ranger over curated knowledge-base content

Start with Lambda for simplicity. Only introduce Fargate if PDF processing, geometry simplification, or bundle generation becomes too heavy for Lambda limits.

### Datastores

- `DynamoDB`
  - `park_catalog`
  - `document_manifest`
  - `ingestion_runs`
- `Bedrock Knowledge Base`
  - S3-backed curated documents
  - managed vector store or OpenSearch Serverless, depending on deployment preference

### App Delivery

- `API Gateway + Lambda`
  - bundle manifest endpoint
  - catalog update endpoint
  - park detail endpoint
- `Expo app`
  - downloads the current SQLite bundle
  - stores it locally with `expo-sqlite`
  - falls back to bundle data when offline

## Canonical Entities

The shared TypeScript contract is defined in [types/parks.ts](../types/parks.ts).

Core entities:

- `CanonicalParkRecord`
- `ParkFacility`
- `ParkRoute`
- `ParkFee`
- `ParkAlert`
- `ParkDocument`
- `SafetyTip`
- `SourceReference`
- `OfflineBundleManifest`

## Freshness Tiers

Not all data should refresh on the same cadence.

| Tier | Fields | Refresh |
| --- | --- | --- |
| `static` | park name, county, district, geometry, coordinates | weekly or monthly |
| `operational` | hours, fees, reservation text, restrictions, alerts | daily |
| `guidance` | safety tips, rules, FAQ content | weekly or on content change |
| `generated` | summaries, embeddings, extracted snippets | regenerate only after upstream source changes |

Every operational field should retain:

- `source_url`
- `fetched_at`
- `last_verified_at`
- `parser_version`

## Proposed Repo Layout

Add the ingestion service in this repo so the mobile app and backend share contracts.

```text
docs/
  knowledge-database-spec.md
  sqlite-schema.sql
services/
  ingestion/
    README.md
    sources/
    transform/
    export/
    qa/
types/
  parks.ts
```

## First Ingestion Modules

Build the first scripts in this order.

1. `sources/fetch-park-listing.ts`
   - fetches the official park inventory page
   - emits the authoritative list of expected park records and URLs

2. `sources/fetch-open-data.ts`
   - downloads GeoJSON or CSV from California open data
   - stores raw datasets with checksums and fetch timestamps

3. `sources/fetch-park-pages.ts`
   - snapshots each park detail page as raw HTML
   - collects brochure and map document links

4. `transform/parse-park-page.ts`
   - extracts deterministic fields from the park HTML
   - outputs normalized fragments keyed by park ID

5. `transform/build-canonical-park.ts`
   - merges page data with open-data geometry and metadata
   - produces one `CanonicalParkRecord` per park

6. `qa/validate-catalog.ts`
   - verifies park count, required fields, URL health, and source coverage
   - fails the run on missing critical fields

7. `export/build-sqlite-bundle.ts`
   - writes the mobile offline bundle matching [docs/sqlite-schema.sql](./sqlite-schema.sql)

8. `export/build-rag-corpus.ts`
   - emits curated markdown or JSONL documents for Bedrock Knowledge Bases
   - excludes fields that belong in structured UI queries instead of RAG

## Parsing Strategy

Use deterministic extraction first.

- Prefer CSS selectors and known labels for hours, fees, contacts, and facilities.
- Prefer official JSON/CSV/GeoJSON over HTML whenever available.
- Use Bedrock extraction only for irregular brochures, PDFs, and long-form notices.

When Bedrock extracts fields, store:

- prompt version
- model ID
- source chunk reference
- confidence or review status

## SQLite Bundle Strategy

The app needs a compact, versioned, offline bundle.

- export one versioned SQLite database per successful ingestion run
- include a manifest with `version`, `generated_at`, `park_count`, and `min_supported_app_version`
- store only the fields needed offline in SQLite
- keep large raw documents and verbose provenance out of the mobile bundle

Geometry should be simplified before export so the bundle remains small enough for mobile download.

## Data Quality Gates

The pipeline should fail if any of these checks fail:

- expected park count drops unexpectedly
- park IDs are duplicated
- a park is missing name, slug, coordinates, or source references
- operational data is older than the allowed freshness window
- a parser change materially reduces extracted field coverage

## Suggested Milestones

### Milestone 1

- define shared contracts
- define SQLite schema
- capture official park listing

### Milestone 2

- ingest open-data geometry
- ingest park pages as raw HTML
- normalize first 10 parks end to end

### Milestone 3

- generate full canonical catalog
- export SQLite bundle
- wire the Expo app to read local bundle data

### Milestone 4

- build curated RAG corpus
- add Bedrock Knowledge Base
- add citation-aware chatbot responses

## Acceptance Criteria For The First Working Version

- the system can ingest every California State Park unit from official sources
- each park has a canonical record with source attribution
- the Expo app can load a generated SQLite bundle offline
- the chatbot corpus is generated from curated documents, not raw crawl output
- operational fields display their last verification timestamp
