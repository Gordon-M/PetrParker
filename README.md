# AI Park Ranger

Product name: `PeterParker`

Tagline: `Park Ranger in Your Pocket`

This project folder holds a simple MVP plan for a mobile app that uses a person's location to surface nearby park guidance: safety warnings, behavior tips, and sightseeing highlights.

## MVP Summary

The first version should do one thing well: when a user opens the app near a small set of seeded parks or beaches, it detects the current zone, shows a few curated recommendations, and lets the user ask `PeterParker` follow-up questions or upload a photo for clarification.

## Recommended Stack

- Mobile app: `Expo`, `React Native`, `TypeScript`, `Expo Router`
- Device APIs: `expo-location`, `expo-notifications`, `expo-image-picker`
- Backend: `Supabase Postgres`, `Supabase Storage`, `Supabase Edge Functions`
- AI: `OpenAI Responses API` for chat and image follow-up
- Data fetching: `@tanstack/react-query`
- Local UI state: `zustand`
- Validation: `zod`

## Project Structure

- `docs/mvp-plan.md`: product scope, architecture, dependencies, and build order
- `apps/mobile`: planned Expo app
- `supabase`: planned database migrations, seed data, and edge functions

## Scope Guardrails

- Start with `3-5` curated locations, not every park
- Use foreground location checks first; full background tracking is post-MVP
- Keep alert data curated and source-tagged
- Do not let the assistant invent wildlife or safety advice outside the current zone context

## Next Build Step

Read [`docs/mvp-plan.md`](./docs/mvp-plan.md), then scaffold the Expo app in `apps/mobile` and seed the first demo locations in Supabase.
