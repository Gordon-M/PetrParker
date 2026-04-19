import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  RangerAlert: a
    .model({
      parkName: a.string().required(),
      geofenceId: a.string(),
      title: a.string().required(),
      detail: a.string().required(),
      alertType: a.string().required(),
      source: a.string().required(),
    })
    .authorization((allow) => [allow.guest()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
  },
});
