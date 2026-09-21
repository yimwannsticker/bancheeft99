import { describe, expect, it } from 'vitest';
import { parseMessage, type ParseContext } from './parser';

const NOW = new Date('2026-09-21T12:00:00+07:00');

function ctx(overrides: Partial<ParseContext> = {}): ParseContext {
  return {
    names: { a: 'เตย', b: 'เฟิร์ส' },
    selfKey: 'a',
    now: NOW,
    ...overrides,
  };
}

function expectOk(result: ReturnType<typeof parseMessage>) {
  if (!result.ok) throw new Error(`expected ok, got question: ${result.question}`);
  return result.entry;
}

function expectFail(result: ReturnType<typeof parseMessage>) {
  if (result.ok) throw new Error('expected failure, got entry');
  return result.question;
}

describe('parseMessage - รูปแบบหลัก', () => {
  it('ชื่อ จ่าย รายการ จำนวนเงิน -> หารครึ่ง', () => {
    const entry = expectOk(parseMessage('เตย จ่าย ส้มตำ 60', ctx()));
    expect(entry.payer).toBe('a');
    expect(entry.description).toBe('ส้มตำ');
    expect(entry.category).toBe('อาหาร');
    expect(entry.amountSatang).toBe(6000);
    expect(entry.splitType).toBe('equal');
  });

  it('ไม่ระบุชื่อ -> ใช้เจ้าของเครื่อง', () => {
    const entry = expectOk(parseMessage('ส้มตำ 60', ctx({ selfKey: 'b' })));
    expect(entry.payer).toBe('b');
    expect(entry.description).toBe('ส้มตำ');
    expect(entry.splitType).toBe('equal');
  });

  it('คำว่า "จ่าย" ตัดออกได้ (มีชื่อแต่ไม่มีจ่าย)', () => {
    const entry = expectOk(parseMessage('เตย ส้มตำ 60', ctx()));
    expect(entry.payer).toBe('a');
    expect(entry.description).toBe('ส้มตำ');
  });

  it('มีคำว่า "จ่าย" แต่ไม่มีชื่อ ก็ยังพาร์สได้', () => {
    const entry = expectOk(parseMessage('จ่าย ส้มตำ 60', ctx({ selfKey: 'a' })));
    expect(entry.payer).toBe('a');
    expect(entry.description).toBe('ส้มตำ');
  });

  it('ตัวปรับ "แทน" -> จ่ายเต็มให้อีกคน (full)', () => {
    const entry = expectOk(parseMessage('เตย จ่าย แท็กซี่ 120 แทน', ctx()));
    expect(entry.payer).toBe('a');
    expect(entry.description).toBe('แท็กซี่');
    expect(entry.category).toBe('เดินทาง');
    expect(entry.amountSatang).toBe(12000);
    expect(entry.splitType).toBe('full');
  });

  it('ตัวปรับ "ให้" ต่อท้าย -> จ่ายเต็มให้อีกคน (full)', () => {
    const entry = expectOk(parseMessage('เตย จ่าย แท็กซี่ 120 ให้', ctx()));
    expect(entry.splitType).toBe('full');
    expect(entry.amountSatang).toBe(12000);
  });

  it('ตัวปรับ "ส่วนตัว" -> ไม่นำไปคิดยอด (personal)', () => {
    const entry = expectOk(parseMessage('เตย จ่าย เสื้อ 500 ส่วนตัว', ctx()));
    expect(entry.splitType).toBe('personal');
    expect(entry.description).toBe('เสื้อ');
    expect(entry.amountSatang).toBe(50000);
  });

  it('"โอนให้" -> รายการโอนคืน (settlement)', () => {
    const entry = expectOk(parseMessage('เฟิร์ส โอนให้ เตย 500', ctx()));
    expect(entry.payer).toBe('b');
    expect(entry.splitType).toBe('settlement');
    expect(entry.amountSatang).toBe(50000);
    expect(entry.description).toContain('เตย');
  });

  it('"เคลียร์" -> รายการโอนคืนเช่นกัน โดยไม่ต้องระบุผู้รับ', () => {
    const entry = expectOk(parseMessage('เฟิร์ส เคลียร์ 500', ctx()));
    expect(entry.payer).toBe('b');
    expect(entry.splitType).toBe('settlement');
    expect(entry.amountSatang).toBe(50000);
  });
});

describe('parseMessage - รูปแบบจำนวนเงิน', () => {
  it.each([
    ['เตย จ่าย ของ 60', 6000],
    ['เตย จ่าย ของ 1,200', 120000],
    ['เตย จ่าย ของ 60.50', 6050],
    ['เตย จ่าย ของ 60บาท', 6000],
    ['เตย จ่าย ของ ฿60', 6000],
  ])('รองรับรูปแบบ %s', (input, expectedSatang) => {
    const entry = expectOk(parseMessage(input, ctx()));
    expect(entry.amountSatang).toBe(expectedSatang);
  });
});

describe('parseMessage - วันที่', () => {
  it('ไม่ระบุวันที่ -> ใช้เวลาปัจจุบัน', () => {
    const entry = expectOk(parseMessage('เตย จ่าย ส้มตำ 60', ctx()));
    expect(entry.spentAt.getTime()).toBe(NOW.getTime());
  });

  it('"เมื่อวาน" -> ใช้วันก่อนหน้า', () => {
    const entry = expectOk(parseMessage('เตย จ่าย ส้มตำ 60 เมื่อวาน', ctx()));
    const expected = new Date(NOW);
    expected.setDate(expected.getDate() - 1);
    expect(entry.spentAt.getDate()).toBe(expected.getDate());
    expect(entry.description).toBe('ส้มตำ');
  });
});

describe('parseMessage - หมวดหมู่อัตโนมัติ', () => {
  it.each([
    ['เตย จ่าย ส้มตำ 60', 'อาหาร'],
    ['เตย จ่าย แท็กซี่ 120', 'เดินทาง'],
    ['เตย จ่าย กระดาษทิชชู่ 90', 'ของใช้'],
    ['เตย จ่าย ค่าปรับจอดรถผิดที่ 500', 'เดินทาง'],
    ['เตย จ่าย ของขวัญวันเกิด 1000', 'อื่นๆ'],
  ])('%s -> %s', (input, expectedCategory) => {
    const entry = expectOk(parseMessage(input, ctx()));
    expect(entry.category).toBe(expectedCategory);
  });
});

describe('parseMessage - กรณีขอบ', () => {
  it('ชื่อผิด/ไม่รู้จัก -> ถามกลับ ไม่เดา', () => {
    const question = expectFail(parseMessage('ต้น จ่าย ส้มตำ 60', ctx()));
    expect(question).toMatch(/ไม่รู้จักชื่อ/);
  });

  it('ไม่มีตัวเลข -> ถามกลับ', () => {
    const question = expectFail(parseMessage('เตย จ่าย ส้มตำ', ctx()));
    expect(question).toMatch(/ไม่พบจำนวนเงิน/);
  });

  it('มีตัวเลขหลายตัวและกำกวม -> ถามกลับ ไม่เดา', () => {
    const question = expectFail(parseMessage('เตย จ่าย ที่จอดรถ 2 60', ctx()));
    expect(question).toMatch(/ตัวเลขหลายตัว/);
  });

  it('มีตัวเลขหลายตัวแต่มีตัวเดียวที่กำกับหน่วยเงิน -> เลือกตัวนั้น', () => {
    const entry = expectOk(parseMessage('เตย จ่าย ที่จอดรถ 2 ชม 60บาท', ctx()));
    expect(entry.amountSatang).toBe(6000);
  });

  it('ข้อความว่างเปล่า -> ถามกลับ', () => {
    const question = expectFail(parseMessage('   ', ctx()));
    expect(question).toBeTruthy();
  });

  it('ผู้รับในรายการโอนให้ ไม่รู้จัก -> ถามกลับ', () => {
    const question = expectFail(parseMessage('เฟิร์ส โอนให้ ต้น 500', ctx()));
    expect(question).toMatch(/ไม่รู้จักชื่อ/);
  });

  it('โอนหาตัวเอง -> ถามกลับ', () => {
    const question = expectFail(parseMessage('เตย โอนให้ เตย 500', ctx()));
    expect(question).toMatch(/ตัวเอง/);
  });

  it('จำนวนเงินเป็น 0 หรือติดลบ -> ถามกลับ', () => {
    const question = expectFail(parseMessage('เตย จ่าย ส้มตำ 0', ctx()));
    expect(question).toBeTruthy();
  });
});
