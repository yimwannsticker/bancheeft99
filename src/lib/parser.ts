import type { Category, DraftEntry, ParseResult, PersonKey, RoomNames } from '../types';

export interface ParseContext {
  names: RoomNames;
  /** device owner used as payer when the message doesn't name anyone */
  selfKey: PersonKey;
  now: Date;
}

const CATEGORY_KEYWORDS: Record<Exclude<Category, 'อื่นๆ'>, string[]> = {
  อาหาร: [
    'ข้าว', 'กับข้าว', 'ส้มตำ', 'ก๋วยเตี๋ยว', 'ก๋วยจั๊บ', 'กาแฟ', 'ชานม', 'ร้านอาหาร',
    'อาหาร', 'ขนม', 'บุฟเฟ่ต์', 'ชาบู', 'หมูกระทะ', 'นม', 'เครื่องดื่ม', 'ผลไม้',
    'ของกิน', 'มื้อเที่ยง', 'มื้อเย็น', 'มื้อเช้า', 'สุกี้', 'พิซซ่า', 'เบียร์',
  ],
  เดินทาง: [
    'แท็กซี่', 'แกร็บ', 'grab', 'รถไฟฟ้า', 'บีทีเอส', 'bts', 'mrt', 'น้ำมัน',
    'วินมอไซค์', 'มอเตอร์ไซค์', 'ทางด่วน', 'ตั๋วเครื่องบิน', 'รถทัวร์', 'จอดรถ', 'รถเมล์',
  ],
  ของใช้: [
    'ของใช้', 'สบู่', 'แชมพู', 'กระดาษทิชชู่', 'ผงซักฟอก', 'ยาสีฟัน', 'เซเว่น',
    'โลตัส', 'บิ๊กซี', 'ซุปเปอร์มาร์เก็ต', 'น้ำยาซักผ้า',
  ],
};

function detectCategory(description: string): Category {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [Exclude<Category, 'อื่นๆ'>, string[]][]) {
    if (keywords.some((keyword) => lower.includes(keyword.toLowerCase()))) {
      return category;
    }
  }
  return 'อื่นๆ';
}

function resolveName(token: string, names: RoomNames): PersonKey | null {
  const clean = token.replace(/[,:：、]/g, '').trim();
  if (!clean) return null;
  if (clean === names.a) return 'a';
  if (clean === names.b) return 'b';
  return null;
}

const MONEY_RE = /(฿\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?บาท|\d[\d,]*(?:\.\d+)?)/g;

interface AmountResult {
  ok: true;
  amountBaht: number;
  remainingText: string;
}

interface AmountError {
  ok: false;
  question: string;
}

function extractAmount(text: string): AmountResult | AmountError {
  const matches = [...text.matchAll(MONEY_RE)];
  if (matches.length === 0) {
    return { ok: false, question: 'ไม่พบจำนวนเงินเลย ลองพิมพ์ตัวเลขจำนวนเงินด้วยนะ เช่น "ส้มตำ 60"' };
  }

  const marked = matches.filter((m) => /฿|บาท/.test(m[0]));
  let chosen: RegExpMatchArray;
  if (matches.length === 1) {
    chosen = matches[0];
  } else if (marked.length === 1) {
    chosen = marked[0];
  } else {
    const numbersText = matches.map((m) => m[0].trim()).join(', ');
    return {
      ok: false,
      question: `เจอตัวเลขหลายตัว (${numbersText}) ช่วยพิมพ์ระบุจำนวนเงินให้ชัดเจนกว่านี้ได้ไหม เช่น ใส่ "บาท" ต่อท้ายจำนวนเงินที่ใช่`,
    };
  }

  const rawNum = chosen[0].replace(/[฿บาท,\s]/g, '');
  const amountBaht = parseFloat(rawNum);
  if (Number.isNaN(amountBaht) || amountBaht <= 0) {
    return { ok: false, question: 'จำนวนเงินดูไม่ถูกต้อง ลองพิมพ์ใหม่อีกครั้งนะ' };
  }

  const index = chosen.index ?? 0;
  const remainingText = (text.slice(0, index) + text.slice(index + chosen[0].length))
    .replace(/\s+/g, ' ')
    .trim();

  return { ok: true, amountBaht, remainingText };
}

function unknownNameQuestion(token: string, names: RoomNames): string {
  return `ไม่รู้จักชื่อ "${token}" ลองพิมพ์ชื่อ "${names.a}" หรือ "${names.b}" นะ`;
}

export function parseMessage(raw: string, ctx: ParseContext): ParseResult {
  let text = raw.trim();
  if (!text) {
    return { ok: false, question: 'พิมพ์อะไรสักอย่างก่อนนะ เช่น "ส้มตำ 60"' };
  }

  let spentAt = new Date(ctx.now);
  if (/เมื่อวาน/.test(text)) {
    spentAt = new Date(spentAt);
    spentAt.setDate(spentAt.getDate() - 1);
    text = text.replace(/เมื่อวาน/g, '').replace(/\s+/g, ' ').trim();
  }

  // --- settlement: "<ผู้โอน> โอนให้ <ผู้รับ> <จำนวนเงิน>"
  const settleWithReceiver = text.match(
    /^(\S+)\s+(?:โอนเงินให้|โอนให้|โอนคืนให้|คืนเงินให้)\s+(\S+)\s*(.*)$/,
  );
  if (settleWithReceiver) {
    const [, senderTok, receiverTok, remainder] = settleWithReceiver;
    const senderKey = resolveName(senderTok, ctx.names);
    if (!senderKey) return { ok: false, question: unknownNameQuestion(senderTok, ctx.names) };
    const receiverKey = resolveName(receiverTok, ctx.names);
    if (!receiverKey) return { ok: false, question: unknownNameQuestion(receiverTok, ctx.names) };
    if (senderKey === receiverKey) {
      return { ok: false, question: 'โอนหาตัวเองไม่ได้นะ ลองเช็คชื่ออีกที' };
    }
    const amountResult = extractAmount(remainder);
    if (!amountResult.ok) return amountResult;
    const entry: DraftEntry = {
      payer: senderKey,
      description: `โอนเงินให้${ctx.names[receiverKey]}`,
      category: 'อื่นๆ',
      amountSatang: Math.round(amountResult.amountBaht * 100),
      splitType: 'settlement',
      spentAt,
    };
    return { ok: true, entry };
  }

  // --- settlement: "<ผู้โอน> เคลียร์[ยอด] <จำนวนเงิน>" (ผู้รับ = อีกฝั่ง)
  const settleClear = text.match(/^(\S+)\s+เคลียร์(?:ยอด)?\s*(.*)$/);
  if (settleClear) {
    const [, senderTok, remainder] = settleClear;
    const senderKey = resolveName(senderTok, ctx.names);
    if (!senderKey) return { ok: false, question: unknownNameQuestion(senderTok, ctx.names) };
    const amountResult = extractAmount(remainder);
    if (!amountResult.ok) return amountResult;
    const entry: DraftEntry = {
      payer: senderKey,
      description: 'เคลียร์ยอด',
      category: 'อื่นๆ',
      amountSatang: Math.round(amountResult.amountBaht * 100),
      splitType: 'settlement',
      spentAt,
    };
    return { ok: true, entry };
  }

  // --- modifiers: ส่วนตัว (personal) / แทน,ให้ ต่อท้าย (full)
  let splitType: DraftEntry['splitType'] = 'equal';
  if (/ส่วนตัว\s*$/.test(text)) {
    splitType = 'personal';
    text = text.replace(/ส่วนตัว\s*$/, '').trim();
  } else if (/(?:แทน|ให้)\s*$/.test(text)) {
    splitType = 'full';
    text = text.replace(/(?:แทน|ให้)\s*$/, '').trim();
  }

  const amountResult = extractAmount(text);
  if (!amountResult.ok) return amountResult;
  const { amountBaht, remainingText } = amountResult;

  let payer: PersonKey = ctx.selfKey;
  let rest = remainingText;
  const firstWordMatch = rest.match(/^(\S+)/);
  if (firstWordMatch) {
    const afterFirst = rest.slice(firstWordMatch[0].length).trim();
    const looksLikeNamedPayer = /^จ่าย(\s+|$)/.test(afterFirst);
    const key = resolveName(firstWordMatch[1], ctx.names);
    if (key) {
      payer = key;
      rest = afterFirst.replace(/^จ่าย\s*/, '').trim();
    } else if (looksLikeNamedPayer) {
      // ดูเหมือนตั้งใจระบุชื่อคนจ่ายตามด้วยคำว่า "จ่าย" แต่ชื่อนี้ไม่รู้จัก -> ถามกลับแทนการเดา
      return { ok: false, question: unknownNameQuestion(firstWordMatch[1], ctx.names) };
    } else if (/^จ่าย(\s+|$)/.test(rest)) {
      rest = rest.replace(/^จ่าย\s*/, '').trim();
    }
  }

  const description = rest.trim();
  if (!description) {
    return { ok: false, question: 'ไม่เห็นชื่อรายการเลย ลองพิมพ์ใหม่ เช่น "ส้มตำ 60" นะ' };
  }

  const entry: DraftEntry = {
    payer,
    description,
    category: detectCategory(description),
    amountSatang: Math.round(amountBaht * 100),
    splitType,
    spentAt,
  };
  return { ok: true, entry };
}
