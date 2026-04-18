# PeterParker — Park Ranger in Your Pocket
## California State Parks Explorer · Hackathon Requirements Doc

---

## 1. Overview

PeterParker is a React Native mobile app for California State Park visitors. It provides real-time safety tips, park facts, trail tracking, and an AI ranger chatbot with full offline support. It mirrors the UX of the National Park Service app but scoped to CA State Parks only.

Hackathon demo goal: A working app on real phones (iOS and Android) showing park browsing, location-aware AI ranger tips, and offline-first data. Judges install via Expo Go in under 60 seconds via QR code.

---

## 2. Cross-Platform Dev Strategy (2 Macs, 2 Windows)

We are using Expo so all 4 teammates can develop without needing a Mac build pipeline.

- Mac teammates: Full iOS simulator via Xcode. Can do production builds.
- Windows teammates: Android emulator via Android Studio, or physical phone via Expo Go.
- Demo strategy: Publish to Expo EAS and share a QR code. Any judge with a phone runs the app instantly via Expo Go.

Note: Submitting to the App Store requires a Mac, but for a hackathon demo this is not needed.

---

## 3. Features and Scope

### MVP — must ship in hours 0–12
- Park search: Browse and search all CA State Parks. Offline cached list.
- Park detail page: Hours, fees, amenities, rules, contact info. Pre-cached for offline use.
- Park map: Offline-capable map tiles. Show user location within park.
- AI Ranger chatbot (PeterParker): Location-aware tips on safety, wildlife, and sightseeing.

### Core — target hours 12–20
- Trail tracker: GPS breadcrumb trail. Records path walked.
- Push notifications: Geofence-triggered tips when entering park zones.

### Stretch — hours 20–24 if time allows
- Photo identification: User takes photo and asks "Is this what you were talking about?"
- Zone-specific tips: Different AI content per zone within a single park.

---

## 4. Tech Stack

### Frontend / App

- Framework: React Native + Expo SDK 51. Expo Go = zero-build dev on any OS.
- Navigation: Expo Router (file-based). Same pattern as Next.js.
- UI components: NativeWind + Tailwind CSS. Fast to build, dark mode included.
- Maps: react-native-maps with Mapbox tile provider. Offline tile caching via Mapbox SDK.
- Local storage: expo-sqlite + AsyncStorage. Stores offline park data, cached AI responses, trail history.
- Location: expo-location. Background GPS for trail tracking and geofencing.
- Notifications: expo-notifications. Local + push. Geofence triggers fire local notifications even offline.
- State management: Zustand. Lightweight, faster to set up than Redux.

### Backend / Cloud (AWS)

- API layer: AWS Lambda + API Gateway. Serverless, no servers to manage, scales to zero cost when idle.
- AI / LLM: AWS Bedrock using Claude Sonnet. Powers PeterParker chatbot and location-aware tip generation.
- Knowledge base: Bedrock Knowledge Base + S3. Scraped CA State Parks data stored in S3, indexed by Bedrock for RAG queries.
- Database: DynamoDB. Park metadata, user trail history, notification state.
- Geolocation events: Amazon Location Service. Park boundary geofences loaded from parks.ca.gov dataset. Triggers EventBridge on park entry/exit.
- Event routing: AWS EventBridge. Geofence entry → EventBridge rule → Lambda → Bedrock tip → SNS push.
- Push notifications: AWS SNS + Expo Push API. Offline fallback uses local notifications via expo-notifications.
- Auth: AWS Cognito with anonymous guest auth. No sign-up required for demo.
- Offline sync: AWS Amplify DataStore. Syncs park data and AI responses to device SQLite. Works fully offline.
- Infrastructure as code: AWS CDK in TypeScript. Define all infra as code, one command deploy.

### Data Sources

- Park boundaries: parks.ca.gov/?page_id=29682 — official CA State Parks GeoJSON dataset. Load into Amazon Location Service.
- Park content: Web scraper → S3 → Bedrock Knowledge Base. Scrape parks.ca.gov park pages, store as structured JSON in S3, index with Bedrock.
- Map tiles: Mapbox. Offline tile packs downloadable per park before visiting.

---

## 5. Architecture Flow

### Online flow — AI ranger tip delivery
1. User enters park boundary
2. Amazon Location Service geofence fires
3. EventBridge routes the event
4. Lambda fetches park context from Bedrock Knowledge Base
5. Bedrock (Claude) generates location-aware tips
6. SNS → Expo Push API delivers notification to device

### Offline flow
1. On app open with connection: Amplify DataStore syncs park data, AI tip cache, and map tiles to device
2. User goes offline in park
3. App reads from local SQLite (park info, cached tips)
4. expo-location still tracks GPS
5. Pre-generated tips fire as local notifications based on GPS crossing stored park zone boundaries
6. Trail breadcrumbs saved locally and sync when connection returns

### Chatbot flow
1. User types message or sends photo to PeterParker
2. App sends message + current GPS coordinates + park ID to Lambda via API Gateway
3. Lambda queries Bedrock Knowledge Base with park context
4. Bedrock returns tip or answer
5. Response shown in chat UI and cached locally

---

## 6. Offline Mode Strategy

This is a core requirement since most CA State Parks have no wifi or cell coverage.

What gets cached on device before visiting:
- Full park list and detail pages (all parks, ~280 total)
- AI-generated tip sets per park (safety, wildlife, behavior, sightseeing)
- Map tiles for selected parks via Mapbox offline packs
- Park boundary polygons for local geofence detection

How offline geofencing works:
- Park zone boundaries stored locally as GeoJSON
- expo-location monitors GPS in background
- App checks GPS against local boundary polygons
- On zone entry, fires local notification with pre-cached tip
- No network required

Sync strategy:
- Amplify DataStore handles delta sync when connection available
- Last-write-wins conflict resolution
- Trail data queued locally and uploaded on reconnect

---

## 7. Environment Setup — Step by Step

### Everyone (Mac and Windows)

Step 1: Install Node.js 20 LTS from nodejs.org

Step 2: Install Expo CLI
```
npm install -g expo-cli eas-cli
```

Step 3: Install the Expo Go app on your phone from the App Store or Google Play

Step 4: Clone the repo and install dependencies
```
git clone <repo-url>
cd peterparker
npm install
```

Step 5: Copy the env file and fill in keys (team shares via private Slack/Discord)
```
cp .env.example .env.local
```

Step 6: Start the dev server
```
npx expo start
```
Scan the QR code with Expo Go on your phone. Done.

### Mac teammates — iOS simulator

Install Xcode from the App Store (this takes a while, do it first).
Then run:
```
npx expo start --ios
```

### Windows teammates — Android emulator

Install Android Studio from developer.android.com/studio.
Create a virtual device (Pixel 7, API 34).
Then run:
```
npx expo start --android
```

### AWS backend setup

Step 1: Install AWS CLI and CDK
```
npm install -g aws-cdk
aws configure
```

Step 2: Bootstrap CDK in your AWS account
```
cdk bootstrap
```

Step 3: Deploy all backend infra
```
cd infra
cdk deploy --all
```

This provisions: Lambda functions, API Gateway, DynamoDB table, Cognito user pool, Bedrock Knowledge Base, Amazon Location Service geofences, EventBridge rules, SNS topic.

Step 4: Run the park data scraper to populate the knowledge base
```
cd scripts
npm run scrape-parks
npm run index-bedrock
```

Step 5: Copy the output API Gateway URL and Cognito pool ID into your .env.local

---

## 8. Required Environment Variables

```
EXPO_PUBLIC_API_URL=https://<api-gateway-id>.execute-api.us-east-1.amazonaws.com/prod
EXPO_PUBLIC_COGNITO_POOL_ID=us-east-1_xxxxxxxx
EXPO_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxxx
AWS_REGION=us-east-1
BEDROCK_KNOWLEDGE_BASE_ID=xxxxxxxxxx
DYNAMODB_TABLE_NAME=peterparker-parks
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:xxxx:peterparker-tips
LOCATION_COLLECTION_NAME=peterparker-geofences
```

---

## 9. Security

- All AWS credentials stay server-side in Lambda. Never in the app bundle.
- App uses Cognito anonymous guest tokens to call API Gateway. No login required.
- API Gateway authorizer validates Cognito token on every request.
- Bedrock and DynamoDB are not publicly accessible — Lambda is the only caller.
- Expo public env vars (prefixed EXPO_PUBLIC_) are safe to expose. Only put non-secret config there.
- Map tiles use a Mapbox token scoped to read-only, URL-restricted to your app's bundle ID.
- For hackathon: keep AWS account MFA on. Do not commit .env.local to git. Add it to .gitignore immediately.

---

## 10. 24-Hour Build Plan

### Hours 0–4: Setup
- All 4 teammates run environment setup above
- Deploy AWS backend with CDK
- Run park scraper and confirm Bedrock knowledge base is populated
- Get a hello world app running on all 4 devices via Expo Go

### Hours 4–12: MVP features
- Park list screen with search (read from local cache)
- Park detail screen (name, hours, fees, rules, map)
- Basic map with user location dot
- PeterParker chat UI connected to Bedrock via Lambda

### Hours 12–20: Core features
- Trail tracker with GPS breadcrumb line on map
- Offline mode: Amplify DataStore sync + local tip cache
- Push notifications via SNS + Expo for park entry

### Hours 20–24: Polish and demo prep
- Stretch features if time: photo input to chatbot
- Fix bugs, test on all 4 devices
- Publish to Expo EAS, generate QR code for judges
- Prepare 2-minute demo script

---

## 11. Risks and Mitigations

Risk: Bedrock knowledge base takes too long to set up
Mitigation: Fall back to hardcoding 5–10 parks with manually written tip JSON. AI chatbot still works via direct Bedrock prompt without RAG.

Risk: Offline geofencing is complex to implement in time
Mitigation: Ship online geofencing first (Amazon Location Service). Offline version is stretch.

Risk: Windows teammates hit Expo build issues
Mitigation: Physical Android device + Expo Go is the fastest path. Avoid emulator if it causes friction.

Risk: Mapbox offline tiles are slow to implement
Mitigation: Ship online maps first. Cache tiles as stretch goal. The app still works without offline maps.

Risk: AWS costs spike during hackathon
Mitigation: Set AWS billing alert at $20. Lambda + Bedrock pay-per-use is very cheap at hackathon scale.

---

## 12. Key Links

- CA State Parks boundary dataset: https://www.parks.ca.gov/?page_id=29682
- Expo docs: https://docs.expo.dev
- AWS Bedrock docs: https://docs.aws.amazon.com/bedrock
- AWS Amplify DataStore: https://docs.amplify.aws/lib/datastore/getting-started
- Amazon Location Service: https://docs.aws.amazon.com/location
- NPS app (reference UI): https://apps.apple.com/us/app/national-park-service/id1549226484
- Mapbox offline maps: https://docs.mapbox.com/ios/maps/guides/offline
