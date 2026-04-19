PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS bundle_manifest (
  version TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  park_count INTEGER NOT NULL,
  source_snapshot_at TEXT NOT NULL,
  min_supported_app_version TEXT
);

CREATE TABLE IF NOT EXISTS park (
  park_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit_type TEXT NOT NULL,
  status TEXT NOT NULL,
  district TEXT,
  county TEXT,
  description TEXT,
  short_summary TEXT,
  hero_image_url TEXT,
  latitude REAL,
  longitude REAL,
  bbox_min_lat REAL,
  bbox_min_lng REAL,
  bbox_max_lat REAL,
  bbox_max_lng REAL,
  dogs_allowed INTEGER,
  dog_policy TEXT,
  reservation_summary TEXT,
  hours_summary TEXT,
  hours_details TEXT,
  hours_last_verified_at TEXT,
  source_updated_at TEXT NOT NULL,
  generated_summary_updated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS park_name_idx ON park(name);
CREATE INDEX IF NOT EXISTS park_county_idx ON park(county);
CREATE INDEX IF NOT EXISTS park_status_idx ON park(status);

CREATE TABLE IF NOT EXISTS park_contact (
  park_id TEXT PRIMARY KEY,
  phone TEXT,
  email TEXT,
  website_url TEXT,
  reservation_url TEXT,
  FOREIGN KEY (park_id) REFERENCES park(park_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS park_activity (
  park_id TEXT NOT NULL,
  activity TEXT NOT NULL,
  PRIMARY KEY (park_id, activity),
  FOREIGN KEY (park_id) REFERENCES park(park_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS park_amenity (
  park_id TEXT NOT NULL,
  amenity TEXT NOT NULL,
  PRIMARY KEY (park_id, amenity),
  FOREIGN KEY (park_id) REFERENCES park(park_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS park_fee (
  fee_id TEXT PRIMARY KEY,
  park_id TEXT NOT NULL,
  label TEXT NOT NULL,
  amount TEXT,
  currency TEXT,
  notes TEXT,
  source_url TEXT NOT NULL,
  last_verified_at TEXT,
  FOREIGN KEY (park_id) REFERENCES park(park_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS park_fee_park_id_idx ON park_fee(park_id);

CREATE TABLE IF NOT EXISTS park_facility (
  facility_id TEXT PRIMARY KEY,
  park_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  latitude REAL,
  longitude REAL,
  source_url TEXT NOT NULL,
  last_verified_at TEXT,
  FOREIGN KEY (park_id) REFERENCES park(park_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS park_facility_park_id_idx ON park_facility(park_id);

CREATE TABLE IF NOT EXISTS park_route (
  route_id TEXT PRIMARY KEY,
  park_id TEXT NOT NULL,
  name TEXT NOT NULL,
  route_type TEXT NOT NULL,
  distance_miles REAL,
  elevation_gain_feet REAL,
  difficulty TEXT,
  source_url TEXT NOT NULL,
  last_verified_at TEXT,
  FOREIGN KEY (park_id) REFERENCES park(park_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS park_route_park_id_idx ON park_route(park_id);

CREATE TABLE IF NOT EXISTS park_geometry (
  geometry_id TEXT PRIMARY KEY,
  park_id TEXT NOT NULL,
  geometry_kind TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'geojson',
  simplified INTEGER NOT NULL DEFAULT 1,
  geojson TEXT NOT NULL,
  bbox_min_lat REAL,
  bbox_min_lng REAL,
  bbox_max_lat REAL,
  bbox_max_lng REAL,
  FOREIGN KEY (park_id) REFERENCES park(park_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS park_geometry_park_id_idx ON park_geometry(park_id);

CREATE TABLE IF NOT EXISTS park_alert (
  alert_id TEXT PRIMARY KEY,
  park_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL,
  effective_at TEXT,
  expires_at TEXT,
  source_url TEXT NOT NULL,
  last_verified_at TEXT,
  FOREIGN KEY (park_id) REFERENCES park(park_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS park_alert_park_id_idx ON park_alert(park_id);
CREATE INDEX IF NOT EXISTS park_alert_expires_at_idx ON park_alert(expires_at);

CREATE TABLE IF NOT EXISTS park_document (
  document_id TEXT PRIMARY KEY,
  park_id TEXT NOT NULL,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  source_url TEXT NOT NULL,
  last_verified_at TEXT,
  FOREIGN KEY (park_id) REFERENCES park(park_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS park_document_park_id_idx ON park_document(park_id);

CREATE TABLE IF NOT EXISTS safety_tip (
  tip_id TEXT PRIMARY KEY,
  park_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  source_url TEXT NOT NULL,
  last_verified_at TEXT,
  FOREIGN KEY (park_id) REFERENCES park(park_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS safety_tip_park_id_idx ON safety_tip(park_id);

CREATE TABLE IF NOT EXISTS source_reference (
  source_id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  last_verified_at TEXT,
  checksum TEXT,
  parser_version TEXT NOT NULL,
  freshness_tier TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS park_source (
  park_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  PRIMARY KEY (park_id, source_id),
  FOREIGN KEY (park_id) REFERENCES park(park_id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES source_reference(source_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS park_source_source_id_idx ON park_source(source_id);

-- Keep the SQLite bundle compact. Simplify geometry before export and avoid
-- embedding raw HTML, PDF text, or verbose provenance records in the mobile DB.
