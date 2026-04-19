import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, SafeAreaView } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';

export default function HomeScreen() {
  const mapRef = useRef<MapView>(null);
  
  // Receive the dynamic data from the Search page
  const { name, lat, lng, distance } = useLocalSearchParams<{ 
    name?: string; 
    lat?: string; 
    lng?: string; 
    distance?: string 
  }>();

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission denied');
        return;
      }
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  // IMPORTANT: This moves the map whenever new park params arrive
  useEffect(() => {
    if (lat && lng && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  }, [lat, lng]);

  if (!location && !errorMsg) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2D5A27" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBox}>
        {/* Shows the searched park name OR the default app name */}
        <Text style={styles.headerText}>{name || 'PetrParks'}</Text>
        {distance && (
          <Text style={styles.distSubtext}>{distance} mi away</Text>
        )}
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          showsUserLocation={true}
          initialRegion={{
            latitude: location?.coords.latitude || 36.7783,
            longitude: location?.coords.longitude || -119.4179,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {/* Drops a marker on the searched park */}
          {lat && lng && (
            <Marker 
              coordinate={{ latitude: parseFloat(lat), longitude: parseFloat(lng) }}
              title={name}
              pinColor="#2D5A27"
            />
          )}
        </MapView>
      </View>

      <View style={styles.contentArea}>
        <Text style={styles.subText}>
          {name ? `Now viewing ${name}` : "Find your next adventure in CA State Parks."}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  headerBox: {
    marginTop: 20,
    marginHorizontal: 25,
    marginBottom: 20,
    backgroundColor: '#FFF',
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#2D5A27',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    alignItems: 'center',
  },
  headerText: { fontSize: 22, fontWeight: 'bold', color: '#2D5A27' },
  distSubtext: { fontSize: 14, color: '#666', marginTop: 2, fontWeight: '600' },
  mapContainer: {
    width: '85%',
    height: 400,
    alignSelf: 'center',
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#2D5A27',
  },
  map: { width: '100%', height: '100%' },
  contentArea: { marginTop: 20, alignItems: 'center' },
  subText: { color: '#666', fontStyle: 'italic' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});