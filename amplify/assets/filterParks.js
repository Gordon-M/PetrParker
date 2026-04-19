import fs from 'fs';

// 1. Load your downloaded file
const rawData = fs.readFileSync('ParkBoundaries_4357266439196921879 (6).json');
const geojson = JSON.parse(rawData);

console.log(`Initial features: ${geojson.features.length}`);

// 2. Filter out null geometries
const cleanFeatures = geojson.features.filter(feature => {
  // Checks if geometry exists AND is not null
  return feature.geometry !== null && feature.geometry !== undefined;
});

// 3. Reconstruct the GeoJSON object
const cleanGeoJSON = {
  ...geojson,
  features: cleanFeatures
};

console.log(`Features after cleaning: ${cleanFeatures.length}`);

// 4. Save the new file
fs.writeFileSync('ca_parks_cleaned.json', JSON.stringify(cleanGeoJSON, null, 2));

console.log('Done! Use ca_parks_cleaned.json for your AWS upload.');