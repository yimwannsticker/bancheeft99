import { useMemo, useState } from 'react';
import { useRoom } from '../context/RoomContext';
import { balanceSentence, cumulativeBalance, settlementSender, summarizeMonth } from '../lib/balance';
import { formatBaht } from '../lib/money';
import { monthKey, monthLabel, currentMonthKey, parseMonthKey } from '../lib/dateUtil';
import type { Category } from '../types';

const CATEGORY_COLORS: Record<Category, string> = {
  อาหาร: 'bg-amber-400',
  เดินทาง: 'bg-sky-400',
  ของใช้: 'bg-emerald-400',
  อื่นๆ: 'bg-gray-400',
};

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

export function SummaryPage() {
  const { entries, names, addEntry } = useRoom();
  const [settling, setSettling] = useState(false);

  const months = useMemo(() => {
    const set = new Set(entries.map((e) => monthKey(e.spentAt)));
    set.add(currentMonthKey());
    return [...set].sort().reverse();
  }, [entries]);

  const [selectedMonth, setSelectedMonth] = useState(months[0] ?? currentMonthKey());
  const { year, month } = parseMonthKey(selectedMonth);

  const summary = useMemo(() => summarizeMonth(entries, year, month), [entries, year, month]);
  const netBalance = useMemo(
    () => cumulativeBalance(entries, endOfMonth(year, month)),
    [entries, year, month],
  );

  const categoryEntries = Object.entries(summary.categoryTotalsSatang) as [Category, number][];
  const categoryTotal = categoryEntries.reduce((sum, [, v]) => sum + v, 0);
  const sender = settlementSender(netBalance);

  const handleSettle = async () => {
    if (!sender || netBalance === 0) return;
    setSettling(true);
    try {
      await addEntry({
        payer: sender,
        description: 'เคลียร์ยอด',
        category: 'อื่นๆ',
        amountSatang: Math.abs(netBalance),
        splitType: 'settlement',
        spentAt: new Date(),
      });
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </select>

      <div className="mt-4 rounded-2xl bg-white p-5 text-center shadow-sm">
        <p className="text-xs text-gray-400">ยอดค้างสะสม (รวมเดือนก่อนหน้าที่ยังไม่เคลียร์)</p>
        <p className="mt-2 text-lg font-bold text-brand-600">{balanceSentence(netBalance, names)}</p>
        {sender && (
          <button
            onClick={handleSettle}
            disabled={settling}
            className="mt-4 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
          >
            {settling ? 'กำลังบันทึก...' : `เคลียร์ยอด (บันทึกว่า${names[sender]}โอนแล้ว)`}
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400">{names.a} จ่ายรวม</p>
          <p className="mt-1 text-lg font-semibold text-gray-700">{formatBaht(summary.totalPaidSatang.a)} ฿</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400">{names.b} จ่ายรวม</p>
          <p className="mt-1 text-lg font-semibold text-gray-700">{formatBaht(summary.totalPaidSatang.b)} ฿</p>
        </div>
        <div className="col-span-2 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400">ค่าใช้จ่ายร่วม (หารครึ่ง + จ่ายเต็มแทน) เดือนนี้</p>
          <p className="mt-1 text-lg font-semibold text-gray-700">{formatBaht(summary.totalSharedSatang)} ฿</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-600">สัดส่วนตามหมวดหมู่</p>
        {categoryEntries.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีรายการเดือนนี้</p>}
        <div className="space-y-2">
          {categoryEntries
            .sort((a, b) => b[1] - a[1])
            .map(([category, satang]) => {
              const pct = categoryTotal === 0 ? 0 : Math.round((satang / categoryTotal) * 100);
              return (
                <div key={category}>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{category}</span>
                    <span>
                      {formatBaht(satang)} ฿ ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full ${CATEGORY_COLORS[category]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
