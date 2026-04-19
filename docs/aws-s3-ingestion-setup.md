# AWS S3 Ingestion Setup

Use S3 as the durable storage layer for the generated park knowledge artifacts.

The repo now includes a publisher script:

```bash
npm run sync:ingestion-to-s3
```

And a focused offline bundle publication script:

```bash
npm run publish:offline-bundle
```

## What You Need

Your exported AWS values are the correct kind of credentials for this step:

- `AWS_DEFAULT_REGION` or `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN` when you are using temporary session credentials

You still need one repo-specific variable:

- `PARKS_S3_BUCKET`

Optional:

- `PARKS_S3_PREFIX`
  - defaults to `parks-knowledge`
  - lets you keep these uploads under a folder-like prefix in the bucket
- `PARKS_DELIVERY_PREFIX`
  - defaults to `<PARKS_S3_PREFIX>/delivery/mobile-bundle`
  - use this if you want the app-facing SQLite bundle and manifest under a different prefix
- `PARKS_S3_PUBLIC_BASE_URL`
  - optional base URL such as a CloudFront domain
  - if set, the published manifest includes HTTPS URLs in addition to S3 keys

## Example Setup

The sync script now reads `.env.local` and `.env` automatically from the repo root, so you can either keep the values there or export them in your shell.

```bash
export AWS_DEFAULT_REGION="us-west-2"
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."
export PARKS_S3_BUCKET="your-bucket-name"
export PARKS_S3_PREFIX="parks-knowledge"

npm run sync:ingestion-to-s3
```

If you prefer `.env`, this also works:

```bash
cp .env.example .env
# fill in the AWS values

npm run sync:ingestion-to-s3
```

To publish just the app-facing offline bundle contract after a successful export:

```bash
npm run export:sqlite-bundle
npm run publish:offline-bundle
```

## What Gets Uploaded

The script mirrors the local ingestion outputs from `data/ingestion/`:

- `raw/`
- `normalized/`
- `manifests/`
- `exports/`

That means S3 will receive:

- raw HTML and GeoJSON snapshots
- parsed and canonical JSON outputs
- local run manifests
- the generated SQLite bundle and export manifest

## Suggested Bucket Layout

If `PARKS_S3_PREFIX=parks-knowledge`, the bucket keys will look like:

```text
parks-knowledge/raw/...
parks-knowledge/normalized/...
parks-knowledge/manifests/...
parks-knowledge/exports/...
```

The app-facing offline delivery keys will default to:

```text
parks-knowledge/delivery/mobile-bundle/latest/manifest.json
parks-knowledge/delivery/mobile-bundle/latest/parks.sqlite
parks-knowledge/delivery/mobile-bundle/versions/<version>/manifest.json
parks-knowledge/delivery/mobile-bundle/versions/<version>/parks.sqlite
```

## Required IAM Access

The credentials need permission to:

- `s3:ListBucket` on the bucket
- `s3:PutObject` on the target prefix
- `s3:GetObject` on the target prefix

You do not need Bedrock, Lambda, or DynamoDB permissions just to publish the files to S3.

## Important Notes

- Do not hardcode AWS credentials in source files.
- Do not commit credential exports to git.
- Session credentials expire. When that happens, refresh them and rerun the sync command.
- The sync script does not delete anything from S3. It only uploads or overwrites keys that match local files.
