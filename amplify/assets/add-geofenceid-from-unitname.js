#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const defaultInputWithUnderscore = path.resolve(
  __dirname,
  "../amplify/assets/ca_parks_cleaned_.json"
);
const defaultInputWithoutUnderscore = path.resolve(
  __dirname,
  "../amplify/assets/ca_parks_cleaned.json"
);

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : fs.existsSync(defaultInputWithUnderscore)
    ? defaultInputWithUnderscore
    : defaultInputWithoutUnderscore;

const outputPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.resolve(__dirname, "../amplify/assets/ca_parks_cleaned_with_geofenceid.json");

const raw = fs.readFileSync(inputPath, "utf8");
const data = JSON.parse(raw);

if (!Array.isArray(data.features)) {
  throw new Error("Invalid GeoJSON: expected a features array.");
}

for (const feature of data.features) {
  const unitName = feature?.properties?.UNITNAME;
  if (typeof unitName !== "string" || unitName.length === 0) {
    throw new Error("Feature missing properties.UNITNAME.");
  }
  feature.GeofenceId = unitName;
}

fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log(`Updated ${data.features.length} features.`);
console.log(`Input: ${inputPath}`);
console.log(`Output: ${outputPath}`);