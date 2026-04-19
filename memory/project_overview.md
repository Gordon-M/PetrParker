---
name: PetrParker Project Overview
description: React Native/Expo CA State Parks app with AWS Bedrock AI integration — architecture, status, and key files
type: project
---

Hackathon-stage Expo app (SDK 54, React Native 0.81, expo-router) that finds nearby California State Parks and shows AI-powered visitor info via AWS Bedrock (Claude 3 Haiku via InvokeModel).

**Why:** Build something like the National Park Service app but for CA State Parks, with AI-generated park info.

**Architecture:**
- 3 tabs: Home (MapKit map + user location), Ranger Tips (mock alerts), Search (real CA parks + Bedrock detail)
- `constants/parks.ts` — 45 CA State Parks with lat/lon centroids from GeoJSON
- `services/bedrock.ts` — calls Bedrock InvokeModel; graceful mock fallback if no credentials
- `amplify/` — Geofencing CDK (CAParkTracker → CaliforniaStateParkBoundaries collection) + Lambda that calls Bedrock Knowledge Base (backend not deployed yet)
- `amplify/assets/ca_parks_cleaned.json` — full GeoJSON with 257 CA State Park boundaries

**How to apply:** When suggesting new features, consider that the backend infra (geofencing, EventBridge) is set up but NOT deployed. Frontend calls Bedrock directly via env vars for now.

**Credentials needed:**
- `EXPO_PUBLIC_AWS_ACCESS_KEY_ID` + `EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY` + `EXPO_PUBLIC_AWS_REGION` in `.env.local`
- Must enable Claude 3 Haiku in AWS Bedrock Console (Model access) in us-east-1
- Google Maps API key is NOT needed — map uses platform default (MapKit on iOS)
