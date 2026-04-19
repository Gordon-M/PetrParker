export interface OpenDataDatasetConfig {
  slug: string;
  title: string;
  datasetPageUrl: string;
  category: 'boundaries' | 'routes' | 'campgrounds' | 'entry_points' | 'parking';
}

export const OPEN_DATA_DATASETS: OpenDataDatasetConfig[] = [
  {
    slug: 'park-boundaries',
    title: 'Park Boundaries',
    datasetPageUrl: 'https://sandbox.data.ca.gov/dataset/park-boundaries',
    category: 'boundaries',
  },
  {
    slug: 'recreational-routes',
    title: 'Recreational Routes',
    datasetPageUrl: 'https://sandbox.data.ca.gov/dataset/recreational-routes',
    category: 'routes',
  },
  {
    slug: 'campgrounds',
    title: 'Campgrounds',
    datasetPageUrl: 'https://sandbox.data.ca.gov/dataset/campgrounds',
    category: 'campgrounds',
  },
  {
    slug: 'park-entry-points',
    title: 'Park Entry Points',
    datasetPageUrl: 'https://sandbox.data.ca.gov/dataset/park-entry-points',
    category: 'entry_points',
  },
  {
    slug: 'parking-points',
    title: 'Parking Points',
    datasetPageUrl: 'https://sandbox.data.ca.gov/dataset/parking-points',
    category: 'parking',
  },
];
