export function dashboardPageTitle(pathname: string, sectionLabel?: string): string {
  const rawTitle = pathname.split('/').filter(Boolean).at(-1) ?? 'dashboard';
  if (/^\d+$/.test(rawTitle)) return sectionLabel ?? 'Details';
  return rawTitle.replace(/-/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
}
