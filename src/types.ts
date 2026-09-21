export type PersonKey = 'a' | 'b';

export type SplitType = 'equal' | 'full' | 'personal' | 'settlement';

export type Category = 'อาหาร' | 'เดินทาง' | 'ของใช้' | 'อื่นๆ';

export interface RoomNames {
  a: string;
  b: string;
}

export interface DraftEntry {
  payer: PersonKey;
  description: string;
  category: Category;
  amountSatang: number;
  splitType: SplitType;
  spentAt: Date;
}

export interface Entry {
  id: string;
  roomId: string;
  createdAt: string;
  spentAt: string;
  payer: PersonKey;
  description: string;
  category: Category;
  amountSatang: number;
  splitType: SplitType;
  deletedAt: string | null;
}

export type ParseResult =
  | { ok: true; entry: DraftEntry }
  | { ok: false; question: string };
