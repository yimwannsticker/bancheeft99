import type { Entry, PersonKey, RoomNames } from '../types';
import { formatBaht } from './money';

function other(key: PersonKey): PersonKey {
  return key === 'a' ? 'b' : 'a';
}

/** ประโยคสรุปรายการ ใช้แสดงใน bubble แชท และตาราง */
export function formatEntryLine(entry: Pick<Entry, 'payer' | 'description' | 'amountSatang' | 'splitType'>, names: RoomNames): string {
  const payerName = names[entry.payer];
  const otherName = names[other(entry.payer)];
  const amountText = formatBaht(entry.amountSatang);

  switch (entry.splitType) {
    case 'equal': {
      const half = formatBaht(Math.floor(entry.amountSatang / 2));
      return `${payerName} จ่าย ${amountText} บาท (${entry.description}) → ${otherName}ติด${payerName} ${half} บาท`;
    }
    case 'full':
      return `${payerName} จ่าย ${amountText} บาท (${entry.description}) → ${otherName}ติด${payerName} ${amountText} บาท ทั้งหมด`;
    case 'personal':
      return `${payerName} จ่าย ${amountText} บาท (${entry.description}) — ส่วนตัว ไม่นับยอด`;
    case 'settlement':
      return `${payerName} โอนให้ ${otherName} ${amountText} บาท (${entry.description})`;
    default:
      return `${payerName} จ่าย ${amountText} บาท (${entry.description})`;
  }
}

export function splitTypeLabel(splitType: Entry['splitType']): string {
  switch (splitType) {
    case 'equal':
      return 'หารครึ่ง';
    case 'full':
      return 'จ่ายเต็มแทน';
    case 'personal':
      return 'ส่วนตัว';
    case 'settlement':
      return 'โอนคืน';
    default:
      return splitType;
  }
}

export function formatDateThai(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

export function formatTimeThai(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}
