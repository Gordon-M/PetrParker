import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Feather from '@expo/vector-icons/Feather';

const RANGER_GREEN = '#2D5A27';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RangerTips() {
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const alerts = [
    { id: '1', title: 'Bear Sighting', detail: 'Mother black bear and cubs spotted near Trailhead 4.', time: '2m ago', icon: 'alert-triangle' },
    { id: '2', title: 'Trail Closure', detail: 'North Rim trail closed due to flash flood damage.', time: '1h ago', icon: 'slash' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#F9F9F9' }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#FFF' : RANGER_GREEN }]}>Ranger Tips</Text>
          <TouchableOpacity onPress={() => router.push('/search')} style={styles.locationRow}>
            <IconSymbol name="mappin.and.ellipse" size={18} color={RANGER_GREEN} />
            <Text style={styles.locationText}>Yosemite</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.alertArea}>
          <Text style={styles.alertAreaTitle}>Live Alerts</Text>
          {alerts.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => { LayoutAnimation.easeInEaseOut(); setExpandedId(expandedId === item.id ? null : item.id); }} style={styles.alertCard}>
              <View style={styles.alertMain}>
                <Feather name={item.icon as any} size={20} color={RANGER_GREEN} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.alertCardTitle}>{item.title}</Text>
                  <Text style={styles.alertTime}>{item.time}</Text>
                </View>
              </View>
              {expandedId === item.id && <Text style={styles.alertDetailText}>{item.detail}</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.cameraBtn}>
          <Feather name="camera" size={22} color="#FFF" />
          <Text style={styles.cameraLabel}>Identify with AI</Text>
        </TouchableOpacity>

        <View style={styles.amenitiesRow}>
          <AmenityIcon name="leaf.fill" label="Nature" />
          <AmenityIcon name="shield.fill" label="Safety" />
          <AmenityIcon name="info.circle.fill" label="Info" />
        </View>
      </View>
    </SafeAreaView>
  );
}

function AmenityIcon({ name, label }: { name: string, label: string }) {
  return (
    <View style={styles.amenityItem}>
      <View style={styles.amenityCircle}><IconSymbol name={name as any} size={24} color={RANGER_GREEN} /></View>
      <Text style={styles.amenityLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 25, flex: 1, paddingTop: 10 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { fontSize: 17, fontWeight: '600', color: '#666' },
  alertArea: { flex: 1 },
  alertAreaTitle: { fontSize: 20, fontWeight: '700', marginBottom: 15 },
  alertCard: { padding: 16, borderRadius: 20, marginBottom: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE' },
  alertMain: { flexDirection: 'row', alignItems: 'center' },
  alertCardTitle: { fontWeight: '700', fontSize: 16 },
  alertTime: { fontSize: 12, color: '#8E8E93' },
  alertDetailText: { marginTop: 10, fontSize: 14, color: '#444' },
  cameraBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 20, backgroundColor: RANGER_GREEN, marginVertical: 20, gap: 10 },
  cameraLabel: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  amenitiesRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 30 },
  amenityItem: { alignItems: 'center' },
  amenityCircle: { width: 55, height: 55, borderRadius: 15, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  amenityLabel: { fontSize: 12, fontWeight: '700', marginTop: 8, color: '#666' },
});