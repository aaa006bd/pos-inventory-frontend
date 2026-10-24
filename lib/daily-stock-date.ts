export const DAILY_STOCK_TIMEZONE = 'Asia/Dhaka' as const;

export function dailyStockBusinessDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DAILY_STOCK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatDailyStockDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));
}
