import { useMemo, useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { formatBaht } from '../lib/money';
import { formatDateThai, splitTypeLabel } from '../lib/format';
import { entryContribution } from '../lib/balance';
import { monthKey, monthLabel } from '../lib/dateUtil';
import { EntryEditForm } from '../components/EntryEditForm';
import type { Entry } from '../types';

function toCsv(entries: Entry[], names: { a: string; b: string }): string {
  const header = ['วันที่', 'ใครจ่าย', 'รายการ', 'หมวด', 'จำนวนเงิน (บาท)', 'รูปแบบหาร', 'อีกคนติด (บาท)'];
  const rows = entries.map((e) => {
    const owed = e.splitType === 'personal' || e.splitType === 'settlement' ? 0 : Math.abs(entryContribution(e)) / 100;
    return [
      new Date(e.spentAt).toLocaleDateString('th-TH'),
      names[e.payer],
      e.description,
      e.category,
      String(e.amountSatang / 100),
      splitTypeLabel(e.splitType),
      String(owed),
    ];
  });
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
}

export function TablePage() {
  const { entries, names, editEntry, deleteEntry } = useRoom();
  const [editingId, setEditingId] = useState<string | null>(null);

  const months = useMemo(() => {
    const set = new Set(entries.map((e) => monthKey(e.spentAt)));
    return [...set].sort().reverse();
  }, [entries]);

  const [selectedMonth, setSelectedMonth] = useState<string | 'all'>(months[0] ?? 'all');

  const filtered = useMemo(() => {
    const list = selectedMonth === 'all' ? entries : entries.filter((e) => monthKey(e.spentAt) === selectedMonth);
    return [...list].sort((a, b) => new Date(b.spentAt).getTime() - new Date(a.spentAt).getTime());
  }, [entries, selectedMonth]);

  const exportCsv = () => {
    const csv = toCsv(filtered, names);
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bancheeft-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white p-3">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value as string | 'all')}
          className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        >
          <option value="all">ทุกเดือน</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <button onClick={exportCsv} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
          Export CSV
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 && <p className="mt-6 text-center text-sm text-gray-400">ยังไม่มีรายการ</p>}
        <div className="space-y-2">
          {filtered.map((entry) =>
            editingId === entry.id ? (
              <EntryEditForm
                key={entry.id}
                entry={entry}
                names={names}
                onSave={async (patch) => {
                  await editEntry(entry.id, patch);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div key={entry.id} className="rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{formatDateThai(entry.spentAt)}</span>
                  <span>{splitTypeLabel(entry.splitType)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">
                      {names[entry.payer]} · {entry.description}
                    </p>
                    <p className="text-xs text-gray-400">{entry.category}</p>
                  </div>
                  <p className="font-semibold text-brand-600">{formatBaht(entry.amountSatang)} ฿</p>
                </div>
                <div className="mt-2 flex gap-3 text-xs">
                  <button onClick={() => setEditingId(entry.id)} className="text-brand-600 underline">
                    แก้ไข
                  </button>
                  <button onClick={() => deleteEntry(entry.id)} className="text-red-500 underline">
                    ลบ
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
