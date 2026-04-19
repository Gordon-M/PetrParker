import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';
import { geofenceHandler } from './functions/geofence-handler/resource';
import { CfnGeofenceCollection, CfnTracker } from 'aws-cdk-lib/aws-location';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  data,
  geofenceHandler,
});

const geoStack = backend.createStack('GeoStack');

// 1. Create the Geofence Collection
const collection = new CfnGeofenceCollection(geoStack, 'ParkCollection', {
  collectionName: 'CaliforniaStateParkZones',
});

// 2. Create the Tracker
const tracker = new CfnTracker(geoStack, 'ParkTracker', {
  trackerName: 'CAParkTracker',
});

// 3. Connect EventBridge to your AI Lambda
const rule = new Rule(geoStack, 'GeofenceRule', {
  eventPattern: {
    source: ['aws.geo'],
    detailType: ['Location Geofence Event'],
    detail: {
      CollectionName: [collection.collectionName],
      EventType: ['ENTER'],
    },
  },
});

rule.addTarget(new LambdaFunction(backend.geofenceHandler.resources.lambda));

// 4. Grant Lambda permission to use Bedrock
backend.geofenceHandler.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeModel'],
    resources: ['arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0'],
  })
);