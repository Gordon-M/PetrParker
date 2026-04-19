import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import { useOfflineCatalogDiagnostics } from '@/hooks/use-offline-park-catalog';

export default function StatusTabScreen() {
  if (Platform.OS === 'web') {
    return (
      <ThemedView style={styles.screen}>
        <View style={styles.card}>
          <ThemedText type="title" style={styles.title}>
            Bundle Status
          </ThemedText>
          <ThemedText style={styles.body}>
            Run the mobile app on iOS or Android to inspect the staged SQLite bundle.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return <NativeStatusTabScreen />;
}

function NativeStatusTabScreen() {
  const { diagnostics, error, isLoading } = useOfflineCatalogDiagnostics();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, styles.summaryCard]}>
          <ThemedText style={styles.eyebrow}>Offline Validation</ThemedText>
          <ThemedText type="title" style={styles.title}>
            Bundle Status
          </ThemedText>
          <ThemedText style={styles.body}>
            This screen reads straight from the staged SQLite bundle and confirms what the mobile
            app can see offline right now.
          </ThemedText>
        </View>

        {error ? (
          <View style={styles.card}>
            <ThemedText type="subtitle">Load Error</ThemedText>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}

        <View style={styles.card}>
          <ThemedText type="subtitle">Bundle Manifest</ThemedText>
          <View style={styles.metricRow}>
            <Metric label="Version" value={diagnostics?.bundle.version ?? (isLoading ? '...' : 'n/a')} />
            <Metric label="Generated" value={diagnostics?.bundle.generatedAt ?? (isLoading ? '...' : 'n/a')} />
            <Metric label="Parks" value={String(diagnostics?.bundle.parkCount ?? '...')} />
            <Metric
              label="Snapshot"
              value={diagnostics?.bundle.sourceSnapshotAt ?? (isLoading ? '...' : 'n/a')}
            />
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText type="subtitle">Table Counts</ThemedText>
          <View style={styles.metricRow}>
            <Metric label="Facilities" value={String(diagnostics?.counts.facilities ?? '...')} />
            <Metric label="Routes" value={String(diagnostics?.counts.routes ?? '...')} />
            <Metric label="Alerts" value={String(diagnostics?.counts.alerts ?? '...')} />
            <Metric label="Docs" value={String(diagnostics?.counts.documents ?? '...')} />
            <Metric label="Activities" value={String(diagnostics?.counts.activities ?? '...')} />
            <Metric label="Amenities" value={String(diagnostics?.counts.amenities ?? '...')} />
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText type="subtitle">Refresh Workflow</ThemedText>
          <ThemedText style={styles.body}>
            1. Run the ingestion pipeline and export the bundle.
          </ThemedText>
          <ThemedText style={styles.body}>
            2. Run `npm run app:refresh-offline-bundle`.
          </ThemedText>
          <ThemedText style={styles.body}>
            3. Restart Expo so the staged `assets/data/parks.sqlite` bundle is re-imported.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <ThemedText style={styles.metricLabel}>{label}</ThemedText>
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  card: {
    backgroundColor: '#edf2ee',
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#e3ece3',
  },
  eyebrow: {
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    opacity: 0.74,
  },
  title: {
    fontFamily: Fonts.rounded,
    lineHeight: 34,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#30423a',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8b2f2f',
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    minWidth: 130,
    backgroundColor: 'rgba(255,255,255,0.66)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: '#567166',
  },
  metricValue: {
    fontSize: 15,
    lineHeight: 20,
    color: '#1f2e28',
  },
});
