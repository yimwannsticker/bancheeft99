import { useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { roomShareUrl } from '../lib/room';
import type { PersonKey } from '../types';

export function SettingsPage() {
  const { roomId, names, selfKey, updateNames, switchIdentity } = useRoom();
  const [nameA, setNameA] = useState(names.a);
  const [nameB, setNameB] = useState(names.b);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = roomShareUrl(roomId);
  const dirty = nameA !== names.a || nameB !== names.b;

  const save = async () => {
    if (!nameA.trim() || !nameB.trim()) return;
    setSaving(true);
    try {
      await updateNames({ a: nameA.trim(), b: nameB.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('คัดลอกลิงก์นี้แล้วส่งให้อีกคน', link);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-600">ชื่อทั้งสองคน</p>
        <div className="space-y-2">
          <input
            value={nameA}
            onChange={(e) => setNameA(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="ชื่อคนที่ 1"
          />
          <input
            value={nameB}
            onChange={(e) => setNameB(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="ชื่อคนที่ 2"
          />
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="mt-3 w-full rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saved ? 'บันทึกแล้ว ✓' : saving ? 'กำลังบันทึก...' : 'บันทึกชื่อ'}
        </button>
      </section>

      <section className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-600">เครื่องนี้เป็นของใคร</p>
        <div className="flex gap-2">
          {(['a', 'b'] as PersonKey[]).map((key) => (
            <button
              key={key}
              onClick={() => switchIdentity(key)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                selfKey === key ? 'border-brand-500 bg-brand-50 text-brand-600 font-semibold' : 'border-gray-200 text-gray-500'
              }`}
            >
              ฉันคือ {names[key]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-gray-600">ลิงก์เข้าห้อง</p>
        <p className="mb-3 break-all rounded-lg bg-gray-50 p-2 text-xs text-gray-500">{link}</p>
        <button onClick={copyLink} className="w-full rounded-lg bg-gray-100 py-2 text-sm font-semibold text-gray-600">
          {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกลิงก์'}
        </button>
        <p className="mt-2 text-xs text-gray-400">ส่งลิงก์นี้ให้อีกคนเพื่อเข้าห้องเดียวกันบนมือถืออีกเครื่อง</p>
      </section>
    </div>
  );
}
