import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Activity, 
  ScanSearch,
  FileText, 
  MessageSquare, 
  Bell, 
  Sun, 
  Moon, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  Heart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import { useLanguage } from '../lib/LanguageContext';
import { isGeminiConfigured } from '../lib/gemini';
import { isDeepSeekConfigured } from '../lib/deepseek';
import { testConnection } from '../lib/firebase';

interface ShellProps {
  children: React.ReactNode;
}

export default function Shell({ children }: ShellProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(4);
  const [dbOk, setDbOk] = useState(true);
  const geminiOk = isGeminiConfigured();
  const deepseekOk = isDeepSeekConfigured();
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'emergency', text: 'Critical Alert: Medication protocol suggested for detected symptoms', time: '2m ago', read: false },
    { id: 2, type: 'warning', text: 'Insight: Daily vitality index dropped below 80%', time: '15m ago', read: false },
    { id: 3, type: 'info', text: 'Update: Securebytes infrastructure verified 24h integrity', time: '1h ago', read: false },
    { id: 4, type: 'system', text: 'Lifeline Health guardian successfully synced', time: '3h ago', read: false },
  ]);

  useEffect(() => {
    const checkDb = async () => {
      const ok = await testConnection();
      setDbOk(ok);
    };
    checkDb();

    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const markAsRead = (id: number) => {
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const navItems = profile?.role === 'doctor' ? [
    { name: 'Clinical Console', path: '/doctor-dashboard', icon: LayoutDashboard },
    { name: t('assistant'), path: '/assistant', icon: MessageSquare },
  ] : [
    { name: t('dashboard'), path: '/dashboard', icon: LayoutDashboard },
    { name: t('predictive'), path: '/prediction', icon: Activity },
    { name: t('image_scan'), path: '/image-scan', icon: ScanSearch },
    { name: t('assistant'), path: '/assistant', icon: MessageSquare },
    { name: t('reports'), path: '/reports', icon: FileText },
    { name: 'Access Levels', path: '/plans', icon: ShieldCheck },
  ];

  if (!user) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-natural-bg text-natural-text overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] fixed h-full bg-white border-r border-accent z-50 flex flex-col pt-6 shadow-2xl shadow-black/5 print:hidden">
        <div className="px-6 mb-10">
          <Logo />
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all group ${
                  isActive 
                    ? 'bg-primary text-white shadow-xl shadow-primary/20' 
                    : 'text-muted hover:bg-accent hover:text-natural-text'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-muted group-hover:text-natural-text'} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-accent bg-natural-bg/50">
          <div className="flex items-center gap-3 mb-6 px-1">
            <div className="w-10 h-10 rounded-2xl bg-white border border-accent shadow-sm flex items-center justify-center text-primary text-sm font-black ring-2 ring-primary/5 uppercase">
              {profile?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black truncate text-natural-text uppercase">{profile?.name || 'Authorized User'}</p>
              <p className="text-[9px] text-muted uppercase tracking-widest font-bold">{profile?.role || 'Guest User'}</p>
            </div>
          </div>
          
          <button 
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-sos hover:bg-sos/10 rounded-xl transition-colors"
          >
            <LogOut size={14} />
            {t('logout')}
          </button>

          <div className="mt-6 flex flex-col gap-1 px-2 border-t border-accent pt-4">
             <div className="flex items-center gap-2 text-[9px] text-muted font-black uppercase tracking-widest">
               <ShieldCheck size={12} className="text-secondary" />
               HIPAA Compliant
             </div>
             <p className="text-[8px] text-muted/60 italic font-medium">Predicting health. Protecting lives.</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-[220px] flex flex-col min-h-screen">
        {/* Warning Banner for missing API keys or DB connectivity */}
        {(!geminiOk || !deepseekOk || !dbOk) && (
          <div className="bg-sos text-white px-10 py-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-between shadow-lg z-50">
             <div className="flex items-center gap-3">
               <ShieldCheck size={14} />
               <span>
                 Advisory: 
                 {!geminiOk && ' [Gemini Missing]'} 
                 {!deepseekOk && ' [DeepSeek Missing]'} 
                 {!dbOk && ' [Database Connection Failed]'}
               </span>
             </div>
             <a 
               href="https://console.firebase.google.com" 
               target="_blank" 
               rel="noopener noreferrer"
               className="underline decoration-2 underline-offset-4 hover:opacity-80 transition-all"
             >
               Verify Console
             </a>
          </div>
        )}
        {/* Topbar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-accent h-20 flex items-center justify-between px-10 shadow-sm shadow-black/5 print:hidden">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-success shadow-shimmer" />
              <span className="text-[10px] font-black text-muted uppercase tracking-widest">{t('system_status')}: {t('active')}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-natural-bg p-1 rounded-xl border border-accent">
              {(['en', 'te', 'hi'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    language === lang 
                    ? 'bg-primary text-white shadow-lg' 
                    : 'text-muted hover:text-natural-text'
                  }`}
                >
                  {lang === 'en' ? 'EN' : lang === 'te' ? 'తె' : 'हि'}
                </button>
              ))}
            </div>

            <button 
              onClick={toggleTheme}
              className="p-3 bg-accent rounded-xl text-natural-text hover:bg-primary hover:text-white transition-all shadow-sm"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-3 bg-white border border-accent rounded-xl relative group shadow-sm hover:border-primary transition-all"
              >
                <Bell size={20} className="text-muted group-hover:text-primary transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-sos text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-96 bg-white border border-accent rounded-[32px] shadow-2xl p-6 z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-6">
                       <h3 className="text-xs font-black uppercase tracking-widest text-natural-text">{t('health_alerts')}</h3>
                       <span className="px-3 py-1 bg-sos/10 text-sos text-[9px] font-black rounded-full">{unreadCount} UNREAD</span>
                    </div>
                    <div className="space-y-3">
                      {notifications.map((notif) => (
                        <div 
                          key={notif.id}
                          onClick={() => markAsRead(notif.id)}
                          className={`p-5 rounded-2xl border border-accent transition-all cursor-pointer ${
                            notif.read ? 'opacity-40 bg-natural-bg/30' : 'bg-white hover:border-primary shadow-sm'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                             <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                               notif.type === 'emergency' ? 'bg-sos animate-pulse' : 
                               notif.type === 'warning' ? 'bg-warning' :
                               notif.type === 'info' ? 'bg-primary' : 'bg-muted'
                             }`} />
                             <div>
                               <p className="text-xs font-black leading-snug text-natural-text">{notif.text}</p>
                               <span className="text-[9px] text-muted uppercase mt-2 inline-block font-black tracking-widest font-mono">{notif.time}</span>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button 
                       className="w-full mt-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary hover:bg-primary/5 rounded-2xl transition-colors border-t border-accent"
                       onClick={() => setIsNotificationsOpen(false)}
                    >
                      Dismiss Console
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-10 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
