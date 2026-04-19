import fs from 'node:fs';

const inputFileName = 'ca_parks_cleaned.json'; 

try {
  const rawData = fs.readFileSync(inputFileName, 'utf8');
  const geojson = JSON.parse(rawData);

  let overLimitCount = 0;
  let totalFeatures = geojson.features.length;

  console.log(`--- Scanning ${totalFeatures} Features ---`);

  geojson.features.forEach((feature, index) => {
    const type = feature.geometry.type;
    let vertexCount = 0;

    // Helper to count coordinates in nested arrays
    const countCoords = (arr) => {
      if (!Array.isArray(arr)) return 0;
      // If the first element is a number, we found a coordinate pair [lat, lng]
      if (typeof arr[0] === 'number') return 1;
      // Otherwise, keep digging deeper
      return arr.reduce((sum, sub) => sum + countCoords(sub), 0);
    };

    vertexCount = countCoords(feature.geometry.coordinates);

    if (vertexCount > 1000) {
      overLimitCount++;
      const name = feature.properties?.UNITNAME || feature.properties?.name || "Unknown Park";
      console.log(`❌ [Index ${index}] ${name}: ${vertexCount} vertices (OVER LIMIT)`);
    }
  });

  console.log('-------------------------------------------');
  if (overLimitCount === 0) {
    console.log('✅ ALL CLEAR! Every feature is under the 1000 vertex limit.');
  } else {
    console.log(`⚠️  FAIL: ${overLimitCount} features are still over the 1000 limit.`);
    console.log('Action: Go back to Mapshaper and use a more aggressive simplify (e.g., 0.5%).');
  }

} catch (err) {
  console.error("Error reading file:", err.message);
}