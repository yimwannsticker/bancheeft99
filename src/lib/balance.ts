import type { Entry, PersonKey, RoomNames } from '../types';
import { formatBaht } from './money';

type ContributionInput = Pick<Entry, 'splitType' | 'amountSatang' | 'payer'>;

/**
 * มูลค่าที่ทำให้ "a ติดหนี้ b" เปลี่ยนไปจากรายการนี้ (บวก = a ติด b เพิ่ม, ลบ = a ติด b น้อยลง).
 * ทั้งรายการหารครึ่ง/จ่ายเต็มแทน/โอนเงินคืน ใช้สูตรเดียวกัน: เงินที่ไหลจาก a ไป b ทำให้ a ติด b น้อยลง
 * ต่างกันแค่ "จำนวนเงินที่มีผล" (effective amount) ตามประเภทรายการ
 */
export function entryContribution(entry: ContributionInput): number {
  if (entry.splitType === 'personal') return 0;
  const effective = entry.splitType === 'equal' ? Math.floor(entry.amountSatang / 2) : entry.amountSatang;
  return entry.payer === 'a' ? -effective : effective;
}

function isActive(entry: Entry): boolean {
  return entry.deletedAt === null || entry.deletedAt === undefined;
}

/** ยอดค้างสะสมทั้งหมด (a ติด b เท่าไหร่ ถ้าติดลบคือ b ติด a) นับทุกรายการที่ยังไม่ถูกลบ จนถึงเวลาที่กำหนด (ไม่ระบุ = ทั้งหมด) */
export function cumulativeBalance(entries: Entry[], upTo?: Date): number {
  return entries
    .filter(isActive)
    .filter((e) => !upTo || new Date(e.spentAt).getTime() <= upTo.getTime())
    .reduce((sum, e) => sum + entryContribution(e), 0);
}

export interface MonthSummary {
  /** ยอดที่แต่ละคนควักจ่ายจริงในเดือนนี้ (ไม่รวมรายการโอนคืน) */
  totalPaidSatang: Record<PersonKey, number>;
  /** ยอดค่าใช้จ่ายร่วม (หารครึ่ง + จ่ายเต็มแทน) ในเดือนนี้ */
  totalSharedSatang: number;
  /** สัดส่วนตามหมวดหมู่ในเดือนนี้ (ไม่รวมรายการโอนคืน) */
  categoryTotalsSatang: Record<string, number>;
  /** ยอดที่เปลี่ยนแปลงเฉพาะเดือนนี้ (a ติด b เพิ่มขึ้นเท่าไหร่) */
  monthNetChangeSatang: number;
}

export function summarizeMonth(entries: Entry[], year: number, month: number): MonthSummary {
  const monthEntries = entries.filter((e) => {
    if (!isActive(e)) return false;
    const d = new Date(e.spentAt);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  const totalPaidSatang: Record<PersonKey, number> = { a: 0, b: 0 };
  const categoryTotalsSatang: Record<string, number> = {};
  let totalSharedSatang = 0;
  let monthNetChangeSatang = 0;

  for (const entry of monthEntries) {
    if (entry.splitType !== 'settlement') {
      totalPaidSatang[entry.payer] += entry.amountSatang;
      categoryTotalsSatang[entry.category] = (categoryTotalsSatang[entry.category] ?? 0) + entry.amountSatang;
    }
    if (entry.splitType === 'equal' || entry.splitType === 'full') {
      totalSharedSatang += entry.amountSatang;
    }
    monthNetChangeSatang += entryContribution(entry);
  }

  return { totalPaidSatang, totalSharedSatang, categoryTotalsSatang, monthNetChangeSatang };
}

/** ประโยคสรุปว่าใครต้องโอนให้ใครเท่าไหร่ จาก netBalance (a ติด b) */
export function balanceSentence(netBalanceSatang: number, names: RoomNames): string {
  if (netBalanceSatang === 0) return 'เคลียร์กันพอดี ไม่มีใครติดใคร 🎉';
  if (netBalanceSatang > 0) {
    return `${names.a} ต้องโอนให้ ${names.b} ${formatBaht(netBalanceSatang)} บาท`;
  }
  return `${names.b} ต้องโอนให้ ${names.a} ${formatBaht(-netBalanceSatang)} บาท`;
}

/** ใครควรเป็นผู้โอนเงินถ้ากด "เคลียร์ยอด" ตอนนี้ (ผู้ที่ติดหนี้อยู่) */
export function settlementSender(netBalanceSatang: number): PersonKey | null {
  if (netBalanceSatang === 0) return null;
  return netBalanceSatang > 0 ? 'a' : 'b';
}
