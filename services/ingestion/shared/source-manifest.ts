export interface ArtifactRecord {
  label: string;
  path: string;
  bytes: number;
  sha256: string;
  contentType?: string | null;
  sourceUrl?: string;
}

export interface SourceRunManifest {
  jobName: string;
  fetchedAt: string;
  sourceUrl: string;
  artifactCount: number;
  artifacts: ArtifactRecord[];
  metadata?: Record<string, unknown>;
}
