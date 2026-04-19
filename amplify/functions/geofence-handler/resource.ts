import { defineFunction } from "@aws-amplify/backend";

export const geofenceHandler = defineFunction({
  name: "geofence-handler",
  entry: "./handler.ts",
  environment: {
    JORDAN_AWS_ACCESS_KEY_ID: process.env.JORDAN_AWS_ACCESS_KEY_ID || "",
    JORDAN_AWS_SECRET_ACCESS_KEY: process.env.JORDAN_AWS_SECRET_ACCESS_KEY || "",
    KB_ID: "CVG6L7VSH0",
  },
});
