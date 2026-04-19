import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, SafeAreaView, Image, ScrollView, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { usePark } from '@/store/ParkContent';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

const RANGER_GREEN = '#2D5A27';
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const mapRef = useRef<MapView>(null);
  const { selectedPark } = usePark();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ParkRanger = require('@/assets/images/park_ranger.png');

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

  if (!location && !errorMsg) return <ActivityIndicator style={{ flex: 1 }} color={RANGER_GREEN} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={styles.header}>
          <Text style={styles.brandTitle}>Petr Parker</Text>
          <Text style={styles.tagline}>Ranger in your pocket</Text>
          <View style={styles.locationSubHeader}>
            <MaterialCommunityIcons name="map-marker-radius" size={18} color={RANGER_GREEN} />
            <Text style={styles.headerText}>{selectedPark?.name || 'Exploring California'}</Text>
          </View>
        </View>

        <View style={styles.mapWrapper}>
          <View style={styles.decorationLeft}>
            <FontAwesome5 name="tree" size={40} color="#1B3B18" style={styles.iconShadow} />
          </View>
          <View style={styles.decorationRightTop}>
            <MaterialCommunityIcons name="image-filter-hdr" size={50} color="#A0A0A0" style={styles.iconShadow} />
          </View>

          <View style={styles.mapContainer}>
            {location ? (
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
                    pinColor={RANGER_GREEN}
                  />
                )}
              </MapView>
            ) : (
              <View style={[styles.map, styles.mapError]}>
                <Text style={{ color: '#888' }}>{errorMsg || 'Location unavailable'}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.imageSection}>
          <Image source={ParkRanger} style={styles.bottomImage} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFDFD' },
  scrollContent: { paddingBottom: 60 },
  header: { alignItems: 'center', marginTop: 30, paddingHorizontal: 25 },
  brandTitle: { fontSize: 38, fontWeight: '900', color: RANGER_GREEN, letterSpacing: -1, marginBottom: 0 },
  tagline: { fontSize: 16, fontWeight: '500', color: '#8E8E93', marginTop: -4, fontStyle: 'italic' },
  locationSubHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 5 },
  headerText: { fontSize: 18, fontWeight: '700', color: '#444' },
  mapWrapper: { alignSelf: 'center', marginTop: 30, position: 'relative', width: width * 0.9, padding: 10 },
  mapContainer: {
    width: '100%', height: 380, borderRadius: 35, overflow: 'hidden',
    borderWidth: 6, borderColor: '#FFF',
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 15,
  },
  map: { width: '100%', height: '100%' },
  mapError: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F0' },
  decorationLeft: { position: 'absolute', left: -5, bottom: 20, zIndex: 10 },
  decorationRightTop: { position: 'absolute', right: -10, top: -5, zIndex: 10 },
  iconShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  imageSection: { marginTop: 10, marginHorizontal: 25 },
  bottomImage: { width: '100%', height: 180, borderRadius: 25, backgroundColor: '#EEE' },
});
