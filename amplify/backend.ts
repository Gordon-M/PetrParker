import { defineBackend } from '@aws-amplify/backend';
import { geofenceHandler } from './functions/geofence-handler/resource';
import { CfnTracker, CfnTrackerConsumer } from 'aws-cdk-lib/aws-location';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * @section 1: Core Amplify Setup
 * This initializes the backend and registers your Lambda function.
 */
const backend = defineBackend({
  geofenceHandler, 
});

/**
 * @section 2: The GeoStack (The Custom Infrastructure)
 * Amplify Gen 2 allows us to tap into the "CDK" (Cloud Development Kit).
 * We create a "Stack" to hold resources that aren't part of standard Amplify.
 */
const geoStack = backend.createStack('GeoStack');

// The name of the collection you already made in the AWS Console
const EXISTING_COLLECTION_NAME = 'CaliforniaStateParkBoundaries'; 

/**
 * @section 3: The Tracker
 * Think of this as the "GPS Receiver." It receives coordinates from your phone.
 */
const tracker = new CfnTracker(geoStack, 'ParkTracker', {
  trackerName: 'CAParkTracker',
});

/**
 * @section 4: The Link (The "Glue")
 * This is the most critical part. It tells the Tracker: 
 * "Whenever you get a GPS point, check it against the Park Collection."
 */
new CfnTrackerConsumer(geoStack, 'TrackerLink', {
  trackerName: tracker.trackerName,
  consumerArn: `arn:aws:geo:${geoStack.region}:${geoStack.account}:geofence-collection/${EXISTING_COLLECTION_NAME}`
});

/**
 * @section 5: The EventBridge Rule (The "Trigger")
 * This watches for a specific event: A device ENTERING a geofence.
 */
const geofenceRule = new Rule(geoStack, 'GeofenceRule', {
  eventPattern: {
    source: ['aws.geo'],
    detailType: ['Location Geofence Event'],
    detail: {
      CollectionName: [EXISTING_COLLECTION_NAME],
      EventType: ['ENTER'], 
    },
  },
});

/**
 * @section 6: The Target
 * This tells the Rule: "When you see an ENTER event, wake up the AI Lambda."
 */
geofenceRule.addTarget(new LambdaFunction(backend.geofenceHandler.resources.lambda));

/**
 * @section 7: AI Permissions
 * By default, your Lambda is locked. This gives it the "Key" to talk to Bedrock.
 */
backend.geofenceHandler.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeModel', 'bedrock:RetrieveAndGenerate'],
    resources: ['*'], // In a hackathon, '*' allows access to all models/KBs
  })
);