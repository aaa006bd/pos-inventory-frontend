'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'home' },
   { href: '/dashboard/inventory/sell', label: 'POS', icon: 'sell' },
  { href: '/dashboard/categories', label: 'Categories', icon: 'folder' },
  { href: '/dashboard/products', label: 'Products', icon: 'box' },
  { href: '/dashboard/inventory/list', label: 'Inventory List', icon: 'inventory' },
  { href: '/dashboard/inventory/receive', label: 'Receive', icon: 'receive' },
 
  { href: '/dashboard/sales/history', label: 'Sales History', icon: 'history' },
  { href: '/dashboard/inventory/adjust', label: 'Adjust', icon: 'adjust' },
  { href: '/dashboard/inventory/daily-stock', label: 'Daily Stock', icon: 'stock' },
  { href: '/dashboard/inventory/barcode', label: 'Barcode', icon: 'barcode' },
  { href: '/dashboard/suppliers', label: 'Suppliers', icon: 'folder' },
  { href: '/dashboard/finance', label: 'Finance', icon: 'finance' },
];

const icons: Record<string, ReactNode> = {
  home: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2 7-7 7 7 2 2M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-6 0h6" />
    </svg>
  ),
   sell: (
    <svg className="h-48 w-48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  folder: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  ),
  box: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  inventory: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  receive: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v10m0 0l-4-4m4 4l4-4M5 19h14" />
    </svg>
  ),
 
  adjust: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M5.5 9A8 8 0 0119 12m-.5 3A8 8 0 015 12" />
    </svg>
  ),
  stock: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19V9m7 10V5m7 14v-7M3 19h18" />
    </svg>
  ),
  barcode: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14M9 5v14M12 7v10M15 5v14M19 5v14" />
    </svg>
  ),
  finance: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  history: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

function isItemActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ThemeToggle({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-100"
    >
      {theme === 'dark' ? (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

function SidebarContent({
  pathname,
  userEmail,
  userLabel,
  userInitial,
  onNavClick,
  onLogout,
}: {
  pathname: string;
  userEmail: string;
  userLabel: string;
  userInitial: string;
  onNavClick?: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      {/* Brand */}
      <div className="border-b border-slate-100/90 dark:border-slate-700/90 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 dark:bg-slate-700 text-xs font-bold text-white">IP</span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 leading-none">Inventory</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">&amp; POS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = isItemActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavClick}
                  className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-950 dark:bg-slate-700 text-white shadow-[0_12px_28px_-18px_rgba(15,23,42,0.70)]'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/50 hover:text-slate-950 dark:hover:text-slate-100 hover:shadow-[0_8px_20px_-16px_rgba(15,23,42,0.30)]'
                  }`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-sky-50 dark:group-hover:bg-sky-900/30 group-hover:text-sky-700 dark:group-hover:text-sky-400'
                  }`}>
                    {icons[item.icon]}
                  </span>
                  <span className="truncate">{item.label}</span>
                  {isActive && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-100/90 dark:border-slate-700/90 p-3">
        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white/85 dark:bg-slate-800/85 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-sky-100 to-orange-100 dark:from-sky-900/50 dark:to-orange-900/50 text-xs font-bold text-slate-900 dark:text-slate-100">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{userLabel}</div>
            <div className="truncate text-[10px] text-slate-400 dark:text-slate-500">{userEmail}</div>
          </div>
          <button
            onClick={onLogout}
            title="Logout"
            className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-1.5 text-slate-400 transition hover:border-rose-200 dark:hover:border-rose-700 hover:text-rose-500"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/dashboard';
  const { token, user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !token) router.replace('/login');
  }, [loading, router, token]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleLogout = () => { logout(); router.replace('/login'); };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_32%),linear-gradient(160deg,#f8fafc_0%,#eef6ff_48%,#fff7ed_100%)] dark:bg-slate-950 px-6">
        <div className="flex flex-col items-center gap-4 text-slate-600 dark:text-slate-400">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.45)] backdrop-blur">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-sky-500 border-t-transparent" />
          </div>
          <p className="text-sm font-medium">Preparing your dashboard...</p>
        </div>
      </div>
    );
  }

  const segments = pathname.split('/').filter(Boolean);
  const rawTitle = segments.length ? segments[segments.length - 1] : 'dashboard';
  const pageTitle = rawTitle.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const activeItem = navItems.find((item) => isItemActive(pathname, item.href)) ?? navItems[0];
  const userEmail = user?.email ?? 'Signed-in user';
  const userLabel = user?.role
    ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
    : 'Workspace User';
  const userInitial = userEmail.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(249,115,22,0.12),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef6ff_48%,#fffaf5_100%)] dark:bg-slate-950 dark:bg-none text-slate-900 dark:text-slate-100">

      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-4 left-4 z-30 hidden w-56 flex-col overflow-hidden rounded-[28px] border border-white/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.38)] backdrop-blur lg:flex">
        <SidebarContent
          pathname={pathname}
          userEmail={userEmail}
          userLabel={userLabel}
          userInitial={userInitial}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Mobile drawer backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col overflow-hidden border-r border-white/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-200"
          aria-label="Close menu"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <SidebarContent
          pathname={pathname}
          userEmail={userEmail}
          userLabel={userLabel}
          userInitial={userInitial}
          onNavClick={() => setSidebarOpen(false)}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="sticky top-0 z-30 lg:hidden">
        <header className="border-b border-white/70 dark:border-slate-700/70 bg-white/85 dark:bg-slate-900/85 px-4 py-3.5 shadow-[0_16px_35px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-100"
              aria-label="Open menu"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 leading-none mb-0.5">
                Inventory &amp; POS
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{pageTitle}</div>
            </div>

            <ThemeToggle theme={theme} onToggle={toggleTheme} />

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 dark:bg-slate-700 text-white shrink-0">
              {icons[activeItem.icon]}
            </div>
          </div>
        </header>
      </div>

      {/* ── Main content ── */}
      <div className="min-h-screen lg:ml-60">
        {/* Desktop sticky header */}
        <header className=" top-0 z-20 hidden px-6 pt-4 lg:block">
          <div className="rounded-[24px] border border-white/80 dark:border-slate-700/80 bg-white/72 dark:bg-slate-900/72 px-6 py-4 shadow-[0_20px_55px_-36px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-sky-100 to-orange-100 dark:from-sky-900/50 dark:to-orange-900/50 text-slate-900 dark:text-slate-100">
                {icons[activeItem.icon]}
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Inventory Workspace</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{pageTitle}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage products, stock movement, and reporting from one place.</p>
              </div>
              <div className="hidden items-center gap-3 xl:flex">
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
                {/* <div className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">Live workspace</div> */}
                <div className="rounded-full bg-slate-950 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-white">{userEmail}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-3 pb-3 pt-3 lg:px-6 lg:pb-6">
          <div className="mx-auto max-w-full">
            <div className="rounded-[28px] border border-white/70 dark:border-slate-700/70 bg-white/35 dark:bg-slate-900/35 p-1 shadow-[0_20px_55px_-42px_rgba(15,23,42,0.35)] backdrop-blur">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
