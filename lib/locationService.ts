import {
    LocationClient,
    BatchUpdateDevicePositionCommand,
    GetDevicePositionCommand,
} from "@aws-sdk/client-location";
import { fetchAuthSession } from 'aws-amplify/auth';

export const sendLocationToAWS = async (latitude: number, longitude: number, deviceId: string) => {
    const session = await fetchAuthSession();
    console.log("🔐 AWS Auth Session:", session);
    if (!session.credentials) {
        throw new Error("❌ No AWS credentials available");
    }

    const client = new LocationClient({
        region: "us-west-2",
        credentials: session.credentials,
    });

    const command = new BatchUpdateDevicePositionCommand({
        TrackerName: "CAParkTracker",
        Updates: [
        {
            DeviceId: deviceId,
            // CRITICAL: Amazon Location Service requires [Longitude, Latitude]
            // Position: [longitude, latitude], 
            Position:  [-122.2206, 37.1726], // big basin redwoods SP area
            SampleTime: new Date(),
        },
        ],
    });

    try {
        const data = await client.send(command);
        console.log("📍 Location synced to AWS Tracker:", data);

        // Independent tracker health check: read back latest device position
        const readBack = await client.send(
            new GetDevicePositionCommand({
                TrackerName: "CAParkTracker",
                DeviceId: deviceId,
            })
        );
        console.log("✅ Tracker read-back position:", readBack.Position, "sampleTime:", readBack.SampleTime);
    } catch (error) {
        console.error("❌ Error syncing to AWS:", error);
    }
};