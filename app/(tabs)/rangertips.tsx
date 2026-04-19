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
import Feather from '@expo/vector-icons/Feather';

const RANGER_GREEN = '#2D5A27';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MOCK_ALERTS = [
  { id: '1', title: 'Bear Sighting', detail: 'Mother black bear and cubs spotted near Trailhead 4. Maintain 100yd distance.', time: '2m ago', type: 'animal', icon: 'alert-triangle' },
  { id: '2', title: 'Trail Closure', detail: 'North Rim trail closed due to flash flood damage.', time: '1h ago', type: 'hazard', icon: 'slash' },
  { id: '3', title: 'Heavy Winds', detail: 'Winds expected above 6,000ft. Secure all loose gear.', time: '3h ago', type: 'wind', icon: 'wind' },
];

export default function RangerTips() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);

  // AI State
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const getAlertStyle = (type: string) => {
    switch (type) {
      case 'animal': return { bg: isDark ? '#3D2B19' : '#FFF3E0', accent: '#FF9500' };
      case 'wind': return { bg: isDark ? '#1A2E35' : '#E1F5FE', accent: '#0288D1' };
      case 'hazard': return { bg: isDark ? '#3E1B1B' : '#FFEBEE', accent: '#D32F2F' };
      default: return { bg: isDark ? '#1C1C1E' : '#F2F2F7', accent: RANGER_GREEN };
    }
  };

  const handleLaunchAI = async () => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.4, // Balanced for Nova's detail needs vs upload speed
    base64: true,
  });

  if (!result.canceled) {
    setCapturedImage(result.assets[0].uri);
    setAiLoading(true);
    setAiModalVisible(true);

    try {
      const response = await fetch('https://52wjn260th.execute-api.us-west-2.amazonaws.com/default/RangerVision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: result.assets[0].base64 // Sending the raw string
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setAiResult(`Ranger Station Error: ${data.error}`);
      } else {
        setAiResult(data.description);
      }
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

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#F9F9F9' }]}>
      <View style={styles.content}>
        
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#FFF' : RANGER_GREEN }]}>Ranger Tips</Text>
          <TouchableOpacity onPress={() => router.push('/search')} style={styles.locationRow}>
            <IconSymbol name="mappin.and.ellipse" size={18} color={RANGER_GREEN} />
            <Text style={[styles.locationText, { color: isDark ? '#CCC' : '#666' }]}>Yosemite</Text>
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
          <AmenityIcon name="info.circle.fill" label="Info" color="#007AFF" isDark={isDark} />
          <AmenityIcon name="shield.fill" label="Safety" color="#34C759" isDark={isDark} />
          <AmenityIcon name="leaf.fill" label="Nature" color="#FF9500" isDark={isDark} />
          <AmenityIcon name="map.fill" label="Trails" color="#5856D6" isDark={isDark} />
        </View>

    {/* --- AI RESULT MODAL --- */}
    <Modal animationType="fade" transparent={true} visible={aiModalVisible}>
      <View style={styles.aiOverlay}>
        <View style={[styles.aiContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
          <Text style={[styles.modalTitle, { color: isDark ? '#FFF' : RANGER_GREEN, textAlign: 'center' }]}>
            Ranger Vision
          </Text>

          {aiLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={RANGER_GREEN} />
              <Text style={{ marginTop: 15, color: '#8E8E93', fontWeight: '600' }}>
                Consulting Knowledge Base...
              </Text>
            </View>
          ) : (
            <View>
              {capturedImage && (
                <Image source={{ uri: capturedImage }} style={styles.aiImage} />
              )}
              
              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={true}>
                <Text style={[styles.aiResultText, { color: isDark ? '#DDD' : '#333' }]}>
                  {aiResult}
                </Text>
              </ScrollView>

              <TouchableOpacity 
                style={styles.closeAiBtn} 
                onPress={() => { 
                  setAiModalVisible(false); 
                  setAiResult(null); 
                  setCapturedImage(null);
                }}
              >
                <Text style={styles.closeAiBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>

        {/* --- HISTORY MODAL --- */}
        <Modal animationType="slide" transparent={true} visible={historyVisible} onRequestClose={() => setHistoryVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setHistoryVisible(false)}>
            <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
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
  modalTitle: { fontSize: 26, fontWeight: '800' },
  historyItem: { paddingVertical: 18, borderBottomWidth: 1 },
  historyItemTitle: { fontSize: 18, fontWeight: '700' },
  historyTime: { fontSize: 13, color: '#8E8E93' },
});