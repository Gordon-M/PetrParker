import { useDeferredValue, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import { useOfflineParkCatalog } from '@/hooks/use-offline-park-catalog';

export default function ParksTabScreen() {
  if (Platform.OS === 'web') {
    return <UnavailableOnWebScreen />;
  }

  return <NativeParksTabScreen />;
}

function NativeParksTabScreen() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const router = useRouter();
  const { bundle, error, isLoading, parks } = useOfflineParkCatalog(deferredSearch);

  return (
    <ThemedView style={styles.screen}>
      <FlatList
        data={parks}
        keyExtractor={(item) => item.parkId}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.heroCard}>
              <ThemedText style={styles.eyebrow}>Offline Bundle</ThemedText>
              <ThemedText type="title" style={styles.heroTitle}>
                California State Parks
              </ThemedText>
              <ThemedText style={styles.heroBody}>
                Browse the generated park catalog directly from the staged SQLite bundle. This is
                the first real app-side test of the knowledge database.
              </ThemedText>

              <View style={styles.metricsRow}>
                <View style={styles.metricPill}>
                  <ThemedText style={styles.metricValue}>{bundle?.parkCount ?? '...'}</ThemedText>
                  <ThemedText style={styles.metricLabel}>parks</ThemedText>
                </View>
                <View style={styles.metricPill}>
                  <ThemedText style={styles.metricValue}>{parks.length}</ThemedText>
                  <ThemedText style={styles.metricLabel}>shown</ThemedText>
                </View>
                <View style={styles.metricPill}>
                  <ThemedText style={styles.metricValue}>{bundle?.version ?? '...'}</ThemedText>
                  <ThemedText style={styles.metricLabel}>bundle</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.searchCard}>
              <ThemedText type="defaultSemiBold" style={styles.searchLabel}>
                Search parks
              </ThemedText>
              <TextInput
                placeholder="Name, county, or unit type"
                placeholderTextColor="#6c7b76"
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
                autoCapitalize="words"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {error ? (
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              ) : (
                <ThemedText style={styles.searchHint}>
                  {deferredSearch.trim()
                    ? `Showing matches for "${deferredSearch.trim()}".`
                    : 'Showing the full offline catalog ordered by park name.'}
                </ThemedText>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              router.push({
                pathname: '/park/[id]',
                params: { id: item.parkId },
              });
            }}
            style={({ pressed }) => [styles.parkCard, pressed ? styles.parkCardPressed : null]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleBlock}>
                <ThemedText type="subtitle" style={styles.parkName}>
                  {item.name}
                </ThemedText>
                <ThemedText style={styles.parkMeta}>
                  {item.unitType}
                  {item.county ? ` • ${item.county}` : ''}
                </ThemedText>
              </View>
              <View style={[styles.statusBadge, item.alertCount > 0 ? styles.alertBadge : null]}>
                <ThemedText style={styles.statusBadgeText}>
                  {item.alertCount > 0 ? `${item.alertCount} alert` : item.status}
                </ThemedText>
              </View>
            </View>

            <ThemedText style={styles.hoursText}>
              {item.hoursSummary || 'No operating hours captured in the current bundle.'}
            </ThemedText>

            <View style={styles.cardFooter}>
              <ThemedText style={styles.footerStat}>{item.routeCount} routes</ThemedText>
              <ThemedText style={styles.footerStat}>{item.documentCount} docs</ThemedText>
              <ThemedText style={styles.footerStat}>
                {item.dogsAllowed == null ? 'dog policy unknown' : item.dogsAllowed ? 'dogs allowed' : 'no dogs'}
              </ThemedText>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator />
              <ThemedText style={styles.emptyStateText}>Loading offline catalog…</ThemedText>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <ThemedText type="subtitle">No matching parks</ThemedText>
              <ThemedText style={styles.emptyStateText}>
                Try a broader county or park-name search.
              </ThemedText>
            </View>
          )
        }
      />
    </ThemedView>
  );
}

function UnavailableOnWebScreen() {
  return (
    <ThemedView style={styles.unavailableScreen}>
      <View style={styles.unavailableCard}>
        <ThemedText type="title" style={styles.heroTitle}>
          Mobile-Only Offline Test
        </ThemedText>
        <ThemedText style={styles.heroBody}>
          The staged SQLite bundle is intended for iOS and Android testing through `expo-sqlite`.
          Open the app on a simulator or device after running `npm run app:refresh-offline-bundle`.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 14,
  },
  header: {
    gap: 14,
    marginBottom: 10,
  },
  heroCard: {
    backgroundColor: '#d8e9de',
    borderRadius: 28,
    padding: 20,
    gap: 12,
  },
  eyebrow: {
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.72,
  },
  heroTitle: {
    fontFamily: Fonts.rounded,
    lineHeight: 36,
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#24352f',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricPill: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 96,
    gap: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d2a25',
  },
  metricLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#4d6459',
  },
  searchCard: {
    backgroundColor: '#f4efe2',
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  searchLabel: {
    fontSize: 14,
  },
  searchInput: {
    backgroundColor: '#fffdf8',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2623',
  },
  searchHint: {
    fontSize: 13,
    lineHeight: 18,
    color: '#5e665f',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8b2f2f',
  },
  parkCard: {
    backgroundColor: '#eef4f1',
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  parkCardPressed: {
    opacity: 0.82,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 4,
  },
  parkName: {
    fontSize: 21,
    lineHeight: 24,
  },
  parkMeta: {
    fontSize: 14,
    color: '#5a6b63',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbe8df',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  alertBadge: {
    backgroundColor: '#f3d5b3',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#30463a',
  },
  hoursText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#30423a',
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerStat: {
    fontSize: 13,
    color: '#5e6d66',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#5e6d66',
  },
  unavailableScreen: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  unavailableCard: {
    backgroundColor: '#eef4f1',
    borderRadius: 28,
    padding: 24,
    gap: 12,
  },
});
