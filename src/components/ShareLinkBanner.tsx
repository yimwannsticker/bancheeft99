import { useState } from 'react';
import { roomShareUrl } from '../lib/room';

export function ShareLinkBanner({ roomId, onDismiss }: { roomId: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = roomShareUrl(roomId);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('คัดลอกลิงก์นี้แล้วส่งให้อีกคน', link);
    }
  };

  return (
    <div className="border-b border-brand-100 bg-brand-50 px-4 py-3 text-sm">
      <p className="font-semibold text-brand-600">สร้างห้องสำเร็จ! 🎉</p>
      <p className="mt-1 text-gray-600">ส่งลิงก์นี้ให้อีกคนเพื่อเข้าห้องเดียวกัน</p>
      <div className="mt-2 flex items-center gap-2">
        <button onClick={copy} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white active:scale-95">
          {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกลิงก์'}
        </button>
        <button onClick={onDismiss} className="rounded-lg px-3 py-1.5 text-xs text-gray-400">
          ปิด
        </button>
      </div>
    </div>
  );
}
