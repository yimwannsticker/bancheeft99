import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { DraftEntry, Entry, PersonKey, RoomNames } from '../types';
import * as api from '../lib/api';
import { getDeviceIdentity, setDeviceIdentity } from '../lib/room';

interface RoomContextValue {
  roomId: string;
  names: RoomNames;
  selfKey: PersonKey;
  entries: Entry[];
  loading: boolean;
  error: string | null;
  addEntry: (draft: DraftEntry) => Promise<Entry>;
  editEntry: (id: string, patch: Partial<DraftEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  updateNames: (names: RoomNames) => Promise<void>;
  switchIdentity: (key: PersonKey) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({
  roomId,
  initialNames,
  initialSelfKey,
  children,
}: {
  roomId: string;
  initialNames: RoomNames;
  initialSelfKey: PersonKey;
  children: ReactNode;
}) {
  const [names, setNames] = useState(initialNames);
  const [selfKey, setSelfKey] = useState(initialSelfKey);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.fetchEntries(roomId);
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    refresh();
    const unsubscribe = api.subscribeToEntries(roomId, refresh);
    return unsubscribe;
  }, [roomId, refresh]);

  const addEntry = useCallback(
    async (draft: DraftEntry) => {
      const entry = await api.insertEntry(roomId, draft);
      await refresh();
      return entry;
    },
    [roomId, refresh],
  );

  const editEntry = useCallback(
    async (id: string, patch: Partial<DraftEntry>) => {
      await api.updateEntry(id, patch);
      await refresh();
    },
    [refresh],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      await api.softDeleteEntry(id);
      await refresh();
    },
    [refresh],
  );

  const updateNames = useCallback(
    async (next: RoomNames) => {
      await api.updateRoomNames(roomId, next);
      setNames(next);
    },
    [roomId],
  );

  const switchIdentity = useCallback(
    (key: PersonKey) => {
      setDeviceIdentity(roomId, key);
      setSelfKey(key);
    },
    [roomId],
  );

  const value = useMemo<RoomContextValue>(
    () => ({ roomId, names, selfKey, entries, loading, error, addEntry, editEntry, deleteEntry, updateNames, switchIdentity }),
    [roomId, names, selfKey, entries, loading, error, addEntry, editEntry, deleteEntry, updateNames, switchIdentity],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom ต้องถูกเรียกภายใน RoomProvider');
  return ctx;
}

export function loadStoredIdentity(roomId: string): PersonKey | null {
  return getDeviceIdentity(roomId);
}
