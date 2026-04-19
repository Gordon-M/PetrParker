import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Feather from '@expo/vector-icons/Feather';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CA_STATE_PARKS, Park, getDistanceMiles } from '@/constants/parks';
import { getParkInfo, ParkInfo, getBedrockDebugInfo } from '@/services/bedrock';
import { usePark } from '@/store/ParkContent';

const RANGER_GREEN = '#2D5A27';

type SortType = 'distance' | 'alphabetical';

interface ParkWithDistance extends Park {
  distance: number | null;
}

export default function Search() {
  const router = useRouter();
  const { setSelectedPark } = usePark();
  const isDark = useColorScheme() === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('distance');
  const [isAscending, setIsAscending] = useState(true);
  const [activePark, setActivePark] = useState<ParkWithDistance | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [parkInfo, setParkInfo] = useState<ParkInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({}).then((loc) => {
          setUserLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
        });
      }
    });
  }, []);

  const parksWithDistance = useMemo<ParkWithDistance[]>(() => {
    return CA_STATE_PARKS.map((park) => ({
      ...park,
      distance: userLocation
        ? Math.round(getDistanceMiles(userLocation.lat, userLocation.lon, park.lat, park.lon))
        : null,
    }));
  }, [userLocation]);

  const filteredParks = useMemo(() => {
    let result = parksWithDistance.filter((park) =>
      park.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      park.region.toLowerCase().includes(searchQuery.toLowerCase())
    );
    result.sort((a, b) => {
      if (sortBy === 'distance') {
        const ad = a.distance ?? 99999;
        const bd = b.distance ?? 99999;
        return isAscending ? ad - bd : bd - ad;
      }
      return isAscending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    });
    return result;
  }, [parksWithDistance, searchQuery, sortBy, isAscending]);

  const openParkDetail = useCallback(async (park: ParkWithDistance) => {
    setActivePark(park);
    setParkInfo(null);
    setModalVisible(true);
    setLoadingInfo(true);
    console.log('[Bedrock]', getBedrockDebugInfo());
    try {
      const info = await getParkInfo(park.name);
      setParkInfo(info);
    } catch (err) {
      console.error('[Bedrock] Error:', err);
      setParkInfo(null);
    } finally {
      setLoadingInfo(false);
    }
  }, []);

  const handleViewOnMap = useCallback(() => {
    if (!activePark) return;
    setSelectedPark({ name: activePark.name, lat: activePark.lat, lng: activePark.lon, distance: activePark.distance ?? undefined });
    setModalVisible(false);
    router.push('/');
  }, [activePark, setSelectedPark, router]);

  const renderParkItem = ({ item }: { item: ParkWithDistance }) => (
    <TouchableOpacity
      onPress={() => openParkDetail(item)}
      style={[styles.parkCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.parkName, { color: isDark ? '#FFF' : '#000' }]}>{item.name}</Text>
        <Text style={styles.parkMeta}>{item.region} • {item.type}</Text>
        {item.distance !== null && (
          <Text style={styles.parkDistance}>{item.distance} mi away</Text>
        )}
      </View>
      <Feather name="chevron-right" size={20} color="#8E8E93" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#F9F9F9' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#FFF' : RANGER_GREEN }]}>Find a Park</Text>
        <View style={[styles.searchBar, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
          <Feather name="search" size={18} color="#8E8E93" />
          <TextInput
            placeholder="Search parks or regions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
            style={[styles.searchInput, { color: isDark ? '#FFF' : '#000' }]}
          />
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => { setSortBy('distance'); setIsAscending(true); }}
            style={[styles.filterBtn, sortBy === 'distance' && styles.activeFilter]}
          >
            <Text style={[styles.filterText, sortBy === 'distance' && { color: '#FFF' }]}>Nearest</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setSortBy('alphabetical'); setIsAscending(true); }}
            style={[styles.filterBtn, sortBy === 'alphabetical' && styles.activeFilter]}
          >
            <Text style={[styles.filterText, sortBy === 'alphabetical' && { color: '#FFF' }]}>A–Z</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredParks}
        renderItem={renderParkItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', flex: 1 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalParkName, { color: isDark ? '#FFF' : '#000' }]}>{activePark?.name}</Text>
                <Text style={styles.modalParkMeta}>{activePark?.region} • {activePark?.type}</Text>
                {activePark?.distance !== null && (
                  <Text style={styles.modalParkMeta}>{activePark?.distance} mi away</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {loadingInfo ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={RANGER_GREEN} />
                <Text style={[styles.loadingText, { color: isDark ? '#CCC' : '#555' }]}>
                  Getting park info from AI...
                </Text>
              </View>
            ) : parkInfo ? (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.infoScroll}>
                <InfoSection title="About" icon="info" color="#007AFF" isDark={isDark}>
                  <Text style={[styles.infoText, { color: isDark ? '#CCC' : '#333' }]}>{parkInfo.description}</Text>
                </InfoSection>

                <View style={styles.rowSections}>
                  <InfoPill label="Hours" value={parkInfo.hours} isDark={isDark} />
                  <InfoPill label="Fees" value={parkInfo.fees} isDark={isDark} />
                </View>

                <InfoSection title="Things To Do" icon="map-pin" color={RANGER_GREEN} isDark={isDark}>
                  {parkInfo.thingsToDo.map((item, i) => (
                    <Text key={i} style={[styles.bulletItem, { color: isDark ? '#CCC' : '#333' }]}>• {item}</Text>
                  ))}
                </InfoSection>

                <InfoSection title="Safety Tips" icon="alert-triangle" color="#FF9500" isDark={isDark}>
                  {parkInfo.safetyTips.map((tip, i) => (
                    <Text key={i} style={[styles.bulletItem, { color: isDark ? '#CCC' : '#333' }]}>• {tip}</Text>
                  ))}
                </InfoSection>

                <InfoSection title="Wildlife" icon="eye" color="#34C759" isDark={isDark}>
                  <Text style={[styles.infoText, { color: isDark ? '#CCC' : '#333' }]}>{parkInfo.wildlife}</Text>
                </InfoSection>

                <InfoSection title="Best Season" icon="sun" color="#FF6B35" isDark={isDark}>
                  <Text style={[styles.infoText, { color: isDark ? '#CCC' : '#333' }]}>{parkInfo.bestSeason}</Text>
                </InfoSection>

                <TouchableOpacity style={styles.mapBtn} onPress={handleViewOnMap}>
                  <Feather name="map-pin" size={18} color="#FFF" />
                  <Text style={styles.mapBtnText}>View on Map</Text>
                </TouchableOpacity>

                <View style={{ height: 30 }} />
              </ScrollView>
            ) : (
              <View style={styles.loadingContainer}>
                <Feather name="alert-circle" size={40} color="#8E8E93" />
                <Text style={[styles.loadingText, { color: isDark ? '#CCC' : '#555' }]}>
                  Could not load park info
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function InfoSection({ title, icon, color, isDark, children }: {
  title: string; icon: string; color: string; isDark: boolean; children: React.ReactNode;
}) {
  return (
    <View style={styles.infoSection}>
      <View style={styles.sectionHeader}>
        <Feather name={icon as any} size={16} color={color} />
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#000' }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoPill({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <View style={[styles.pill, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', flex: 1 }]}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={[styles.pillValue, { color: isDark ? '#FFF' : '#000' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 15, gap: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  searchInput: { flex: 1, fontSize: 16 },
  filterRow: { flexDirection: 'row', gap: 10, marginTop: 15, marginBottom: 10 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: RANGER_GREEN },
  activeFilter: { backgroundColor: RANGER_GREEN },
  filterText: { fontSize: 14, color: RANGER_GREEN, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 180 },
  parkCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  parkName: { fontSize: 16, fontWeight: '700' },
  parkMeta: { color: '#8E8E93', marginTop: 2, fontSize: 13 },
  parkDistance: { color: RANGER_GREEN, marginTop: 4, fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '90%', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  modalParkName: { fontSize: 22, fontWeight: '800' },
  modalParkMeta: { color: '#8E8E93', marginTop: 3, fontSize: 14 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 16, textAlign: 'center' },
  infoScroll: { flex: 1, flexGrow: 1 },
  infoSection: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  infoText: { fontSize: 15, lineHeight: 22 },
  bulletItem: { fontSize: 15, lineHeight: 24 },
  rowSections: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  pill: { padding: 14, borderRadius: 16, gap: 4 },
  pillLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, color: '#8E8E93' },
  pillValue: { fontSize: 14, fontWeight: '600' },
  mapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: RANGER_GREEN, padding: 16, borderRadius: 16, marginTop: 8 },
  mapBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
