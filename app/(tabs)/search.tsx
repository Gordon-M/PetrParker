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
import { useRouter } from 'expo-router'; // For navigation
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('distance');
  const [isAscending, setIsAscending] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 1. Sorting & Filtering Logic
  const filteredParks = useMemo(() => {
    let result = PARKS_DATA.filter(park => 
      park.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      if (sortBy === 'distance') {
        return isAscending ? a.distance - b.distance : b.distance - a.distance;
      } else {
        return isAscending 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      }
    });

    return result;
  }, [searchQuery, sortBy, isAscending]);

  // 2. Alert for Offline Download
  const handleDownload = (parkName: string) => {
    Alert.alert(
      "Offline Access",
      `Would you like to download ${parkName} for offline use? This will save map data and AI guides.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Download", onPress: () => console.log("Downloading...") }
      ]
    );
  };

  // 3. Navigation to Home (Index)
  const handleOpenMaps = () => {
    // This moves the user back to the 'index.tsx' tab
    router.push('/'); 
  };

  const renderParkItem = ({ item }: { item: typeof PARKS_DATA[0] }) => {
    const isSelected = item.id === selectedId;
    return (
      <TouchableOpacity
        onPress={() => setSelectedId(prevId => prevId === item.id? null: item.id)}
        style={[
          styles.parkCard,
          { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' },
          isSelected && styles.selectedCard,
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.parkName, { color: isDark ? '#FFF' : '#000' }]}>{item.name}</Text>
          <Text style={styles.parkLocation}>{item.location} • {item.distance} mi</Text>
        </View>
        {isSelected && <IconSymbol name="checkmark.circle.fill" size={24} color="#34C759" />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#FFF' : '#000' }]}>Find a Park</Text>
        
        <View style={[styles.searchBar, { backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }]}>
          <IconSymbol name="magnifyingglass" size={18} color="#8E8E93" />
          <TextInput
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
            style={[styles.searchInput, { color: isDark ? '#FFF' : '#000' }]}
          />
        </View>

        <View style={styles.filterRow}>
          {/* Distance Sort Toggle */}
          <TouchableOpacity 
            onPress={() => { setSortBy('distance'); setIsAscending(!isAscending); }}
            style={[styles.filterBtn, sortBy === 'distance' && styles.activeFilter]}
          >
            <Text style={styles.filterText}>Distance {sortBy === 'distance' && (isAscending ? '↑' : '↓')}</Text>
          </TouchableOpacity>

          {/* Alpha Sort Toggle */}
          <TouchableOpacity 
            onPress={() => { setSortBy('alphabetical'); setIsAscending(!isAscending); }}
            style={[styles.filterBtn, sortBy === 'alphabetical' && styles.activeFilter]}
          >
            <Text style={styles.filterText}>A-Z {sortBy === 'alphabetical' && (isAscending ? '↑' : '↓')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredParks}
        renderItem={renderParkItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />

      {/* Action Sheet */}
      {selectedId && (
        <View style={[styles.actionSheet, { backgroundColor: isDark ? '#2C2C2E' : '#FFF' }]}>
          <TouchableOpacity 
            onPress={() => handleDownload(filteredParks.find(p => p.id === selectedId)?.name || "")}
            style={styles.secondaryBtn}
          >
            <IconSymbol name="arrow.down.circle" size={20} color="#007AFF" />
            <Text style={styles.secondaryBtnText}>Offline</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleOpenMaps} style={styles.primaryBtn}>
            <IconSymbol name="map.fill" size={20} color="#FFF" />
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
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 15, gap: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  filterRow: { flexDirection: 'row', gap: 10, marginTop: 15, marginBottom: 10 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#C7C7CC' },
  activeFilter: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  filterText: { fontSize: 14, color: '#8E8E93' },
  listContent: { paddingHorizontal: 20, paddingBottom: 200 },
  parkCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, marginBottom: 15 },
  selectedCard: { borderWidth: 2, borderColor: '#007AFF' },
  parkName: { fontSize: 18, fontWeight: '600' },
  parkLocation: { color: '#8E8E93', marginTop: 4 },
  actionSheet: { position: 'absolute', bottom: 110, left: 20, right: 20, padding: 16, borderRadius: 24, flexDirection: 'row', gap: 12, elevation: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12 },
  primaryBtn: { flex: 1.5, backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8 },
  primaryBtnText: { color: '#FFF', fontWeight: 'bold' },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: '#007AFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8 },
  secondaryBtnText: { color: '#007AFF', fontWeight: '600' }
});