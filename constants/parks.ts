export interface Park {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  region: string;
}

export const CA_STATE_PARKS: Park[] = [
  { id: '1', name: 'Angel Island SP', lat: 37.86293, lon: -122.43098, type: 'State Park', region: 'Bay Area' },
  { id: '2', name: 'Armstrong Redwoods SNR', lat: 38.54266, lon: -123.00832, type: 'State Natural Reserve', region: 'North Coast' },
  { id: '3', name: 'Anza-Borrego Desert SP', lat: 33.12307, lon: -116.33552, type: 'State Park', region: 'Southern California' },
  { id: '4', name: 'Andrew Molera SP', lat: 36.28281, lon: -121.83004, type: 'State Park', region: 'Central Coast' },
  { id: '5', name: 'Bodie SHP', lat: 38.20839, lon: -119.00792, type: 'State Historic Park', region: 'Eastern Sierra' },
  { id: '6', name: 'Bothe-Napa Valley SP', lat: 38.5419, lon: -122.52229, type: 'State Park', region: 'Bay Area' },
  { id: '7', name: 'Big Basin Redwoods SP', lat: 37.1736, lon: -122.2247, type: 'State Park', region: 'Bay Area' },
  { id: '8', name: 'Calaveras Big Trees SP', lat: 38.25958, lon: -120.26751, type: 'State Park', region: 'Gold Country' },
  { id: '9', name: 'China Camp SP', lat: 38.00283, lon: -122.49137, type: 'State Park', region: 'Bay Area' },
  { id: '10', name: 'Chino Hills SP', lat: 33.91047, lon: -117.73335, type: 'State Park', region: 'Southern California' },
  { id: '11', name: 'Crystal Cove SP', lat: 33.5768, lon: -117.81894, type: 'State Park', region: 'Southern California' },
  { id: '12', name: 'Cuyamaca Rancho SP', lat: 32.96116, lon: -116.58136, type: 'State Park', region: 'Southern California' },
  { id: '13', name: 'D.L. Bliss SP', lat: 38.98171, lon: -120.09748, type: 'State Park', region: 'Lake Tahoe' },
  { id: '14', name: 'Del Norte Coast Redwoods SP', lat: 41.69616, lon: -124.0515, type: 'State Park', region: 'North Coast' },
  { id: '15', name: 'Doheny SB', lat: 33.45751, lon: -117.67644, type: 'State Beach', region: 'Southern California' },
  { id: '16', name: 'Donner Memorial SP', lat: 39.30759, lon: -120.2788, type: 'State Park', region: 'Lake Tahoe' },
  { id: '17', name: 'Emerald Bay SP', lat: 38.96149, lon: -120.09105, type: 'State Park', region: 'Lake Tahoe' },
  { id: '18', name: 'Empire Mine SHP', lat: 39.20939, lon: -121.04506, type: 'State Historic Park', region: 'Gold Country' },
  { id: '19', name: 'Fort Ross SHP', lat: 38.5184, lon: -123.23202, type: 'State Historic Park', region: 'North Coast' },
  { id: '20', name: 'Garrapata SP', lat: 36.46674, lon: -121.91421, type: 'State Park', region: 'Central Coast' },
  { id: '21', name: 'Grover Hot Springs SP', lat: 38.70292, lon: -119.83822, type: 'State Park', region: 'Eastern Sierra' },
  { id: '22', name: 'Henry Cowell Redwoods SP', lat: 37.04997, lon: -122.08797, type: 'State Park', region: 'Central Coast' },
  { id: '23', name: 'Hendy Woods SP', lat: 39.06819, lon: -123.46797, type: 'State Park', region: 'North Coast' },
  { id: '24', name: 'Humboldt Lagoons SP', lat: 41.22919, lon: -124.09702, type: 'State Park', region: 'North Coast' },
  { id: '25', name: 'Humboldt Redwoods SP', lat: 40.32307, lon: -123.93812, type: 'State Park', region: 'North Coast' },
  { id: '26', name: 'Jedediah Smith Redwoods SP', lat: 41.79523, lon: -124.0867, type: 'State Park', region: 'North Coast' },
  { id: '27', name: 'Julia Pfeiffer Burns SP', lat: 36.16505, lon: -121.67754, type: 'State Park', region: 'Central Coast' },
  { id: '28', name: 'Jug Handle SNR', lat: 39.38514, lon: -123.81904, type: 'State Natural Reserve', region: 'North Coast' },
  { id: '29', name: 'MacKerricher SP', lat: 39.50101, lon: -123.78723, type: 'State Park', region: 'North Coast' },
  { id: '30', name: 'Malibu Creek SP', lat: 34.08745, lon: -118.7341, type: 'State Park', region: 'Southern California' },
  { id: '31', name: 'Mount Tamalpais SP', lat: 37.90249, lon: -122.60295, type: 'State Park', region: 'Bay Area' },
  { id: '32', name: 'Año Nuevo SP', lat: 37.15074, lon: -122.32781, type: 'State Park', region: 'Bay Area' },
  { id: '33', name: 'Pfeiffer Big Sur SP', lat: 36.25258, lon: -121.77701, type: 'State Park', region: 'Central Coast' },
  { id: '34', name: 'Russian Gulch SP', lat: 39.33054, lon: -123.7761, type: 'State Park', region: 'North Coast' },
  { id: '35', name: 'Salt Point SP', lat: 38.58462, lon: -123.33269, type: 'State Park', region: 'North Coast' },
  { id: '36', name: 'Torrey Pines SNR', lat: 32.91905, lon: -117.24984, type: 'State Natural Reserve', region: 'Southern California' },
  { id: '37', name: 'Van Damme SP', lat: 39.27418, lon: -123.76408, type: 'State Park', region: 'North Coast' },
  { id: '38', name: 'Benbow SRA', lat: 40.06496, lon: -123.8103, type: 'State Recreation Area', region: 'North Coast' },
  { id: '39', name: 'Carmel River SB', lat: 36.5325, lon: -121.92522, type: 'State Beach', region: 'Central Coast' },
  { id: '40', name: 'Austin Creek SRA', lat: 38.5713, lon: -123.0365, type: 'State Recreation Area', region: 'Bay Area' },
  { id: '41', name: 'Patrick Point SP', lat: 41.13055, lon: -124.15293, type: 'State Park', region: 'North Coast' },
  { id: '42', name: 'Prairie Creek Redwoods SP', lat: 41.3782, lon: -124.0353, type: 'State Park', region: 'North Coast' },
  { id: '43', name: 'Samuel P. Taylor SP', lat: 38.01745, lon: -122.72921, type: 'State Park', region: 'Bay Area' },
  { id: '44', name: 'Sonoma Coast SB', lat: 38.41253, lon: -123.11182, type: 'State Beach', region: 'Bay Area' },
  { id: '45', name: 'Tomales Bay SP', lat: 38.17183, lon: -122.88741, type: 'State Park', region: 'Bay Area' },
];

export function getDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
