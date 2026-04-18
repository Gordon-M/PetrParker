# PeterParker MVP Plan

## Product Goal

Build a very simple mobile app that feels like a trusted ranger in your pocket. The app should use the user's location to show:

- safety recommendations
- behavior recommendations
- nearby things worth noticing

If the user is unsure about a recommendation, they can ask `PeterParker` a follow-up question or upload a picture and ask, "Is this what you were talking about?"

## Sharp MVP Scope

Ship this:

1. Detect the user's location while the app is open.
2. Match the user to one seeded zone using `lat/lng + radius`.
3. Show active recommendation cards in three buckets:
   - `Safety`
   - `Behavior`
   - `Look Out For`
4. Let the user tap into a simple `PeterParker` chat about the current zone.
5. Let the user take or upload one photo to ask for clarification.
6. Save alerts, sightings, and photos in Supabase.
7. Show a local notification when the app detects a new nearby zone while the app is active.

Do not ship in MVP:

- nationwide park coverage
- background tracking when the app is closed
- live ingestion from NOAA, NPS, or state agencies
- user accounts, social features, or moderation tools
- on-device species identification
- offline maps

## Why This Scope

The risky part of this idea is trust, not UI polish. A tiny curated launch is safer and easier to validate:

- seed only a few high-interest areas
- make the alert cards curated and human-readable
- constrain the AI assistant to the active zone context
- treat image upload as clarification, not guaranteed identification

## Recommended Tech Stack

| Area | Choice | Reason |
| --- | --- | --- |
| Mobile app | `Expo` + `React Native` + `TypeScript` | Fastest way to ship a cross-platform mobile MVP with strong location, notification, and media support |
| Navigation | `expo-router` | File-based routing and standard Expo setup |
| Location | `expo-location` | Foreground location polling and optional geofencing later |
| Notifications | `expo-notifications` | Local notifications and future push support |
| Photos | `expo-image-picker` | Lets users upload or take a picture with minimal setup |
| Backend | `Supabase` | Simple Postgres + Storage + auth option + edge functions in one service |
| AI server layer | `Supabase Edge Functions` | Keeps OpenAI keys off the device and is enough for simple orchestration |
| Chat + vision | `OpenAI Responses API` | One API for text follow-up and image-based clarification |
| Server state | `@tanstack/react-query` | Clean caching and async state handling |
| Client state | `zustand` | Lightweight store for active zone, filters, and notification state |
| Validation | `zod` | Shared request/response validation for app and functions |
| Testing | `jest-expo` + `@testing-library/react-native` | Standard Expo-friendly test setup |

## MVP User Flows

### 1. Nearby recommendations

1. User opens the app.
2. App asks for location permission.
3. App checks current coordinates.
4. Backend returns the best matching seeded zone and its active alerts.
5. UI shows cards grouped by category and severity.

### 2. Ask PeterParker

1. User taps `Ask PeterParker`.
2. App sends current zone metadata plus current alerts to an edge function.
3. Edge function calls OpenAI with strict instructions:
   - answer only from the current zone context and general safety guidance
   - say when uncertain
   - never encourage touching wildlife or plants
4. Response streams back into the chat screen.

### 3. Photo clarification

1. User uploads or takes a photo.
2. App stores the image in Supabase Storage.
3. App calls the assistant edge function with:
   - image URL
   - current zone alerts
   - user question
4. Assistant answers with a confidence-aware clarification.
5. If uncertain, it tells the user not to touch the item and to consult local signage or staff.

## Data Model

Use a very small schema:

### `zones`

- `id`
- `slug`
- `name`
- `type` (`park`, `beach`, `trail`, `wetland`)
- `latitude`
- `longitude`
- `radius_meters`
- `region_label`
- `is_active`

### `alerts`

- `id`
- `zone_id`
- `category` (`safety`, `behavior`, `sightseeing`)
- `title`
- `body`
- `severity` (`info`, `warning`, `danger`)
- `source_label`
- `source_url`
- `starts_at`
- `ends_at`
- `image_hint_url` nullable

### `photo_questions`

- `id`
- `zone_id`
- `image_path`
- `user_question`
- `assistant_answer`
- `created_at`

### `chat_messages` (optional for MVP)

- `id`
- `zone_id`
- `role`
- `content`
- `created_at`

For the first pass, `chat_messages` can be skipped and chat can stay ephemeral on the device.

## API / Function Design

Keep the backend surface small.

### `nearby-alerts`

Input:

- `latitude`
- `longitude`

Output:

- matched zone
- active alerts grouped by category
- last updated timestamp

Implementation:

- simple SQL or Postgres function that finds the nearest zone whose radius contains the user

### `park-ranger-assistant`

Input:

- `zone`
- `active alerts`
- `question`
- optional `image_url`

Output:

- assistant reply
- optional `follow_up_prompt`
- optional `uncertainty_flag`

Implementation:

- Supabase Edge Function
- OpenAI call happens only on the server
- validate inputs with `zod`

## Dependency Plan

App runtime dependencies:

- `expo`
- `react`
- `react-native`
- `expo-router`
- `expo-location`
- `expo-notifications`
- `expo-image-picker`
- `@supabase/supabase-js`
- `react-native-url-polyfill`
- `expo-sqlite`
- `@tanstack/react-query`
- `zustand`
- `zod`

Developer dependencies:

- `typescript`
- `eslint`
- `prettier`
- `jest-expo`
- `@testing-library/react-native`

## Development Note

Start the UI and foreground location flow in `Expo Go`, but switch to a development build before testing anything that depends on native notification or background location behavior more deeply.

## Folder Structure

```text
ai-park-ranger/
  apps/
    mobile/
  docs/
    mvp-plan.md
  supabase/
    migrations/
    seed.sql
    functions/
      nearby-alerts/
      park-ranger-assistant/
```

## Build Order

### Phase 1: foundation

1. Scaffold Expo app in `apps/mobile`.
2. Create Supabase project and local `supabase/` folder.
3. Add the schema for `zones`, `alerts`, and `photo_questions`.
4. Seed `3-5` demo zones with believable sample content.

### Phase 2: core location experience

1. Request location permission.
2. Fetch current coordinates.
3. Call `nearby-alerts`.
4. Render grouped alert cards.
5. Add manual refresh and basic loading/error states.

### Phase 3: assistant

1. Add `Ask PeterParker` chat screen.
2. Add photo picker flow.
3. Build `park-ranger-assistant` edge function.
4. Add clear safety fallback copy for uncertain answers.

### Phase 4: notifications and polish

1. Trigger a local notification when a new zone is detected while app is active.
2. Add zone header, severity badges, and empty states.
3. Test on a real phone with seeded locations.
4. Prepare a simple internal demo build.

## Seed Content Plan

Use a small, hand-written seed set. Example categories:

- beach with algae warning, whale-watching note, shell collection behavior rule
- wetland with nesting bird warning, stay-on-path rule, rare plant sighting
- park with poison oak warning, don't feed geese rule, seasonal wildflowers

This is better than scraping noisy external sources in the first version.

## Safety Rules

The assistant must:

- prefer caution over confidence
- clearly say when it is uncertain
- avoid definitive identification claims for dangerous plants or animals
- never tell users to touch, move, or feed wildlife
- remind users to defer to posted signage, ranger instructions, or emergency services when risk is high

## Definition Of Done

The MVP is good enough when:

1. A user standing inside a seeded zone can open the app and see relevant cards in under `3` taps.
2. The app can answer a follow-up question about those cards.
3. The user can upload a photo and get a context-aware clarification.
4. The app behaves safely when uncertain.
5. One tester can install the app and demo the full flow on a phone.

## Suggested 1-Week MVP Schedule

- Day 1: scaffold app, set up Supabase, define schema
- Day 2: seed demo zones and build nearby alert lookup
- Day 3: build alert cards and refresh flow
- Day 4: build chat experience
- Day 5: build photo upload + AI clarification
- Day 6: add notifications and polish
- Day 7: device testing and demo prep

## Post-MVP Upgrades

- background geofencing
- official data ingestion from park agencies
- better trust signals with citations on every alert
- saved trips and favorites
- multilingual guidance
- offline cached alerts for known zones
