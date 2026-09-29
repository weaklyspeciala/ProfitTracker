import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAppStore } from './store';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Landmark,
  Receipt,
} from 'lucide-react';
import { useState, createContext, useContext } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  openMobileMenu: () => void;
}

export const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  toggleSidebar: () => {},
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: () => {},
  openMobileMenu: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: Landmark, label: 'Accounts & Cards' },
  { to: '/expenses', icon: Receipt, label: 'Expenses & Purchases' },
  { to: '/products', icon: Package, label: 'Products & Stock' },
  { to: '/sales', icon: TrendingUp, label: 'Sales' },
  { to: '/investments', icon: Wallet, label: 'Investments' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Layout() {
  const logout = useAppStore((state) => state.logout);
  const navigate = useNavigate();

  // Remember sidebar collapse state across page refreshes
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar-collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const openMobileMenu = () => {
    setIsMobileMenuOpen(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        toggleSidebar,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        openMobileMenu,
      }}
    >
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-x-hidden">
        {/* Mobile Top Header */}
        <div className="md:hidden bg-white border-b p-3.5 flex justify-between items-center z-20 sticky top-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 -ml-1 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Toggle navigation drawer"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-bold text-lg text-slate-800 tracking-tight">S&I Manager</h1>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
            Cyber Cafe & Stationery
          </span>
        </div>

        {/* Sidebar (Desktop expandable/collapsible, Mobile drawer) */}
        <aside
          className={cn(
            'bg-white border-r fixed md:sticky top-0 h-screen z-30 flex flex-col transition-[width,transform] duration-200 ease-in-out',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            isCollapsed ? 'md:w-[72px]' : 'md:w-64',
            'w-64 max-w-[80vw]'
          )}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between min-h-[64px]">
            {!isCollapsed ? (
              <>
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                    S
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-bold text-base text-slate-800 tracking-tight truncate">
                      S&I Manager
                    </h1>
                    <p className="text-[10px] text-slate-400 truncate">Stationery & Cyber</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                  title="Collapse sidebar to maximize workspace"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="w-full hidden md:flex items-center justify-center">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <PanelLeftOpen className="w-5 h-5 text-blue-600" />
                </button>
              </div>
            )}

            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg ml-auto"
              aria-label="Close drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                title={item.label}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 py-2.5 rounded-xl font-medium transition-all group relative',
                    isCollapsed ? 'md:justify-center md:px-0 px-3' : 'px-3',
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!isCollapsed ? (
                  <span className="truncate text-sm">{item.label}</span>
                ) : (
                  <span className="md:hidden truncate text-sm">{item.label}</span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer (Logout) */}
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={handleLogout}
              title="Logout"
              className={cn(
                'flex w-full items-center gap-3 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors',
                isCollapsed ? 'md:justify-center md:px-0 px-3' : 'px-3'
              )}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {!isCollapsed ? (
                <span className="truncate text-sm">Logout</span>
              ) : (
                <span className="md:hidden truncate text-sm">Logout</span>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 md:p-8">
          <div
            className={cn(
              'mx-auto transition-[max-width] duration-200 ease-in-out',
              isCollapsed ? 'max-w-[1600px]' : 'max-w-6xl'
            )}
          >
            <Outlet />
          </div>
        </main>

        {/* Mobile Backdrop Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 z-20 md:hidden backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </div>
    </SidebarContext.Provider>
  );
}
