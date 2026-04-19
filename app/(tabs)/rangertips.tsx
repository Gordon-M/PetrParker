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
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePark } from '@/store/ParkContent'; // Added store import
import Feather from '@expo/vector-icons/Feather';

const RANGER_GREEN = '#2D5A27';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MOCK_ALERTS = [
  { id: '1', title: 'Flash Flood Warning', detail: 'Rapid water rise detected in slot canyons. Seek higher ground immediately.', time: 'Just now', type: 'hazard', icon: 'droplet' },
  { id: '2', title: 'Severe Thunderstorm', detail: 'Lightning strikes detected within 5 miles. Vacate ridges and open plateaus.', time: '10m ago', type: 'hazard', icon: 'zap' },
  { id: '3', title: 'Parking Full', detail: 'Main trailhead lot at capacity. Please use the shuttle or overflow lot B.', time: '25m ago', type: 'neutral', icon: 'info' },
  { id: '4', title: 'Bear Sighting', detail: 'Mother black bear and cubs spotted near Trailhead 4. Maintain 100yd distance.', time: '45m ago', type: 'animal', icon: 'alert-triangle' },
  { id: '5', title: 'Trail Closure', detail: 'North Rim trail closed due to flash flood damage.', time: '1h ago', type: 'hazard', icon: 'slash' },
];

export default function RangerTips() {
  const router = useRouter();
  const { selectedPark } = usePark(); // Access global park state
  const isDark = useColorScheme() === 'dark';
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [parkDetail, setParkDetail] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(false);

  // AI State
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

const getAlertStyle = (type: string) => {
  switch (type) {
    case 'hazard': // Flash Floods, Lightning, Closures
      return { bg: isDark ? '#4A1B1B' : '#FFDAD9', accent: '#CF142B' };
    case 'animal': // Bear sightings
      return { bg: isDark ? '#3D2B19' : '#FFECD2', accent: '#D35400' };
    case 'wind': // High winds
      return { bg: isDark ? '#1A2E35' : '#D1F2FF', accent: '#0077B6' };
    case 'neutral': // Parking, General Info
      return { bg: isDark ? '#2C2C2E' : '#E9ECEF', accent: '#495057' };
    default: 
      return { bg: isDark ? '#1C1C1E' : '#F2F2F7', accent: RANGER_GREEN };
  }
};

  const handleLaunchAI = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.4,
      base64: true,
    });

    if (!result.canceled) {
      setCapturedImage(result.assets[0].uri);
      setAiLoading(true);
      setAiModalVisible(true);

      try {
        const response = await fetch(process.env.EXPO_PUBLIC_API_URL as string, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: result.assets[0].base64 }),
        });
        const data = await response.json();
        setAiResult(data.error ? `Ranger Station Error: ${data.error}` : data.description);
      } catch (error: any) {
        setAiResult(`Connection Error: ${error.message}`);
      } finally {
        setAiLoading(false);
      }
    }
  };

  const handleCloseAlert = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const handleInfoPress = async (category: string) => {
    // FIX: Check if park is selected before proceeding
    if (!selectedPark) {
      Alert.alert("No Park Selected", "Please head to the search page to select a park first.");
      return;
    }

    setInfoLoading(true);
    setShowInfoModal(true);

    const mockResponses: Record<string, string> = {
      "Info": `General Report for ${selectedPark.name}: \n\nLocated in ${selectedPark}, this park offers 24/7 access to primary trailheads. The visitor center is open 9am-5pm.`,
      "Safety": `Safety Protocol for ${selectedPark.name}: \n\n• High altitude: Stay hydrated. \n• Wildlife: Use bear lockers for all scented items. \n• Weather: Afternoon thunderstorms are common.`,
      "Nature": `Ecological Profile of ${selectedPark.name}: \n\nThis area is home to unique flora and fauna. Please stay on marked paths to protect the local ecosystem.`,
      "Trails": `Trail Intelligence for ${selectedPark.name}: \n\n• Currently approx. ${selectedPark.distance} miles from your current search location. \n• Summit Climb: Strenuous. \n• Current Status: Most trails are clear.`
    };

    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const detail = mockResponses[category] || "General park intelligence retrieved.";
      setParkDetail(detail);
    } catch (error) {
      setParkDetail("Error retrieving data from the knowledge base.");
    } finally {
      setInfoLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#F9F9F9' }]}>
      <View style={styles.content}>
        
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#FFF' : RANGER_GREEN }]}>Ranger Tips</Text>
          {/* SYNC: Dynamic location indicator */}
          <TouchableOpacity onPress={() => router.push('/search')} style={styles.locationRow}>
            <IconSymbol name="mappin.and.ellipse" size={18} color={RANGER_GREEN} />
            <Text style={[styles.locationText, { color: isDark ? '#CCC' : '#666' }]}>
                {selectedPark?.name || 'Find a Park'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.alertArea}>
          <View style={styles.alertHeaderRow}>
            <Text style={[styles.alertAreaTitle, { color: isDark ? '#FFF' : '#000' }]}>Live Alerts</Text>
            <TouchableOpacity onPress={() => setHistoryVisible(true)}>
              <Text style={[styles.historyBtn, { color: RANGER_GREEN }]}>History</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
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
                      <TouchableOpacity onPress={() => handleCloseAlert(item.id)} hitSlop={10}>
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

        <View style={styles.cameraWrapper}>
           <TouchableOpacity 
             style={[styles.cameraBtn, { backgroundColor: RANGER_GREEN }]}
             onPress={handleLaunchAI}
           >
              <Feather name="camera" size={24} color="#FFF" />
              <Text style={styles.cameraLabel}>Identify with AI</Text>
           </TouchableOpacity>
        </View>

        <View style={styles.amenitiesRow}>
          <AmenityIcon name="info.circle.fill" label="Info" color="#007AFF" isDark={isDark} onPress={() => handleInfoPress("Info")} />
          <AmenityIcon name="shield.fill" label="Safety" color="#34C759" isDark={isDark} onPress={() => handleInfoPress("Safety")} />
          <AmenityIcon name="leaf.fill" label="Nature" color="#FF9500" isDark={isDark} onPress={() => handleInfoPress("Nature")} />
          <AmenityIcon name="map.fill" label="Trails" color="#5856D6" isDark={isDark} onPress={() => handleInfoPress("Trails")} />
        </View>

        {/* AI Modal */}
        <Modal animationType="fade" transparent={true} visible={aiModalVisible}>
          <View style={styles.aiOverlay}>
            <View style={[styles.aiContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
              <Text style={[styles.modalTitle, { color: isDark ? '#FFF' : RANGER_GREEN, textAlign: 'center', marginBottom: 15 }]}>Ranger Vision</Text>
              {aiLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={RANGER_GREEN} />
                  <Text style={{ marginTop: 15, color: '#8E8E93', fontWeight: '600' }}>Consulting Knowledge Base...</Text>
                </View>
              ) : (
                <View>
                  {capturedImage && <Image source={{ uri: capturedImage }} style={styles.aiImage} />}
                  <ScrollView style={{ maxHeight: 200 }}><Text style={[styles.aiResultText, { color: isDark ? '#DDD' : '#333' }]}>{aiResult}</Text></ScrollView>
                  <TouchableOpacity style={styles.closeAiBtn} onPress={() => { setAiModalVisible(false); setAiResult(null); setCapturedImage(null); }}><Text style={styles.closeAiBtnText}>Close</Text></TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* History Modal */}
        <Modal animationType="slide" transparent={true} visible={historyVisible} onRequestClose={() => setHistoryVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setHistoryVisible(false)}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: isDark ? '#FFF' : '#000' }]}>Alert History</Text>
                <TouchableOpacity onPress={() => setHistoryVisible(false)}><Feather name="chevron-down" size={32} color="#8E8E93" /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {MOCK_ALERTS.map((item) => (
                  <View key={item.id} style={[styles.historyItem, { borderBottomColor: isDark ? '#333' : '#EEE' }]}>
                    <Text style={[styles.historyItemTitle, { color: isDark ? '#FFF' : '#000' }]}>{item.title}</Text>
                    <Text style={styles.historyTime}>{item.time} — Resolved</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Park Intelligence Modal */}
        <Modal visible={showInfoModal} animationType="slide" transparent={true} onRequestClose={() => setShowInfoModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: isDark ? '#FFF' : RANGER_GREEN }]}>Park Intelligence</Text>
                <TouchableOpacity onPress={() => setShowInfoModal(false)}><Feather name="x-circle" size={28} color="#8E8E93" /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.infoScroll}>
                {infoLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={RANGER_GREEN} />
                    <Text style={styles.loadingText}>Querying Knowledge Base...</Text>
                  </View>
                ) : (
                  <Text style={[styles.parkDetailText, { color: isDark ? '#EEE' : '#333' }]}>{parkDetail}</Text>
                )}
              </ScrollView>
              {!infoLoading && (
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: RANGER_GREEN, marginTop: 20 }]} onPress={() => setShowInfoModal(false)}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Back to Ranger Tips</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const AmenityIcon = ({ name, label, color, isDark, onPress }: any) => (
  <TouchableOpacity style={styles.amenityItem} onPress={onPress}>
    <View style={[styles.amenityCircle, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: '#E0E0E0', borderWidth: 1 }]}>
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
  alertArea: { flex: 1, maxHeight: 380 },
  alertHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  alertAreaTitle: { fontSize: 20, fontWeight: '700' },
  historyBtn: { fontWeight: '700', fontSize: 16 },
  alertCard: { padding: 16, borderRadius: 20, marginBottom: 12, width: '100%', alignSelf: 'center' },
  alertMain: { flexDirection: 'row', alignItems: 'center' },
  alertCardTitle: { fontWeight: '700', fontSize: 16 },
  alertTime: { fontSize: 12, marginTop: 2 },
  alertDetailText: { marginTop: 12, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#8E8E93', fontSize: 16 },
  cameraWrapper: { alignItems: 'center', marginVertical: 20 },
  cameraBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 20, gap: 12, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  cameraLabel: { fontWeight: '700', fontSize: 16, color: '#FFF' },
  amenitiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 110 }, 
  amenityItem: { alignItems: 'center', gap: 10 },
  amenityCircle: { width: 62, height: 62, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  amenityLabel: { fontSize: 13, fontWeight: '700' },
  aiOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  aiContent: { borderRadius: 30, padding: 25, elevation: 10 },
  loadingBox: { padding: 40, alignItems: 'center' },
  aiImage: { width: '100%', height: 220, borderRadius: 20, marginBottom: 20, resizeMode: 'cover' },
  aiResultText: { fontSize: 16, lineHeight: 24, marginBottom: 20, fontWeight: '500' },
  closeAiBtn: { backgroundColor: RANGER_GREEN, paddingVertical: 16, borderRadius: 18, alignItems: 'center', marginTop: 10, width: '100%' },
  closeAiBtnText: { color: '#FFF', fontWeight: '800', fontSize: 18, textTransform: 'uppercase', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { height: '70%', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 24, fontWeight: '800' },
  historyItem: { paddingVertical: 18, borderBottomWidth: 1 },
  historyItemTitle: { fontSize: 18, fontWeight: '700' },
  historyTime: { fontSize: 13, color: '#8E8E93' },
  infoScroll: { marginVertical: 10, paddingHorizontal: 5 },
  parkDetailText: { fontSize: 16, lineHeight: 26, fontWeight: '500', letterSpacing: 0.3 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 15, color: '#8E8E93', fontWeight: '600' },
  primaryBtn: { paddingVertical: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'center', width: '100%' },
});