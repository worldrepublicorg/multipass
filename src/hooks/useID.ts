import {useCallback, useEffect, useState} from 'react';
import {
  getStoredID,
  saveStoredID,
  deleteStoredID,
  generateIDId,
  parseChipDocument,
  type StoredID,
} from '../storage/idStorage';
import {
  commitStoredIdCache,
  getStoredIdCache,
  waitForStoredIdPreload,
} from './idState';

export function useID() {
  const initialCache = getStoredIdCache();
  const [id, setId] = useState<StoredID | null>(
    initialCache.loaded ? initialCache.id : null,
  );
  const [loading, setLoading] = useState(!initialCache.loaded);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const {loaded} = getStoredIdCache();
    if (!loaded) {
      try {
        setLoading(true);
        setError(null);
        await waitForStoredIdPreload();
        const cache = getStoredIdCache();
        setId(cache.id);
      } catch (err: any) {
        setError(err?.message || 'Failed to load ID');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setRefreshing(true);
      setError(null);
      const stored = await getStoredID();
      commitStoredIdCache(stored);
      setId(stored);
    } catch (err: any) {
      setError(err?.message || 'Failed to load ID');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!getStoredIdCache().loaded) {
      void refresh();
    }
  }, [refresh]);

  const addID = useCallback(
    async (dg1: string, sod: string): Promise<StoredID> => {
      const existing = await getStoredID();
      if (existing) {
        throw new Error(
          'An ID is already stored. Delete it before adding a new one.',
        );
      }

      const parsed = parseChipDocument(dg1, sod);
      const {plainVerifyDocument, DocumentVerifyError} = await import(
        '../services/documentVerify'
      );
      let verification;
      try {
        verification = await plainVerifyDocument(dg1, sod);
      } catch (err: any) {
        if (err instanceof DocumentVerifyError) {
          throw err;
        }
        throw new DocumentVerifyError(
          err?.message || 'Document verification failed',
        );
      }
      const newId: StoredID = {
        ...parsed,
        id: generateIDId(),
        createdAt: Date.now(),
        certRoot: verification.certRoot,
        sodHash: verification.sodHash,
      };
      await saveStoredID(newId);
      await refresh();
      return newId;
    },
    [refresh],
  );

  const clearID = useCallback(async (): Promise<void> => {
    await deleteStoredID();
    await refresh();
  }, [refresh]);

  return {
    id,
    loading,
    refreshing,
    error,
    refresh,
    addID,
    clearID,
    hasID: id != null,
  };
}
