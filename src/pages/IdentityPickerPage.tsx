import type { PersonKey, RoomNames } from '../types';

export function IdentityPickerPage({
  names,
  onPick,
}: {
  names: RoomNames;
  onPick: (key: PersonKey) => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-brand-50 p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold text-brand-600">บัญชีคู่รัก</h1>
        <p className="mt-2 text-gray-600">เครื่องนี้เป็นของใคร?</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        {(['a', 'b'] as PersonKey[]).map((key) => (
          <button
            key={key}
            onClick={() => onPick(key)}
            className="rounded-2xl bg-white px-6 py-4 text-lg font-semibold text-brand-600 shadow shadow-brand-100 active:scale-95"
          >
            ฉันคือ {names[key]}
          </button>
        ))}
      </div>
      <p className="max-w-xs text-xs text-gray-400">
        เลือกครั้งเดียว ระบบจะจำไว้ในเครื่องนี้ (แก้ไขทีหลังได้ที่หน้าตั้งค่า)
      </p>
    </div>
  );
}
