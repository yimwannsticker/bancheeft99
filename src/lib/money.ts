export function satangToBaht(satang: number): number {
  return satang / 100;
}

export function bahtToSatang(baht: number): number {
  return Math.round(baht * 100);
}

/** จัดรูปแบบสตางค์เป็นข้อความบาทแบบไทย เช่น 123456 -> "1,234.56" */
export function formatBaht(satang: number): string {
  const sign = satang < 0 ? '-' : '';
  const baht = satangToBaht(Math.abs(satang));
  const hasCents = Math.round(baht * 100) % 100 !== 0;
  return (
    sign +
    baht.toLocaleString('th-TH', {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}
