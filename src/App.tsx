import { useEffect, useState } from 'react';
import type { PersonKey, RoomNames } from './types';
import { getOrCreateRoom } from './lib/api';
import { generateRoomId, getRoomIdFromUrl, setRoomIdInUrl } from './lib/room';
import { RoomProvider, loadStoredIdentity } from './context/RoomContext';
import { IdentityPickerPage } from './pages/IdentityPickerPage';
import { MainApp } from './MainApp';

type Phase = 'loading' | 'error' | 'pick-identity' | 'ready';

export default function App() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [names, setNames] = useState<RoomNames | null>(null);
  const [selfKey, setSelfKey] = useState<PersonKey | null>(null);
  const [isNewRoom, setIsNewRoom] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        let id = getRoomIdFromUrl();
        const freshlyCreated = !id;
        if (!id) {
          id = generateRoomId();
          setRoomIdInUrl(id);
        }
        const roomNames = await getOrCreateRoom(id);
        setRoomId(id);
        setNames(roomNames);
        setIsNewRoom(freshlyCreated);

        const identity = loadStoredIdentity(id);
        if (identity) {
          setSelfKey(identity);
          setPhase('ready');
        } else {
          setPhase('pick-identity');
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'เชื่อมต่อไม่สำเร็จ');
        setPhase('error');
      }
    })();
  }, []);

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50 text-gray-500">
        กำลังโหลด...
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-50 p-6 text-center">
        <p className="font-semibold text-red-600">เชื่อมต่อไม่สำเร็จ</p>
        <p className="text-sm text-gray-500">{errorMessage}</p>
        <p className="text-xs text-gray-400">
          ตรวจสอบว่าตั้งค่า VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ถูกต้องหรือยัง (ดู README.md)
        </p>
      </div>
    );
  }

  if (phase === 'pick-identity' && roomId && names) {
    return (
      <IdentityPickerPage
        names={names}
        onPick={(key) => {
          setSelfKey(key);
          setPhase('ready');
        }}
      />
    );
  }

  if (phase === 'ready' && roomId && names && selfKey) {
    return (
      <RoomProvider roomId={roomId} initialNames={names} initialSelfKey={selfKey}>
        <MainApp showShareBannerInitially={isNewRoom} />
      </RoomProvider>
    );
  }

  return null;
}
