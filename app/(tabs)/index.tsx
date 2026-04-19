import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, SafeAreaView } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission denied');
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({});
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
      <View style={styles.headerBox}>
        <Text style={styles.headerText}>PetrParks</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          showsUserLocation
          initialRegion={{
            latitude: location?.coords.latitude || 36.7783,
            longitude: location?.coords.longitude || -119.4179,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        />
      </View>

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
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D5A27',
    textAlign: 'center',
  },
  mapContainer: {
    width: '85%',
    height: 400,
    alignSelf: 'center',
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
