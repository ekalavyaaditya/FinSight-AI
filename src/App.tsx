import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useNotificationStore } from './store/notificationStore';

// Page components
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ImportStatement from './pages/ImportStatement';
import TransactionsList from './pages/TransactionsList';
import SavingsPlanner from './pages/SavingsPlanner';
import EMIPlanner from './pages/EMIPlanner';
import Advisory from './pages/Advisory';
import AdminPanel from './pages/AdminPanel';
import Settings from './pages/Settings';

// Floating widget
import VoiceAssistant from './components/VoiceAssistant';

// Lucide Icons
import {
  LayoutDashboard,
  Upload,
  LineChart,
  Target,
  Calculator,
  Compass,
  Settings as SettingsIcon,
  ShieldAlert,
  LogOut,
  Bell,
  Sun,
  Moon,
  Menu,
} from 'lucide-react';

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications, markAsRead } = useNotificationStore();

  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('finsight_theme') as 'light' | 'dark') || 'dark';
  });

  const [notifOpen, setNotifOpen] = React.useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('finsight_theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // refresh notifications every 20s
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Overview', icon: <LayoutDashboard className="w-4.5 h-4.5" /> },
    { to: '/import', label: 'Import Statement', icon: <Upload className="w-4.5 h-4.5" /> },
    { to: '/transactions', label: 'Ledger Registry', icon: <LineChart className="w-4.5 h-4.5" /> },
    { to: '/savings', label: 'Savings Planner', icon: <Target className="w-4.5 h-4.5" /> },
    { to: '/loans', label: 'EMI Optimizer', icon: <Calculator className="w-4.5 h-4.5" /> },
    { to: '/advisory', label: 'Advisory Matrix', icon: <Compass className="w-4.5 h-4.5" /> },
    { to: '/settings', label: 'System Settings', icon: <SettingsIcon className="w-4.5 h-4.5" /> },
  ];

  // Show administration button strictly for administrative role types
  if (user?.role === 'ADMIN') {
    navLinks.push({
      to: '/admin',
      label: 'Platform Admin',
      icon: <ShieldAlert className="w-4.5 h-4.5 text-primary" />,
    });
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#07070a] text-foreground flex transition-colors duration-300">
      {/* Sidebar Navigation */}
      <aside className="w-64 glass border-r border-border hidden md:flex flex-col justify-between p-6 shrink-0 sticky top-0 h-screen z-40">
        <div className="space-y-8">
          {/* Logo banner */}
          <Link to="/" className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            📈 FinSight AI
          </Link>

          {/* Navigation link sets */}
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-3 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-primary text-white shadow-premium'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-500 hover:text-foreground'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer profile settings container */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-extrabold flex items-center justify-center text-sm border border-primary/20 uppercase">
              {user?.fullName?.slice(0, 2) || 'AC'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{user?.fullName || 'Alex Carter'}</p>
              <p className="text-[10px] text-neutral-400 truncate uppercase tracking-wider">{user?.role || 'User'}</p>
            </div>
          </div>

          <div className="flex gap-2 justify-between">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 glass border border-border rounded-xl text-neutral-500 hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all flex-1 flex items-center justify-center"
              title="Toggle theme mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 glass border border-border rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all flex-1 flex items-center justify-center"
              title="Logout session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Upper Top notification header */}
        <header className="py-4 px-6 md:px-12 glass border-b border-border flex justify-between md:justify-end items-center gap-6 sticky top-0 z-30">
          <div className="md:hidden">
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              📈 FinSight AI
            </span>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Toggle notifications dropdown */}
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2.5 glass border border-border rounded-xl relative text-neutral-500 hover:text-foreground"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification drop menu panels */}
            {notifOpen && (
              <div className="absolute right-0 top-14 w-80 glass p-4 rounded-2xl border border-border shadow-2xl space-y-3 max-h-[360px] overflow-y-auto no-scrollbar z-50">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Smart Notifications</h4>
                  {unreadCount > 0 && <span className="text-[10px] text-primary font-bold">Unread: {unreadCount}</span>}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-4">No new alerts.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-2.5 rounded-xl text-xs hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer transition-all border ${
                        n.isRead ? 'border-transparent opacity-60' : 'border-primary/20 bg-primary/5'
                      }`}
                    >
                      <p className="font-bold">{n.title}</p>
                      <p className="text-[10px] text-neutral-400 font-light mt-0.5">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        {/* Content Section layout */}
        <main className="p-6 md:p-12 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Floating Voice assistant */}
      <VoiceAssistant />
    </div>
  );
}

// Route protector wrap
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <DashboardLayout>{children}</DashboardLayout> : <Navigate to="/login" replace />;
}

export default function App() {
  const checkSession = useAuthStore((state) => state.checkSession);

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing & Authentication routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Dashboard features routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/import" element={<ProtectedRoute><ImportStatement /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><TransactionsList /></ProtectedRoute>} />
        <Route path="/savings" element={<ProtectedRoute><SavingsPlanner /></ProtectedRoute>} />
        <Route path="/loans" element={<ProtectedRoute><EMIPlanner /></ProtectedRoute>} />
        <Route path="/advisory" element={<ProtectedRoute><Advisory /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Catch and redirect invalid configurations to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
