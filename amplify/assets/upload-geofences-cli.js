#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { LocationClient, BatchPutGeofenceCommand } = require("@aws-sdk/client-location");

const REGION = process.env.AWS_REGION || "us-west-2";
const COLLECTION_NAME =
  process.env.GEOFENCE_COLLECTION_NAME || "CaliforniaStateParkBoundaries";

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, "../amplify/assets/ca_parks_cleaned.json");

const BATCH_SIZE = 10;

function normalizeId(unitName) {
  return String(unitName)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, 100);
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  const raw = fs.readFileSync(inputPath, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data.features)) {
    throw new Error("Invalid input: expected a GeoJSON FeatureCollection with features[]");
  }

  const entries = [];
  let skippedNonPolygon = 0;
  let skippedMissingName = 0;
  let duplicateNameCount = 0;
  const idCounts = new Map();

  for (const feature of data.features) {
    const unitName = feature?.properties?.UNITNAME;
    const geometry = feature?.geometry;

    if (!unitName) {
      skippedMissingName += 1;
      continue;
    }

    if (!geometry || geometry.type !== "Polygon" || !Array.isArray(geometry.coordinates)) {
      skippedNonPolygon += 1;
      continue;
    }

    const baseId = normalizeId(unitName);
    const seen = idCounts.get(baseId) || 0;
    idCounts.set(baseId, seen + 1);
    const geofenceId = seen === 0 ? baseId : `${baseId}_${seen + 1}`;
    if (seen > 0) {
      duplicateNameCount += 1;
    }

    entries.push({
      GeofenceId: geofenceId,
      Geometry: {
        Polygon: geometry.coordinates,
      },
    });
  }

  const client = new LocationClient({ region: REGION });
  const batches = chunk(entries, BATCH_SIZE);
  let successCount = 0;
  let failureCount = 0;

  console.log(`Collection: ${COLLECTION_NAME}`);
  console.log(`Region: ${REGION}`);
  console.log(`Input: ${inputPath}`);
  console.log(`Prepared: ${entries.length}`);
  console.log(`Skipped missing UNITNAME: ${skippedMissingName}`);
  console.log(`Skipped non-Polygon: ${skippedNonPolygon}`);
  console.log(`Duplicate UNITNAME remapped: ${duplicateNameCount}`);

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    const result = await client.send(
      new BatchPutGeofenceCommand({
        CollectionName: COLLECTION_NAME,
        Entries: batch,
      })
    );

    const errors = result.Errors || [];
    const errorIds = new Set(errors.map((e) => e.GeofenceId));
    successCount += batch.length - errors.length;
    failureCount += errors.length;

    console.log(`Batch ${i + 1}/${batches.length}: ${batch.length - errors.length} success, ${errors.length} failed`);
    if (errors.length > 0) {
      for (const err of errors) {
        console.log(`  - ${err.GeofenceId}: ${err.Error?.Code || "Unknown"} ${err.Error?.Message || ""}`);
      }
    }

    if (errorIds.size === 0) {
      continue;
    }
  }

  console.log("---");
  console.log(`Uploaded successfully: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});