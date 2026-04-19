import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, ActivityIndicator, SafeAreaView } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

export default function HomeScreen() {
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

  if (!location && !errorMsg) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2D5A27" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. Title Box */}
      <View style={styles.headerBox}>
        <Text style={styles.headerText}>PetrParks</Text>
      </View>

      {/* 2. Constrained Map Box */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          showsUserLocation={true}
          initialRegion={{
            latitude: location?.coords.latitude || 36.7783,
            longitude: location?.coords.longitude || -119.4179,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        />
      </View>

      {/* Placeholder for other UI elements */}
      <View style={styles.contentArea}>
        <Text style={styles.subText}>Find your next adventure in CA State Parks.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  headerBox: {
    marginTop: 20,
    marginHorizontal: 25, // Keeps title box aligned with map
    marginBottom: 20,
    backgroundColor: '#FFF',
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#2D5A27',
    // Shadow
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D5A27',
    textAlign: 'center',
  },
  mapContainer: {
    width: '85%',            // Constrains width to 85% of screen
    height: 400,             // Fixed height so it doesn't fill screen
    alignSelf: 'center',     // Centers the map horizontally
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#2D5A27',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  contentArea: {
    marginTop: 20,
    alignItems: 'center',
  },
  subText: {
    color: '#666',
    fontStyle: 'italic',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});