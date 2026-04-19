import { defineFunction } from '@aws-amplify/backend';

export const geofenceHandler = defineFunction({
  name: 'geofence-handler',
  entry: './handler.ts',
});