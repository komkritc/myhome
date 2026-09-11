export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
}

export const THAI_MONTHS = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export function formatMonthYear(month: number, year: number): string {
  return `${THAI_MONTHS[month] || ''} / ${String(year).slice(2)}`;
}
