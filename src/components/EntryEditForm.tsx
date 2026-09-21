import { useState } from 'react';
import type { Category, DraftEntry, Entry, PersonKey, RoomNames, SplitType } from '../types';
import { satangToBaht, bahtToSatang } from '../lib/money';

const CATEGORIES: Category[] = ['อาหาร', 'เดินทาง', 'ของใช้', 'อื่นๆ'];
const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: 'equal', label: 'หารครึ่ง' },
  { value: 'full', label: 'จ่ายเต็มแทน' },
  { value: 'personal', label: 'ส่วนตัว' },
  { value: 'settlement', label: 'โอนคืน' },
];

function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function EntryEditForm({
  entry,
  names,
  onSave,
  onCancel,
}: {
  entry: Entry;
  names: RoomNames;
  onSave: (patch: Partial<DraftEntry>) => void;
  onCancel: () => void;
}) {
  const [payer, setPayer] = useState<PersonKey>(entry.payer);
  const [description, setDescription] = useState(entry.description);
  const [amountBaht, setAmountBaht] = useState(String(satangToBaht(entry.amountSatang)));
  const [category, setCategory] = useState<Category>(entry.category);
  const [splitType, setSplitType] = useState<SplitType>(entry.splitType);
  const [dateValue, setDateValue] = useState(toDateInputValue(entry.spentAt));

  const submit = () => {
    const baht = parseFloat(amountBaht);
    if (Number.isNaN(baht) || baht <= 0) return;
    onSave({
      payer,
      description: description.trim() || entry.description,
      amountSatang: bahtToSatang(baht),
      category,
      splitType,
      spentAt: new Date(`${dateValue}T12:00:00`),
    });
  };

  return (
    <div className="space-y-3 rounded-xl bg-white p-3 shadow">
      <div className="flex gap-2">
        {(['a', 'b'] as PersonKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setPayer(key)}
            className={`flex-1 rounded-lg border px-2 py-1.5 text-sm ${
              payer === key ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-500'
            }`}
          >
            {names[key]}
          </button>
        ))}
      </div>

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="รายการ"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />

      <div className="flex gap-2">
        <input
          value={amountBaht}
          onChange={(e) => setAmountBaht(e.target.value)}
          inputMode="decimal"
          placeholder="จำนวนเงิน (บาท)"
          className="w-1/2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
          className="w-1/2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as Category)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2">
        {SPLIT_TYPES.map((s) => (
          <button
            key={s.value}
            onClick={() => setSplitType(s.value)}
            className={`rounded-lg border px-2 py-1.5 text-xs ${
              splitType === s.value ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-500'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={submit} className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white">
          บันทึก
        </button>
        <button onClick={onCancel} className="flex-1 rounded-lg bg-gray-100 py-2 text-sm text-gray-500">
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
