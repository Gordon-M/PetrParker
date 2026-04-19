import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, SafeAreaView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { usePark } from '@/store/ParkContent';

export default function HomeScreen() {
  const mapRef = useRef<MapView>(null);
  const { selectedPark } = usePark();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedPark && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: selectedPark.lat,
        longitude: selectedPark.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  }, [selectedPark]);

  if (!location) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.headerText}>{selectedPark?.name || 'PetrParks'}</Text>
      </View>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          showsUserLocation={true}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {selectedPark && (
            <Marker
              coordinate={{ latitude: selectedPark.lat, longitude: selectedPark.lng }}
              title={selectedPark.name}
            />
          )}
        </MapView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  headerBox: { marginTop: 20, marginHorizontal: 25, padding: 15, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 3, borderColor: '#2D5A27', alignItems: 'center' },
  headerText: { fontSize: 22, fontWeight: 'bold', color: '#2D5A27' },
  mapContainer: { width: '85%', height: 400, alignSelf: 'center', marginTop: 20, borderRadius: 25, overflow: 'hidden', borderWidth: 3, borderColor: '#2D5A27' },
  map: { width: '100%', height: '100%' },
});
