import { startTransition, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import {
  getOfflineCatalogDiagnostics,
  getOfflineParkById,
  searchOfflineParks,
  type OfflineCatalogDiagnostics,
  type OfflineParkDetail,
  type OfflineParkSummary,
} from '@/services/catalog/offline-catalog';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

function useAsyncValue<T>(loader: () => Promise<T>, dependencies: React.DependencyList): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let isCancelled = false;

    setState((current) => ({
      data: current.data,
      error: null,
      isLoading: true,
    }));

    loader()
      .then((data) => {
        if (isCancelled) {
          return;
        }

        startTransition(() => {
          setState({
            data,
            error: null,
            isLoading: false,
          });
        });
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unknown offline catalog error.';

        setState((current) => ({
          data: current.data,
          error: message,
          isLoading: false,
        }));
      });

    return () => {
      isCancelled = true;
    };
  }, dependencies);

  return state;
}

export function useOfflineParkCatalog(search: string) {
  const db = useSQLiteContext();
  const parksState = useAsyncValue(() => searchOfflineParks(db, search), [db, search]);
  const bundleState = useAsyncValue(() => getOfflineCatalogDiagnostics(db), [db]);

  return {
    parks: parksState.data?.parks ?? [],
    bundle: bundleState.data?.bundle ?? null,
    error: parksState.error ?? bundleState.error,
    isLoading: parksState.isLoading || bundleState.isLoading,
  };
}

export function useOfflineParkDetail(parkId: string) {
  const db = useSQLiteContext();
  const state = useAsyncValue(() => getOfflineParkById(db, parkId), [db, parkId]);

  return {
    park: state.data,
    error: state.error,
    isLoading: state.isLoading,
  };
}

export function useOfflineCatalogDiagnostics() {
  const db = useSQLiteContext();
  const state = useAsyncValue<OfflineCatalogDiagnostics>(() => getOfflineCatalogDiagnostics(db), [db]);

  return {
    diagnostics: state.data,
    error: state.error,
    isLoading: state.isLoading,
  };
}

export type { OfflineCatalogDiagnostics, OfflineParkDetail, OfflineParkSummary };
