import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import { useOfflineParkDetail } from '@/hooks/use-offline-park-catalog';

export default function ParkDetailScreen() {
  if (Platform.OS === 'web') {
    return (
      <ThemedView style={styles.screen}>
        <View style={styles.card}>
          <ThemedText type="title" style={styles.title}>
            Park Detail
          </ThemedText>
          <ThemedText style={styles.body}>
            Open the mobile app to inspect park details from the staged SQLite bundle.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return <NativeParkDetailScreen />;
}

function NativeParkDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const parkId = typeof params.id === 'string' ? params.id : '';
  const { error, isLoading, park } = useOfflineParkDetail(parkId);

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: park?.name ?? 'Park Details' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, styles.heroCard]}>
          <ThemedText style={styles.eyebrow}>Offline Park Record</ThemedText>
          <ThemedText type="title" style={styles.title}>
            {park?.name ?? 'Loading park...'}
          </ThemedText>
          <ThemedText style={styles.metaLine}>
            {park?.unitType ?? 'Unknown unit'}
            {park?.county ? ` • ${park.county}` : ''}
            {park?.status ? ` • ${park.status}` : ''}
          </ThemedText>
          <ThemedText style={styles.body}>
            {park?.description ||
              'This park does not yet have a description in the staged bundle.'}
          </ThemedText>
        </View>

        {error ? (
          <View style={styles.card}>
            <ThemedText type="subtitle">Load Error</ThemedText>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}

        {isLoading && !park ? (
          <View style={styles.card}>
            <ThemedText style={styles.body}>Loading offline park details…</ThemedText>
          </View>
        ) : null}

        {park ? (
          <>
            <View style={styles.card}>
              <ThemedText type="subtitle">Operations</ThemedText>
              <DetailRow label="Hours" value={park.hoursSummary || 'No hours listed'} />
              <DetailRow label="Phone" value={park.phone || 'No phone listed'} />
              <DetailRow label="Website" value={park.websiteUrl || 'No website listed'} />
              <DetailRow
                label="Dog policy"
                value={park.dogPolicy || 'No dog policy captured in the bundle'}
              />
              <DetailRow
                label="Last verified"
                value={park.hoursLastVerifiedAt || park.sourceUpdatedAt || 'Unknown'}
              />
            </View>

            <View style={styles.card}>
              <ThemedText type="subtitle">Bundle Counts</ThemedText>
              <View style={styles.metricRow}>
                <Metric label="Fees" value={String(park.fees.length)} />
                <Metric label="Facilities" value={String(park.facilities.length)} />
                <Metric label="Routes" value={String(park.routes.length)} />
                <Metric label="Alerts" value={String(park.alerts.length)} />
                <Metric label="Docs" value={String(park.documents.length)} />
              </View>
            </View>

            <TagSection title="Activities" items={park.activities} emptyLabel="No activities captured" />
            <TagSection title="Amenities" items={park.amenities} emptyLabel="No amenities captured" />
            <ListSection
              title="Fees"
              items={park.fees.map((fee) => `${fee.label}${fee.notes ? ` • ${fee.notes}` : ''}`)}
              emptyLabel="No fees captured"
            />
            <ListSection
              title="Alerts"
              items={park.alerts.map((alert) => `${alert.title}: ${alert.message}`)}
              emptyLabel="No alerts in the current bundle"
            />
            <ListSection
              title="Documents"
              items={park.documents.map((document) => `${document.title} • ${document.documentType}`)}
              emptyLabel="No linked documents captured"
            />
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={styles.detailValue}>{value}</ThemedText>
    </View>
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

function TagSection({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <View style={styles.card}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {items.length === 0 ? (
        <ThemedText style={styles.body}>{emptyLabel}</ThemedText>
      ) : (
        <View style={styles.tagWrap}>
          {items.map((item) => (
            <View key={`${title}-${item}`} style={styles.tag}>
              <ThemedText style={styles.tagText}>{item}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ListSection({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <View style={styles.card}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {items.length === 0 ? (
        <ThemedText style={styles.body}>{emptyLabel}</ThemedText>
      ) : (
        <View style={styles.sectionList}>
          {items.map((item) => (
            <ThemedText key={`${title}-${item}`} style={styles.listItem}>
              {item}
            </ThemedText>
          ))}
        </View>
      )}
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
    backgroundColor: '#edf3ef',
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  heroCard: {
    backgroundColor: '#dfead8',
  },
  eyebrow: {
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.72,
  },
  title: {
    fontFamily: Fonts.rounded,
    lineHeight: 34,
  },
  metaLine: {
    fontSize: 14,
    color: '#587065',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#30423a',
  },
  errorText: {
    color: '#8b2f2f',
    fontSize: 14,
    lineHeight: 20,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: '#5b7267',
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 21,
    color: '#22312b',
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    minWidth: 110,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.68)',
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: '#5b7267',
  },
  metricValue: {
    fontSize: 15,
    color: '#22312b',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#2d4038',
  },
  sectionList: {
    gap: 8,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 21,
    color: '#2d4038',
  },
});
