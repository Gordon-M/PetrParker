import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router'; 
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

const RANGER_GREEN = '#2D5A27';

const PARKS_DATA = [
  { id: '1', name: 'Yosemite', location: 'California', distance: 12 },
  { id: '2', name: 'Zion', location: 'Utah', distance: 150 },
  { id: '3', name: 'Glacier', location: 'Montana', distance: 600 },
  { id: '4', name: 'Yellowstone', location: 'Wyoming', distance: 850 },
  { id: '5', name: 'Acadia', location: 'Maine', distance: 2100 },
];

type SortType = 'distance' | 'alphabetical';

export default function Search() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('distance');
  const [isAscending, setIsAscending] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredParks = useMemo(() => {
    let result = PARKS_DATA.filter(park => 
      park.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    result.sort((a, b) => {
      if (sortBy === 'distance') {
        return isAscending ? a.distance - b.distance : b.distance - a.distance;
      } else {
        return isAscending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
    });
    return result;
  }, [searchQuery, sortBy, isAscending]);

  const renderParkItem = ({ item }: { item: typeof PARKS_DATA[0] }) => {
    const isSelected = item.id === selectedId;
    return (
      <TouchableOpacity
        onPress={() => setSelectedId(prevId => prevId === item.id ? null : item.id)}
        style={[styles.parkCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }, isSelected && styles.selectedCard]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.parkName, { color: isDark ? '#FFF' : '#000' }]}>{item.name}</Text>
          <Text style={styles.parkLocation}>{item.location} • {item.distance} mi</Text>
        </View>
        {isSelected && <IconSymbol name="checkmark.circle.fill" size={24} color={RANGER_GREEN} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#F9F9F9' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#FFF' : RANGER_GREEN }]}>Find a Park</Text>
        <View style={[styles.searchBar, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
          <IconSymbol name="magnifyingglass" size={18} color="#8E8E93" />
          <TextInput
            placeholder="Search California Parks..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
            style={[styles.searchInput, { color: isDark ? '#FFF' : '#000' }]}
          />
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity onPress={() => { setSortBy('distance'); setIsAscending(!isAscending); }}
            style={[styles.filterBtn, sortBy === 'distance' && styles.activeFilter]}>
            <Text style={[styles.filterText, sortBy === 'distance' && {color: '#FFF'}]}>Distance</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setSortBy('alphabetical'); setIsAscending(!isAscending); }}
            style={[styles.filterBtn, sortBy === 'alphabetical' && styles.activeFilter]}>
            <Text style={[styles.filterText, sortBy === 'alphabetical' && {color: '#FFF'}]}>A-Z</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList data={filteredParks} renderItem={renderParkItem} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} />
      {selectedId && (
        <View style={[styles.actionSheet, { backgroundColor: isDark ? '#2C2C2E' : '#FFF' }]}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => Alert.alert("Offline", "Download started")}>
            <Text style={styles.secondaryBtnText}>Offline</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/')} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Open Maps</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
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
  activeFilter: { backgroundColor: RANGER_GREEN, borderColor: RANGER_GREEN },
  filterText: { fontSize: 14, color: RANGER_GREEN, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 200 },
  parkCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
  selectedCard: { borderWidth: 2, borderColor: RANGER_GREEN },
  parkName: { fontSize: 18, fontWeight: '700' },
  parkLocation: { color: '#8E8E93', marginTop: 4 },
  actionSheet: { position: 'absolute', bottom: 30, left: 20, right: 20, padding: 16, borderRadius: 24, flexDirection: 'row', gap: 12, elevation: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12 },
  primaryBtn: { flex: 1.5, backgroundColor: RANGER_GREEN, alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16 },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold' },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: RANGER_GREEN, alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16 },
  secondaryBtnText: { color: RANGER_GREEN, fontWeight: '700' }
});