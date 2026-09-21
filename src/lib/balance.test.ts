import { describe, expect, it } from 'vitest';
import { balanceSentence, cumulativeBalance, entryContribution, settlementSender, summarizeMonth } from './balance';
import type { Entry } from '../types';

let seq = 0;
function makeEntry(overrides: Partial<Entry>): Entry {
  seq += 1;
  return {
    id: `e${seq}`,
    roomId: 'room1',
    createdAt: '2026-01-01T00:00:00Z',
    spentAt: '2026-01-15T00:00:00Z',
    payer: 'a',
    description: 'ทดสอบ',
    category: 'อื่นๆ',
    amountSatang: 10000,
    splitType: 'equal',
    deletedAt: null,
    ...overrides,
  };
}

const names = { a: 'เตย', b: 'เฟิร์ส' };

describe('entryContribution', () => {
  it('หารครึ่ง: a จ่าย -> b ติด a ครึ่งหนึ่ง (a ติด b ลดลง)', () => {
    const e = makeEntry({ payer: 'a', amountSatang: 6000, splitType: 'equal' });
    expect(entryContribution(e)).toBe(-3000);
  });

  it('หารครึ่ง: b จ่าย -> a ติด b ครึ่งหนึ่ง', () => {
    const e = makeEntry({ payer: 'b', amountSatang: 6000, splitType: 'equal' });
    expect(entryContribution(e)).toBe(3000);
  });

  it('หารครึ่งจำนวนคี่สตางค์ -> ปัดเศษลง ผู้จ่ายรับส่วนเกิน 1 สตางค์', () => {
    const e = makeEntry({ payer: 'a', amountSatang: 61, splitType: 'equal' });
    expect(entryContribution(e)).toBe(-30);
  });

  it('จ่ายเต็มแทน (full): a จ่าย -> b ติดเต็มจำนวน', () => {
    const e = makeEntry({ payer: 'a', amountSatang: 12000, splitType: 'full' });
    expect(entryContribution(e)).toBe(-12000);
  });

  it('ส่วนตัว (personal) -> ไม่มีผลต่อยอด', () => {
    const e = makeEntry({ payer: 'a', amountSatang: 50000, splitType: 'personal' });
    expect(entryContribution(e)).toBe(0);
  });

  it('โอนคืน (settlement): b โอนให้ a -> a ติด b ลดลงเท่าจำนวนที่โอน', () => {
    const e = makeEntry({ payer: 'b', amountSatang: 50000, splitType: 'settlement' });
    expect(entryContribution(e)).toBe(50000);
  });
});

describe('cumulativeBalance', () => {
  it('รวมยอดข้ามเดือนได้ถูกต้อง', () => {
    const entries = [
      makeEntry({ payer: 'a', amountSatang: 10000, splitType: 'equal', spentAt: '2026-01-05T00:00:00Z' }), // a owes b -5000... wait contribution is -5000 meaning a owes b LESS; need concrete scenario
    ];
    // a จ่าย 100 บาทหารครึ่ง -> b ติด a 50 บาท -> a ติด b ลดลง 50 บาท (net -5000)
    expect(cumulativeBalance(entries)).toBe(-5000);
  });

  it('รายการที่ถูกลบ (soft delete) ไม่ถูกนับ', () => {
    const entries = [
      makeEntry({ payer: 'a', amountSatang: 10000, splitType: 'equal' }),
      makeEntry({ payer: 'b', amountSatang: 10000, splitType: 'equal', deletedAt: '2026-01-16T00:00:00Z' }),
    ];
    // เหลือแค่รายการแรก: a จ่าย 100 หารครึ่ง -> net = -5000
    expect(cumulativeBalance(entries)).toBe(-5000);
  });

  it('ยอดค้างสะสมข้ามเดือน + หักรายการโอนคืน', () => {
    const entries = [
      // เดือน 1: a จ่ายค่าอาหารหารครึ่ง 1000 บาท -> b ติด a 500 -> net -50000
      makeEntry({ payer: 'a', amountSatang: 100000, splitType: 'equal', spentAt: '2026-01-10T00:00:00Z' }),
      // เดือน 2: b จ่ายเต็มแทน 200 บาท -> a ติด b 200 -> net +20000
      makeEntry({ payer: 'b', amountSatang: 20000, splitType: 'full', spentAt: '2026-02-10T00:00:00Z' }),
    ];
    // สะสม: -50000 + 20000 = -30000 (b ยังติด a อยู่ 300 บาท)
    expect(cumulativeBalance(entries)).toBe(-30000);

    // สมมติ b โอนคืนให้ a 300 บาท เพื่อเคลียร์ยอด
    const settled = [
      ...entries,
      makeEntry({ payer: 'b', amountSatang: 30000, splitType: 'settlement', spentAt: '2026-02-15T00:00:00Z' }),
    ];
    expect(cumulativeBalance(settled)).toBe(0);
  });
});

describe('summarizeMonth', () => {
  it('แยกยอดตามเดือน ไม่ปนกับเดือนอื่น', () => {
    const entries = [
      makeEntry({ payer: 'a', amountSatang: 10000, category: 'อาหาร', spentAt: '2026-01-10T00:00:00Z' }),
      makeEntry({ payer: 'b', amountSatang: 20000, category: 'เดินทาง', spentAt: '2026-02-10T00:00:00Z' }),
    ];
    const jan = summarizeMonth(entries, 2026, 1);
    expect(jan.totalPaidSatang.a).toBe(10000);
    expect(jan.totalPaidSatang.b).toBe(0);
    expect(jan.categoryTotalsSatang['อาหาร']).toBe(10000);
    expect(jan.categoryTotalsSatang['เดินทาง']).toBeUndefined();
  });

  it('รายการโอนคืนไม่นับเป็นยอดจ่าย/หมวดหมู่ แต่มีผลต่อ net change', () => {
    const entries = [
      makeEntry({ payer: 'b', amountSatang: 30000, splitType: 'settlement', spentAt: '2026-01-15T00:00:00Z' }),
    ];
    const jan = summarizeMonth(entries, 2026, 1);
    expect(jan.totalPaidSatang.b).toBe(0);
    expect(Object.keys(jan.categoryTotalsSatang)).toHaveLength(0);
    expect(jan.monthNetChangeSatang).toBe(30000);
  });

  it('ยอดค่าใช้จ่ายร่วมนับเฉพาะ equal และ full', () => {
    const entries = [
      makeEntry({ payer: 'a', amountSatang: 10000, splitType: 'equal', spentAt: '2026-01-01T00:00:00Z' }),
      makeEntry({ payer: 'a', amountSatang: 5000, splitType: 'personal', spentAt: '2026-01-02T00:00:00Z' }),
      makeEntry({ payer: 'b', amountSatang: 20000, splitType: 'full', spentAt: '2026-01-03T00:00:00Z' }),
    ];
    const jan = summarizeMonth(entries, 2026, 1);
    expect(jan.totalSharedSatang).toBe(30000);
  });
});

describe('balanceSentence', () => {
  it('a ติด b (netBalance บวก)', () => {
    expect(balanceSentence(123500, names)).toBe('เตย ต้องโอนให้ เฟิร์ส 1,235 บาท');
  });

  it('b ติด a (netBalance ลบ)', () => {
    expect(balanceSentence(-50000, names)).toBe('เฟิร์ส ต้องโอนให้ เตย 500 บาท');
  });

  it('เท่ากันพอดี', () => {
    expect(balanceSentence(0, names)).toMatch(/เคลียร์กันพอดี/);
  });
});

describe('settlementSender', () => {
  it('a ติด b -> a เป็นคนต้องโอน', () => {
    expect(settlementSender(50000)).toBe('a');
  });
  it('b ติด a -> b เป็นคนต้องโอน', () => {
    expect(settlementSender(-50000)).toBe('b');
  });
  it('เท่ากันพอดี -> ไม่มีใครต้องโอน', () => {
    expect(settlementSender(0)).toBeNull();
  });
});
