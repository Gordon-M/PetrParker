import { type ReactNode, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';

import { Fonts } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import parksBundleAsset from '@/assets/data/parks.sqlite';

export function OfflineParkDatabaseProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<Error | null>(null);

  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  if (error) {
    return (
      <ThemedView style={styles.screen}>
        <View style={styles.card}>
          <ThemedText type="title" style={styles.title}>
            Offline Bundle Error
          </ThemedText>
          <ThemedText style={styles.body}>
            The mobile app could not import the staged SQLite bundle. Run
            `npm run app:refresh-offline-bundle` and restart Expo.
          </ThemedText>
          <ThemedText style={styles.errorText}>{error.message}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <SQLiteProvider
      databaseName="parks.sqlite"
      assetSource={{
        assetId: parksBundleAsset,
        forceOverwrite: true,
      }}
      onError={setError}>
      {children}
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#f2ece5',
    borderRadius: 28,
    padding: 22,
    gap: 12,
  },
  title: {
    fontFamily: Fonts.rounded,
    lineHeight: 34,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3d3a34',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8b2f2f',
  },
});
