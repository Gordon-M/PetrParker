import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { sendLocationToAWS } from '../lib/locationService';

export const useLocationTracker = (deviceId: string) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      // 1. Request Permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      // 2. Watch position (fires every time the user moves significantly)
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Update every 10 meters
          timeInterval: 30000,  // Or every 30 seconds
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          sendLocationToAWS(latitude, longitude, deviceId);
        }
      );
    };

    startTracking();

    // 3. Cleanup on unmount
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [deviceId]);

  return { errorMsg };
};