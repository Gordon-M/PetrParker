import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Modal,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Feather from '@expo/vector-icons/Feather';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MOCK_ALERTS = [
  { id: '1', title: 'Bear Sighting', detail: 'Mother black bear and cubs spotted near Trailhead 4. Maintain 100yd distance.', time: '2m ago', type: 'animal', icon: 'alert-triangle' },
  { id: '2', title: 'Trail Closure', detail: 'North Rim trail closed due to flash flood damage.', time: '1h ago', type: 'hazard', icon: 'slash' },
  { id: '3', title: 'Heavy Winds', detail: 'Winds expected above 6,000ft. Secure all loose gear.', time: '3h ago', type: 'wind', icon: 'wind' },
  { id: '4', title: 'Flash Flooding', detail: 'Sudden rain causing rising waters in canyons.', time: '4h ago', type: 'rain', icon: 'cloud-rain' },
  { id: '5', title: 'Parking Full', detail: 'The main Yosemite Falls parking lot is currently at capacity.', time: '5h ago', type: 'info', icon: 'truck' },
];

export default function RangerTips() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);

  // AI-Driven Dynamic Theming
  const getAlertStyle = (type: string) => {
    switch (type) {
      case 'animal': return { bg: isDark ? '#3D2B19' : '#FFF3E0', accent: '#FF9500' };
      case 'wind': return { bg: isDark ? '#1A2E35' : '#E1F5FE', accent: '#0288D1' };
      case 'rain': return { bg: isDark ? '#1E1E3F' : '#E8EAF6', accent: '#3F51B5' };
      case 'hazard': return { bg: isDark ? '#3E1B1B' : '#FFEBEE', accent: '#D32F2F' };
      default: return { bg: isDark ? '#1C1C1E' : '#F2F2F7', accent: '#8E8E93' };
    }
  };

  const handleCloseAlert = (id: string) => {
    // This triggers the sliding "shrink" animation when an alert is removed
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#FFF' }]}>
      <View style={styles.content}>
        
        {/* 1. Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#FFF' : '#000' }]}>Ranger Tips</Text>
          <TouchableOpacity onPress={() => router.push('/search')} style={styles.locationRow}>
            <IconSymbol name="mappin.and.ellipse" size={18} color="#34C759" />
            <Text style={[styles.locationText, { color: isDark ? '#CCC' : '#666' }]}>Yosemite</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Alerts Area */}
        <View style={styles.alertArea}>
          <View style={styles.alertHeaderRow}>
            <Text style={[styles.alertAreaTitle, { color: isDark ? '#FFF' : '#000' }]}>Live Alerts</Text>
            <TouchableOpacity onPress={() => setHistoryVisible(true)}>
              <Text style={styles.historyBtn}>History</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer}>
            {alerts.length > 0 ? (
              alerts.map((item) => {
                const theme = getAlertStyle(item.type);
                return (
                  <TouchableOpacity 
                    key={item.id} 
                    activeOpacity={0.9}
                    onPress={() => toggleExpand(item.id)}
                    style={[styles.alertCard, { backgroundColor: theme.bg }]}
                  >
                    <View style={styles.alertMain}>
                      <Feather name={item.icon as any} size={20} color={theme.accent} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.alertCardTitle, { color: isDark ? '#FFF' : '#000' }]}>{item.title}</Text>
                        <Text style={[styles.alertTime, { color: isDark ? '#AAA' : '#8E8E93' }]}>{item.time}</Text>
                      </View>
                      
                      {/* WORKING CLOSE BUTTON */}
                      <TouchableOpacity 
                        onPress={() => handleCloseAlert(item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Easier to tap
                      >
                        <Feather name="x" size={18} color={isDark ? '#FFF' : '#8E8E93'} />
                      </TouchableOpacity>
                    </View>
                    
                    {expandedId === item.id && (
                      <Text style={[styles.alertDetailText, { color: isDark ? '#CCC' : '#444' }]}>{item.detail}</Text>
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>All clear! No active alerts.</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* 3. Camera FAB (Identify with AI) */}
        <View style={styles.cameraWrapper}>
           <TouchableOpacity 
             style={[styles.cameraBtn, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
             onPress={() => console.log("Launching AI Vision...")}
           >
              <Feather name="camera" size={24} color={isDark ? '#FFF' : '#000'} />
              <Text style={[styles.cameraLabel, { color: isDark ? '#FFF' : '#000' }]}>Identify with AI</Text>
           </TouchableOpacity>
        </View>

        {/* 4. Amenities Row */}
        <View style={styles.amenitiesRow}>
          <AmenityIcon name="info.circle.fill" label="Info" color="#007AFF" isDark={isDark} />
          <AmenityIcon name="shield.fill" label="Safety" color="#34C759" isDark={isDark} />
          <AmenityIcon name="leaf.fill" label="Nature" color="#FF9500" isDark={isDark} />
          <AmenityIcon name="map.fill" label="Trails" color="#5856D6" isDark={isDark} />
        </View>

        {/* 5. History Modal */}
        <Modal 
          animationType="slide" 
          transparent={true} 
          visible={historyVisible}
          onRequestClose={() => setHistoryVisible(false)} // Handles hardware back button on Android
        >
          {/* The Overlay: Tapping here closes the modal */}
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPressOut={() => setHistoryVisible(false)}
          >
            {/* The Content: We use activeOpacity={1} and TouchableWithoutFeedback 
                on the inner part so taps INSIDE the modal don't close it */}
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={() => {}} // Prevents tap-through to the overlay
              style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: isDark ? '#FFF' : '#000' }]}>Alert History</Text>
                <TouchableOpacity onPress={() => setHistoryVisible(false)}>
                  <Feather name="chevron-down" size={32} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {MOCK_ALERTS.map((item) => (
                  <View key={item.id} style={[styles.historyItem, { borderBottomColor: isDark ? '#333' : '#EEE' }]}>
                    <Text style={[styles.historyItemTitle, { color: isDark ? '#FFF' : '#000' }]}>{item.title}</Text>
                    <Text style={styles.historyTime}>{item.time} — Resolved</Text>
                  </View>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const AmenityIcon = ({ name, label, color, isDark }: any) => (
  <TouchableOpacity style={styles.amenityItem}>
    <View style={[styles.amenityCircle, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
      <IconSymbol name={name} size={24} color={color} />
    </View>
    <Text style={[styles.amenityLabel, { color: isDark ? '#8E8E93' : '#666' }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 25, flex: 1, paddingTop: 10 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  locationText: { fontSize: 17, fontWeight: '600' },
  alertArea: { flex: 1, maxHeight: 420 },
  alertHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  alertAreaTitle: { fontSize: 20, fontWeight: '700' },
  historyBtn: { color: '#007AFF', fontWeight: '700', fontSize: 16 },
  scrollContainer: { paddingHorizontal: 4 },
  alertCard: { padding: 16, borderRadius: 24, marginBottom: 12, width: '96%', alignSelf: 'center' },
  alertMain: { flexDirection: 'row', alignItems: 'center' },
  alertCardTitle: { fontWeight: '700', fontSize: 16 },
  alertTime: { fontSize: 12, marginTop: 2 },
  alertDetailText: { marginTop: 12, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#8E8E93', fontSize: 16 },
  cameraWrapper: { alignItems: 'center', marginVertical: 20 },
  cameraBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 22, 
    borderRadius: 20, 
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 4 }
    })
  },
  cameraLabel: { fontWeight: '700', fontSize: 16 },
  amenitiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  amenityItem: { alignItems: 'center', gap: 10 },
  amenityCircle: { width: 62, height: 62, borderRadius: 31, justifyContent: 'center', alignItems: 'center' },
  amenityLabel: { fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { height: '70%', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 26, fontWeight: '800' },
  historyItem: { paddingVertical: 18, borderBottomWidth: 1 },
  historyItemTitle: { fontSize: 18, fontWeight: '700' },
  historyTime: { fontSize: 13, color: '#8E8E93' },
});