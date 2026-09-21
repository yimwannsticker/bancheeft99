import type { PersonKey } from '../types';

const ROOM_QUERY_KEY = 'room';

export function getRoomIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(ROOM_QUERY_KEY);
}

export function generateRoomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 14);
}

export function setRoomIdInUrl(roomId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set(ROOM_QUERY_KEY, roomId);
  window.history.replaceState({}, '', url.toString());
}

export function roomShareUrl(roomId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set(ROOM_QUERY_KEY, roomId);
  return url.toString();
}

function identityStorageKey(roomId: string): string {
  return `bancheeft:identity:${roomId}`;
}

export function getDeviceIdentity(roomId: string): PersonKey | null {
  try {
    const value = window.localStorage.getItem(identityStorageKey(roomId));
    return value === 'a' || value === 'b' ? value : null;
  } catch {
    return null;
  }
}

export function setDeviceIdentity(roomId: string, key: PersonKey): void {
  try {
    window.localStorage.setItem(identityStorageKey(roomId), key);
  } catch {
    // ไม่สามารถบันทึกได้ (เช่น private mode) — ไม่ร้ายแรง แค่ต้องเลือกใหม่ครั้งหน้า
  }
}
